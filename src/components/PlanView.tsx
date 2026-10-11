import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ActionIcon, Box, Group, Paper, Text, Tooltip } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconFocus2, IconZoomIn, IconZoomOut } from "@tabler/icons-react";
import { ITEMS, STAIR_KINDS, STAIRS } from "../catalogue";
import type { Plan, Platform, Project, Rail, Side, Stair } from "../types";
import type { Analysis, EdgeUnit } from "../lib/analysis";
import { bbox, footprint, polysOverlap, railEnds, railLength, rectPts, snap, stairRect, type Pt } from "../lib/geometry";
import { remaining } from "../lib/bom";
import { uid } from "../lib/util";
import { select, updatePlan, useStore } from "../store";
import { Drawing, RAIL_COLOUR, contentBox } from "./Drawing";
import { log } from "../log";

export const DRAG_MIME = "application/x-tour-stage-item";

interface ViewT { s: number; tx: number; ty: number }
type Drag =
  | { kind: "move"; ids: Set<string>; start: Pt; moved: boolean; base: Platform[]; grid: number; additive: string | null }
  | { kind: "pan"; start: Pt; view: ViewT; moved: boolean }
  | { kind: "box"; start: Pt; cur: Pt };

const sideOf = (n: Pt): Side => (Math.abs(n[0]) > Math.abs(n[1]) ? (n[0] > 0 ? "right" : "left") : n[1] > 0 ? "bottom" : "top");

/** Platforms that a rail or stair is fixed to, so they move with them. */
export function railOwners(r: Rail, a: Analysis): Set<string> {
  const owners = new Set<string>();
  const [p] = railEnds(r);
  const l = railLength(r);
  for (const u of a.units) {
    if (u.axis !== r.dir) continue;
    const on = r.dir === "h" ? Math.abs(u.mid[1] - p[1]) < 1 && u.mid[0] > p[0] && u.mid[0] < p[0] + l : Math.abs(u.mid[0] - p[0]) < 1 && u.mid[1] > p[1] && u.mid[1] < p[1] + l;
    if (on) owners.add(u.pid);
  }
  return owners;
}

/** Contiguous open, unrailed run of edge along the same line as `u`, as [start, end] along its axis. */
function openRun(u: EdgeUnit, a: Analysis, allowRailed = false): [number, number] {
  const ax = u.axis === "h" ? 0 : 1, fixed = u.axis === "h" ? 1 : 0;
  const same = a.units
    .filter((v) => v.axis === u.axis && Math.abs(v.mid[fixed] - u.mid[fixed]) < 1 && v.n[0] === u.n[0] && v.n[1] === u.n[1] && v.drop > 0 && !v.stair && (allowRailed || !v.railed))
    .map((v) => [Math.min(v.a[ax], v.b[ax]), Math.max(v.a[ax], v.b[ax])] as [number, number])
    .sort((p, q) => p[0] - q[0]);
  let lo = Math.min(u.a[ax], u.b[ax]), hi = Math.max(u.a[ax], u.b[ax]);
  for (let changed = true; changed;) {
    changed = false;
    for (const [s, e] of same) {
      if (s <= hi + 0.5 && e > hi) { hi = e; changed = true; }
      if (e >= lo - 0.5 && s < lo) { lo = s; changed = true; }
    }
  }
  return [lo, hi];
}

function nearestOpenUnit(a: Analysis, p: Pt, maxDist: number) {
  let best: EdgeUnit | null = null, bd = maxDist;
  for (const u of a.units) {
    if (!u.axis || u.drop <= 0 || u.railed || u.stair) continue;
    const d = Math.hypot(u.mid[0] - p[0], u.mid[1] - p[1]);
    if (d < bd) { bd = d; best = u; }
  }
  return best;
}

/** Where the chosen handrail would go on the open edge nearest `p`; "too-long" when that edge is shorter than it. */
export function railCandidate(a: Analysis, p: Pt, scale: number, item: string): Rail | "too-long" | null {
  const u = nearestOpenUnit(a, p, Math.max(15, 24 / scale));
  if (!u) return null;
  const [lo, hi] = openRun(u, a);
  const ax = u.axis === "h" ? 0 : 1;
  const L = ITEMS[item]?.w ?? 200;
  if (hi - lo < L - 0.5) return "too-long";
  const start = Math.min(hi - L, Math.max(lo, snap(p[ax] - L / 2, 50)));
  return u.axis === "h" ? { id: uid(), item, x: start, y: u.mid[1], dir: "h" } : { id: uid(), item, x: u.mid[0], y: start, dir: "v" };
}

