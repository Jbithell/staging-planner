import type { Plan, Rot, Side } from "../types";
import { bbox, footprint, polysOverlap, railEnds, rot90, snap, type Pt } from "./geometry";

const NEXT_SIDE: Record<Side, Side> = { top: "right", right: "bottom", bottom: "left", left: "top" };

export function deleteIds(plan: Plan, ids: string[]): Plan {
  const s = new Set(ids);
  return { ...plan, platforms: plan.platforms.filter((p) => !s.has(p.id)), rails: plan.rails.filter((r) => !s.has(r.id)), stairs: plan.stairs.filter((x) => !s.has(x.id)) };
}

/** Rotates the selection 90° clockwise about its centre, keeping it on the grid. Returns null if it would overlap. */
export function rotateIds(plan: Plan, ids: string[], grid: number): Plan | null {
  const s = new Set(ids);
  const plats = plan.platforms.filter((p) => s.has(p.id));
  const pts: Pt[] = [
    ...plats.flatMap((p) => footprint(p).pts),
    ...plan.rails.filter((r) => s.has(r.id)).flatMap((r) => railEnds(r)),
    ...plan.stairs.filter((x) => s.has(x.id)).map((x) => [x.x, x.y] as Pt),
  ];
  if (!pts.length) return plan;
  const b = bbox(pts);
  const c: Pt = [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
  let platforms = plan.platforms.map((p) => {
    if (!s.has(p.id)) return p;
    const fp = footprint(p);
    const corner = rot90([p.x, p.y + fp.d], c); // bottom-left becomes top-left after a clockwise turn
    return { ...p, rot: ((p.rot + 90) % 360) as Rot, x: corner[0], y: corner[1] };
  });
  let rails = plan.rails.map((r) => {
    if (!s.has(r.id)) return r;
    const [p, q] = railEnds(r).map((e) => rot90(e, c));
    return { ...r, dir: r.dir === "h" ? ("v" as const) : ("h" as const), x: Math.min(p[0], q[0]), y: Math.min(p[1], q[1]) };
  });
  let stairs = plan.stairs.map((x) => {
    if (!s.has(x.id)) return x;
    const [nx, ny] = rot90([x.x, x.y], c);
    return { ...x, x: nx, y: ny, facing: NEXT_SIDE[x.facing] };
  });
  // Shift back onto the grid using the rotated group's top-left corner
  const nb = bbox([
    ...platforms.filter((p) => s.has(p.id)).flatMap((p) => footprint(p).pts),
    ...rails.filter((r) => s.has(r.id)).flatMap((r) => railEnds(r)),
    ...stairs.filter((x) => s.has(x.id)).map((x) => [x.x, x.y] as Pt),
  ]);
  const dx = snap(nb.x0, grid) - nb.x0, dy = snap(nb.y0, grid) - nb.y0;
  const r1 = (v: number) => Math.round(v * 10) / 10;
  platforms = platforms.map((p) => (s.has(p.id) ? { ...p, x: r1(p.x + dx), y: r1(p.y + dy) } : p));
  rails = rails.map((r) => (s.has(r.id) ? { ...r, x: r1(r.x + dx), y: r1(r.y + dy) } : r));
  stairs = stairs.map((x) => (s.has(x.id) ? { ...x, x: r1(x.x + dx), y: r1(x.y + dy) } : x));
  const moved = platforms.filter((p) => s.has(p.id)).map((p) => footprint(p).pts);
  const still = platforms.filter((p) => !s.has(p.id)).map((p) => footprint(p).pts);
  if (moved.some((m) => still.some((o) => polysOverlap(m, o)))) return null;
  return { ...plan, platforms, rails, stairs };
}

export function nudgeIds(plan: Plan, ids: string[], dx: number, dy: number): Plan | null {
  const s = new Set(ids);
  const platforms = plan.platforms.map((p) => (s.has(p.id) ? { ...p, x: p.x + dx, y: p.y + dy } : p));
  const moved = platforms.filter((p) => s.has(p.id)).map((p) => footprint(p).pts);
  const still = platforms.filter((p) => !s.has(p.id)).map((p) => footprint(p).pts);
  if (moved.some((m) => still.some((o) => polysOverlap(m, o)))) return null;
  return {
    ...plan, platforms,
    rails: plan.rails.map((r) => (s.has(r.id) ? { ...r, x: r.x + dx, y: r.y + dy } : r)),
    stairs: plan.stairs.map((x) => (s.has(x.id) ? { ...x, x: x.x + dx, y: x.y + dy } : x)),
  };
}