/** Picks a stair for the stage height: the chosen kind, or (auto) one that fits, preferring stairs that are owned. */
export function stairFor(project: Project, kind: string, h: number) {
  if (kind !== "auto") return STAIR_KINDS[kind];
  const fits = STAIRS.filter((s) => h >= s.minHeight && h <= s.maxHeight);
  return fits.find((s) => s.items.every((no) => (project.inventory[no] ?? 0) > 0)) ?? fits[0] ?? STAIRS[0];
}

function stairCandidate(project: Project, a: Analysis, p: Pt, scale: number, kind: string): Stair | null {
  const u = nearestOpenUnit(a, p, Math.max(15, 24 / scale));
  if (!u) return null;
  const k = stairFor(project, kind, a.heights[u.pid]);
  const [lo, hi] = openRun(u, a, true);
  const ax = u.axis === "h" ? 0 : 1;
  if (hi - lo < k.w - 0.5) return null;
  const c = Math.min(hi - k.w / 2, Math.max(lo + k.w / 2, snap(p[ax], 10)));
  return { id: uid(), kind: k.id, facing: sideOf(u.n), handrails: 0, x: ax === 0 ? c : u.mid[0], y: ax === 0 ? u.mid[1] : c };
}

/** Centre of what the editor currently shows, in room cm, so new platforms appear in view. */
export const viewState: { centre: Pt | null } = { centre: null };

/** Finds the free spot nearest the middle of the view for a new platform. */
export function freeSpot(plan: Plan, item: string, grid: number): Pt {
  const it = ITEMS[item];
  const w = it?.w ?? 100, d = it?.d ?? 100;
  const c = viewState.centre ?? (plan.platforms.length ? (() => { const b = bbox(plan.platforms.flatMap((p) => footprint(p).pts)); return [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2] as Pt; })() : [w / 2, d / 2]);
  const step = Math.max(grid, 50);
  const x0 = snap(c[0] - w / 2, grid), y0 = snap(c[1] - d / 2, grid);
  const polys = plan.platforms.map((p) => footprint(p).pts);
  const free = (x: number, y: number) => !polys.some((q) => polysOverlap(footprint({ item, x, y, rot: 0 }).pts, q));
  for (let r = 0; r < 60; r++)
    for (let i = -r; i <= r; i++)
      for (const [dx, dy] of [[i, -r], [i, r], [-r, i], [r, i]])
        if (free(x0 + dx * step, y0 + dy * step)) return [x0 + dx * step, y0 + dy * step];
  return [x0, y0];
}

export function PlanView({ project, plan, a }: { project: Project; plan: Plan; a: Analysis }) {
  const { ref, width, height } = useElementSize();
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<ViewT>({ s: 0.5, tx: 40, ty: 40 });
  const [drag, setDrag] = useState<Drag | null>(null);
  const [moveOffset, setMoveOffset] = useState<{ dx: number; dy: number; bad: boolean } | null>(null);
  const [hover, setHover] = useState<Pt | null>(null);
  const tool = useStore((s) => s.tool);
  const stairKind = useStore((s) => s.stairKind);
  const railItem = useStore((s) => s.railItem);
  const selection = useStore((s) => s.selection);
  const venue = project.venues.find((v) => v.id === plan.venueId);
  const fitted = useRef("");

  const fit = () => {
    if (!width || !height) return;
    const b = contentBox(plan, venue);
    const pad = 80;
    const s = Math.min((width - pad * 2) / Math.max(100, b.x1 - b.x0), (height - pad * 2) / Math.max(100, b.y1 - b.y0));
    setView({ s, tx: (width - (b.x1 - b.x0) * s) / 2 - b.x0 * s, ty: (height - (b.y1 - b.y0) * s) / 2 - b.y0 * s });
  };
  useLayoutEffect(() => {
    const k = `${plan.id}|${venue?.id}|${venue?.cmPerPx}`;
    if (width && height && fitted.current !== k) { fitted.current = k; fit(); }
  }, [plan.id, venue?.id, venue?.cmPerPx, width, height]);

  useEffect(() => {
    if (width && height) viewState.centre = [(width / 2 - view.tx) / view.s, (height / 2 - view.ty) / view.s];
  }, [view, width, height]);

  const toRoom = (cx: number, cy: number): Pt => {
    const r = svgRef.current!.getBoundingClientRect();
    return [(cx - r.left - view.tx) / view.s, (cy - r.top - view.ty) / view.s];
  };

  const zoomAt = (factor: number, sx = width / 2, sy = height / 2) =>
    setView((v) => {
      const s = Math.min(8, Math.max(0.05, v.s * factor));
      return { s, tx: sx - ((sx - v.tx) * s) / v.s, ty: sy - ((sy - v.ty) * s) / v.s };
    });

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [width, height]);

  const railHit = useMemo(() => (tool === "rail" && hover && !drag ? railCandidate(a, hover, view.s, railItem) : null), [tool, hover, drag, a, view.s, railItem]);
  const railPreview = railHit && railHit !== "too-long" ? railHit : null;
  const stairPreview = useMemo(() => (tool === "stair" && hover && !drag ? stairCandidate(project, a, hover, view.s, stairKind) : null), [tool, hover, drag, project, a, view.s, stairKind]);

  /** Everything that moves when the selection is dragged: selected items plus rails and stairs fixed to selected platforms. */
  const movingSet = (ids: string[]) => {
    const set = new Set(ids);
    const pids = new Set(plan.platforms.filter((p) => set.has(p.id)).map((p) => p.id));
    if (pids.size) {
      for (const r of plan.rails) { const o = railOwners(r, a); if (o.size && [...o].every((id) => pids.has(id))) set.add(r.id); }
      for (const s of plan.stairs) { const h = a.stairHost[s.id]; if (h && pids.has(h)) set.add(s.id); }
    }
    return set;
  };

  const overlapsAfter = (ids: Set<string>, dx: number, dy: number) => {
    const moved = plan.platforms.filter((p) => ids.has(p.id)).map((p) => footprint({ ...p, x: p.x + dx, y: p.y + dy }).pts);
    const still = plan.platforms.filter((p) => !ids.has(p.id)).map((p) => footprint(p).pts);
    return moved.some((m) => still.some((s) => polysOverlap(m, s)));
  };

  /** Grid snap for the dragged group, then a nudge onto nearby edges of platforms that aren't moving. */
  const snapDelta = (d: Extract<Drag, { kind: "move" }>, dx: number, dy: number): [number, number] => {
    const lead = d.base[0];
    if (!lead) return [snap(dx, d.grid), snap(dy, d.grid)];
    let sdx = snap(lead.x + dx, d.grid) - lead.x, sdy = snap(lead.y + dy, d.grid) - lead.y;
    const tol = 12 / view.s;
    const mb = bbox(d.base.flatMap((p) => footprint(p).pts));
    const others = plan.platforms.filter((p) => !d.ids.has(p.id)).map((p) => bbox(footprint(p).pts));
    let bx = tol, by = tol, ax = 0, ay = 0;
    for (const o of others) {
      for (const m of [mb.x0 + dx, mb.x1 + dx]) for (const e of [o.x0, o.x1]) if (Math.abs(e - m) < bx) { bx = Math.abs(e - m); ax = e - m + dx; }
      for (const m of [mb.y0 + dy, mb.y1 + dy]) for (const e of [o.y0, o.y1]) if (Math.abs(e - m) < by) { by = Math.abs(e - m); ay = e - m + dy; }
    }
    if (bx < tol) sdx = Math.round(ax);
    if (by < tol) sdy = Math.round(ay);
    return [sdx, sdy];
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const target = e.target as Element;
    const pid = target.closest("[data-pid]")?.getAttribute("data-pid");
    const rid = target.closest("[data-rid]")?.getAttribute("data-rid");
    const sid = target.closest("[data-sid]")?.getAttribute("data-sid");
    const p = toRoom(e.clientX, e.clientY);
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    if (e.button === 1 || e.altKey) { setDrag({ kind: "pan", start: [e.clientX, e.clientY], view, moved: false }); return; }
    if (e.button !== 0) return;

    if (tool === "rail") {
      if (rid) { updatePlan((pl) => ({ ...pl, rails: pl.rails.filter((r) => r.id !== rid) })); return; }
      const c = railCandidate(a, p, view.s, railItem);
      if (c === "too-long") { notifications.show({ color: "orange", message: `A ${ITEMS[railItem]?.short} handrail is too long for that edge. Pick a shorter one on the left.` }); return; }
      if (c) { if (updatePlan((pl) => ({ ...pl, rails: [...pl.rails, c] }))) log("plan", "rail added", ITEMS[c.item].short); return; }
    } else if (tool === "stair") {
      if (sid) { updatePlan((pl) => ({ ...pl, stairs: pl.stairs.filter((s) => s.id !== sid) })); return; }
      const c = stairCandidate(project, a, p, view.s, stairKind);
      if (c) { updatePlan((pl) => ({ ...pl, stairs: [...pl.stairs, c] })); select([c.id]); return; }
    } else {
      const id = pid ?? rid ?? sid;
      if (id) {
        let ids = selection;
        if (e.shiftKey) ids = selection.includes(id) ? selection.filter((x) => x !== id) : [...selection, id];
        else if (!selection.includes(id)) ids = [id];
        select(ids);
        const moving = movingSet(ids);
        if (!moving.has(id)) return;
        const base = plan.platforms.filter((q) => moving.has(q.id));
        setDrag({ kind: "move", ids: moving, start: p, moved: false, base, grid: base.length || plan.rails.some((r) => moving.has(r.id)) ? project.gridCm : 10, additive: e.shiftKey ? id : null });
        return;
      }
      if (e.shiftKey) { setDrag({ kind: "box", start: p, cur: p }); return; }
    }
    setDrag({ kind: "pan", start: [e.clientX, e.clientY], view, moved: false });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const p = toRoom(e.clientX, e.clientY);
    setHover(p);
    if (!drag) return;
    if (drag.kind === "pan") {
      const dx = e.clientX - drag.start[0], dy = e.clientY - drag.start[1];
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      setView({ ...drag.view, tx: drag.view.tx + dx, ty: drag.view.ty + dy });
    } else if (drag.kind === "box") {
      setDrag({ ...drag, cur: p });
    } else {
      const [dx, dy] = snapDelta(drag, p[0] - drag.start[0], p[1] - drag.start[1]);
      if (dx || dy) drag.moved = true;
      setMoveOffset({ dx, dy, bad: overlapsAfter(drag.ids, dx, dy) });
    }
  };

  const onPointerUp = () => {
    const d = drag;
    setDrag(null);
    if (!d) return;
    if (d.kind === "pan") { if (!d.moved && tool === "select") select([]); return; }
    if (d.kind === "box") {
      const x0 = Math.min(d.start[0], d.cur[0]), x1 = Math.max(d.start[0], d.cur[0]), y0 = Math.min(d.start[1], d.cur[1]), y1 = Math.max(d.start[1], d.cur[1]);
      const inBox = (pts: Pt[]) => pts.every(([x, y]) => x >= x0 && x <= x1 && y >= y0 && y <= y1);
      const ids = [
        ...plan.platforms.filter((q) => inBox(footprint(q).pts)).map((q) => q.id),
        ...plan.rails.filter((r) => inBox(railEnds(r))).map((r) => r.id),
        ...plan.stairs.filter((s) => inBox(rectPts(stairRect(s)))).map((s) => s.id),
      ];
      select([...new Set([...selection, ...ids])]);
      return;
    }
    const off = moveOffset;
    setMoveOffset(null);
    if (!d.moved || !off || (!off.dx && !off.dy)) return;
    if (off.bad) { notifications.show({ color: "red", message: "Platforms can't overlap — moved back." }); return; }
    const { dx, dy } = off;
    updatePlan((pl) => ({
      ...pl,
      platforms: pl.platforms.map((q) => (d.ids.has(q.id) ? { ...q, x: q.x + dx, y: q.y + dy } : q)),
      rails: pl.rails.map((r) => (d.ids.has(r.id) ? { ...r, x: r.x + dx, y: r.y + dy } : r)),
      stairs: pl.stairs.map((s) => (d.ids.has(s.id) ? { ...s, x: s.x + dx, y: s.y + dy } : s)),
    }));
  };

  const onDrop = (e: React.DragEvent) => {
    const no = e.dataTransfer.getData(DRAG_MIME);
    if (!no || !ITEMS[no]) return;
    e.preventDefault();
    const [x, y] = toRoom(e.clientX, e.clientY);
    const it = ITEMS[no];
    const g = project.gridCm;
    const p: Platform = { id: uid(), item: no, x: snap(x - it.w! / 2, g), y: snap(y - it.d! / 2, g), rot: 0, support: { item: defaultSupport(project, plan, a) } };
    if (plan.platforms.some((q) => polysOverlap(footprint(p).pts, footprint(q).pts))) {
      notifications.show({ color: "red", message: "There's already a platform there." });
      return;
    }
    if (updatePlan((pl) => ({ ...pl, platforms: [...pl.platforms, p] }))) select([p.id]);
  };

  const box = drag?.kind === "box" ? drag : null;
  const moving = drag?.kind === "move" && moveOffset ? { ids: drag.ids, ...moveOffset } : null;
  const cursor = drag?.kind === "pan" && drag.moved ? "grabbing" : tool === "select" ? "default" : "crosshair";
  const g = project.gridCm;

  return (
    <Box ref={ref} pos="relative" style={{ flex: 1, minHeight: 0, overflow: "hidden", background: "#f8f9fa" }} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
      <svg ref={svgRef} width={width} height={height} style={{ display: "block", cursor, touchAction: "none", userSelect: "none" }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={() => setHover(null)}>
        <defs>
          <pattern id="grid" width={g} height={g} patternUnits="userSpaceOnUse">
            <path d={`M ${g} 0 L 0 0 0 ${g}`} fill="none" stroke="#dee2e6" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          </pattern>
          <pattern id="grid-m" width={100} height={100} patternUnits="userSpaceOnUse">
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#ced4da" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          </pattern>
        </defs>
        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.s})`}>
          {!venue?.cmPerPx && (
            <>
              <rect x={-5000} y={-5000} width={15000} height={15000} fill="url(#grid)" pointerEvents="none" />
              {g < 100 && <rect x={-5000} y={-5000} width={15000} height={15000} fill="url(#grid-m)" pointerEvents="none" />}
            </>
          )}
          <Drawing plan={plan} project={project} a={a} selection={selection} moving={moving} scale={view.s} showJoins={false} />
          {railPreview && (() => {
            const [p, q] = railEnds(railPreview);
            return <line x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={RAIL_COLOUR} strokeOpacity={0.55} strokeWidth={8} strokeLinecap="round" vectorEffect="non-scaling-stroke" pointerEvents="none" />;
          })()}
          {stairPreview && (() => {
            const r = stairRect(stairPreview);
            return <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="#868e96" fillOpacity={0.5} stroke="#343a40" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" pointerEvents="none" />;
          })()}
          {box && (
            <rect x={Math.min(box.start[0], box.cur[0])} y={Math.min(box.start[1], box.cur[1])} width={Math.abs(box.cur[0] - box.start[0])} height={Math.abs(box.cur[1] - box.start[1])}
              fill="rgba(51,154,240,0.1)" stroke="#339af0" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" pointerEvents="none" />
          )}
        </g>
      </svg>
      <Paper pos="absolute" bottom={12} right={12} shadow="xs" p={4} withBorder className="no-print">
        <Group gap={4}>
          <Tooltip label="Zoom out"><ActionIcon variant="subtle" color="gray" onClick={() => zoomAt(1 / 1.25)}><IconZoomOut size={18} /></ActionIcon></Tooltip>
          <Text size="xs" w={44} ta="center" c="dimmed">{Math.round(view.s * 100)}%</Text>
          <Tooltip label="Zoom in"><ActionIcon variant="subtle" color="gray" onClick={() => zoomAt(1.25)}><IconZoomIn size={18} /></ActionIcon></Tooltip>
          <Tooltip label="Fit to plan (0)"><ActionIcon variant="subtle" color="gray" onClick={fit}><IconFocus2 size={18} /></ActionIcon></Tooltip>
        </Group>
      </Paper>
      {hover && (
        <Text pos="absolute" bottom={16} left={12} size="xs" c="dimmed" className="no-print">
          {(hover[0] / 100).toFixed(2)} m, {(hover[1] / 100).toFixed(2)} m
          {tool === "rail" && (railHit === "too-long" ? ` · a ${ITEMS[railItem]?.short} handrail is too long for this edge` : ` · click an open edge to add a ${ITEMS[railItem]?.short} handrail, click a handrail to remove it`)}
          {tool === "stair" && " · click an open edge to add stairs, click stairs to remove them"}
        </Text>
      )}
      <FitOnKey onFit={fit} />
    </Box>
  );
}

function FitOnKey({ onFit }: { onFit: () => void }) {
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input, textarea, [contenteditable]")) return;
      if (e.key === "0" && !e.ctrlKey && !e.metaKey) onFit();
    };
    window.addEventListener("keydown", kd);
    return () => window.removeEventListener("keydown", kd);
  });
  return null;
}

/** Support for a new platform: whatever the last platform used, if there are legs to spare, else the first leg set in stock. */
export function defaultSupport(project: Project, plan: Plan, a: Analysis) {
  const last = plan.platforms[plan.platforms.length - 1]?.support.item;
  const ok = (no: string) => project.allowOverInventory || remaining(project, plan, a, no) >= 4;
  if (last && last !== "floor" && ok(last)) return last;
  const owned = Object.keys(project.inventory).filter((no) => ITEMS[no]?.group === "support" && ITEMS[no].height != null && !ITEMS[no].wheel && ok(no));
  return owned[0] ?? (project.allowOverInventory ? "458589" : "floor");
}
