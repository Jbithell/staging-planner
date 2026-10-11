import { Fragment } from "react";
import { ITEMS, STAIR_KINDS } from "../catalogue";
import type { Plan, Project, Venue } from "../types";
import type { Analysis, EdgeUnit } from "../lib/analysis";
import { bbox, footprint, railEnds, stairRect, type Pt } from "../lib/geometry";

const HEIGHT_COLOURS: Record<number, string> = { 9: "#adb5bd", 20: "#20c997", 30: "#fd7e14", 40: "#82c91e", 50: "#15aabf", 60: "#fcc419", 80: "#be4bdb", 100: "#e64980" };

/** Border colour of a platform by stage height, matching the hand-drawn plans (30cm orange, 60cm yellow). */
export function heightColour(h: number) {
  return HEIGHT_COLOURS[h] ?? `hsl(${(h * 37) % 360} 70% 55%)`;
}

export const RAIL_COLOUR = "#1c7ed6";

export function contentBox(plan: Plan, venue: Venue | null | undefined) {
  const pts: Pt[] = plan.platforms.flatMap((p) => footprint(p).pts);
  for (const r of plan.rails) pts.push(...railEnds(r));
  for (const s of plan.stairs) { const r = stairRect(s); pts.push([r.x, r.y], [r.x + r.w, r.y + r.h]); }
  if (!pts.length && venue?.cmPerPx) pts.push([0, 0], [venue.width * venue.cmPerPx, venue.height * venue.cmPerPx]);
  if (!pts.length) pts.push([0, 0], [1000, 600]);
  return bbox(pts);
}

/** Joins runs of neighbouring edge units with the same state into single lines for drawing. */
export function runs(units: EdgeUnit[], pick: (u: EdgeUnit) => boolean, offset = 0): [Pt, Pt][] {
  const out: [Pt, Pt][] = [];
  let cur: [Pt, Pt] | null = null, pid = "";
  for (const u of units) {
    if (!pick(u)) { cur = null; continue; }
    // Drawn just outside the edge so it isn't hidden by the platform's border
    const a: Pt = [u.a[0] + u.n[0] * offset, u.a[1] + u.n[1] * offset], b: Pt = [u.b[0] + u.n[0] * offset, u.b[1] + u.n[1] * offset];
    if (cur && pid === u.pid && Math.abs(cur[1][0] - a[0]) < 0.5 && Math.abs(cur[1][1] - a[1]) < 0.5) cur[1] = b;
    else { cur = [a, b]; pid = u.pid; out.push(cur); }
  }
  return out;
}

export interface DrawingProps {
  plan: Plan;
  project: Project;
  a: Analysis;
  /** Platform numbers for the build sheet (P1…). */
  numbers?: Record<string, number>;
  railNumbers?: Record<string, number>;
  selection?: string[];
  /** Offsets applied to items being dragged. */
  moving?: { ids: Set<string>; dx: number; dy: number; bad: boolean } | null;
  showIssues?: boolean;
  showJoins?: boolean;
  /** Handrail clamp markers; defaults to showJoins. */
  showRailJoins?: boolean;
  showVenue?: boolean;
  /** Labels: "full" (size + height), "number" (P1 + height) or none. */
  labels?: "full" | "number" | "none";
  /** Scale (px per cm), used to keep text readable. */
  scale: number;
}

/** Everything drawn in room centimetres. Used by the editor and by the build sheet. */
export function Drawing({ plan, project, a, numbers, railNumbers, selection = [], moving, showIssues = true, showJoins = false, showRailJoins, showVenue = true, labels = "full", scale }: DrawingProps) {
  const venue = project.venues.find((v) => v.id === plan.venueId);
  const sel = new Set(selection);
  const off = (id: string): Pt => (moving?.ids.has(id) ? [moving.dx, moving.dy] : [0, 0]);
  const px = (n: number) => n / scale; // n screen pixels in cm
  const font = Math.max(9, Math.min(16, 13 * scale * 2)) / scale;
  const box = contentBox(plan, null);

  // Audience marker on the audience side of the stage
  const cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2;
  const gap = px(28);
  const aud: Pt = plan.audience === "top" ? [cx, box.y0 - gap] : plan.audience === "bottom" ? [cx, box.y1 + gap] : plan.audience === "left" ? [box.x0 - gap, cy] : [box.x1 + gap, cy];
  const audRot = plan.audience === "left" ? -90 : plan.audience === "right" ? 90 : 0;
  const upPt: Pt = plan.audience === "top" ? [cx, box.y1 + gap] : plan.audience === "bottom" ? [cx, box.y0 - gap] : plan.audience === "left" ? [box.x1 + gap, cy] : [box.x0 - gap, cy];

  return (
    <g>
      {showVenue && venue?.cmPerPx && (
        <image href={venue.image} x={0} y={0} width={venue.width * venue.cmPerPx} height={venue.height * venue.cmPerPx} opacity={0.75} />
      )}

      {plan.platforms.length > 0 && (
        <>
          <g transform={`translate(${aud[0]} ${aud[1]}) rotate(${audRot})`}>
            <text textAnchor="middle" dominantBaseline="middle" fontSize={px(13)} fontWeight={700} fill="#495057" letterSpacing={px(3)}>AUDIENCE</text>
          </g>
          <g transform={`translate(${upPt[0]} ${upPt[1]}) rotate(${audRot})`}>
            <text textAnchor="middle" dominantBaseline="middle" fontSize={px(11)} fill="#868e96" letterSpacing={px(2)}>UPSTAGE</text>
          </g>
        </>
      )}

      {/* Stairs */}
      {plan.stairs.map((s) => {
        const r = stairRect(s);
        const [dx, dy] = off(s.id);
        const k = STAIR_KINDS[s.kind];
        const steps = Math.max(1, k ? k.items.length + (k.id.startsWith("ix") ? (k.id === "ix-1" ? 0 : 1) : Math.round(k.d / 30) - 1) : 2);
        const horiz = s.facing === "top" || s.facing === "bottom";
        return (
          <g key={s.id} transform={`translate(${dx} ${dy})`} data-sid={s.id} style={{ cursor: "pointer" }}>
            <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="#868e96" stroke={sel.has(s.id) ? "#d6336c" : "#343a40"} strokeWidth={sel.has(s.id) ? 3 : 1.5} vectorEffect="non-scaling-stroke" />
            {Array.from({ length: steps - 1 }, (_, i) => {
              const t = (i + 1) / steps;
              return horiz
                ? <line key={i} x1={r.x} x2={r.x + r.w} y1={r.y + r.h * t} y2={r.y + r.h * t} stroke="#343a40" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                : <line key={i} y1={r.y} y2={r.y + r.h} x1={r.x + r.w * t} x2={r.x + r.w * t} stroke="#343a40" strokeWidth={1} vectorEffect="non-scaling-stroke" />;
            })}
            {s.handrails > 0 && [0, 1].slice(0, s.handrails).map((i) => horiz
              ? <line key={`h${i}`} x1={i ? r.x + r.w : r.x} x2={i ? r.x + r.w : r.x} y1={r.y} y2={r.y + r.h} stroke={RAIL_COLOUR} strokeWidth={4} vectorEffect="non-scaling-stroke" />
              : <line key={`h${i}`} y1={i ? r.y + r.h : r.y} y2={i ? r.y + r.h : r.y} x1={r.x} x2={r.x + r.w} stroke={RAIL_COLOUR} strokeWidth={4} vectorEffect="non-scaling-stroke" />)}
          </g>
        );
      })}

      {/* Platforms */}
      {plan.platforms.map((p) => {
        const fp = footprint(p);
        const [dx, dy] = off(p.id);
        const h = a.heights[p.id];
        const selected = sel.has(p.id);
        const c: Pt = [fp.legs.reduce((s, q) => s + q[0], 0) / fp.legs.length, fp.legs.reduce((s, q) => s + q[1], 0) / fp.legs.length];
        const bb = bbox(fp.pts);
        const centre: Pt = ITEMS[p.item]?.shape === "rect" ? [(bb.x0 + bb.x1) / 2, (bb.y0 + bb.y1) / 2] : c;
        const vertical = fp.d > fp.w;
        const bad = moving?.bad && moving.ids.has(p.id);
        return (
          <g key={p.id} transform={`translate(${dx} ${dy})`} data-pid={p.id} style={{ cursor: "move" }}>
            <polygon points={fp.pts.map((q) => q.join(",")).join(" ")} fill={bad ? "#c92a2a" : "#212529"} stroke={heightColour(h)} strokeWidth={3} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
            {selected && <polygon points={fp.pts.map((q) => q.join(",")).join(" ")} fill="rgba(214,51,108,0.22)" stroke="#d6336c" strokeWidth={3} strokeDasharray="6 3" vectorEffect="non-scaling-stroke" pointerEvents="none" />}
            {labels !== "none" && (
              <g transform={`translate(${centre[0]} ${centre[1]}) rotate(${vertical ? -90 : 0})`} pointerEvents="none">
                <text textAnchor="middle" y={-font * 0.15} fontSize={font * 1.25} fontWeight={700} fill="#fff">
                  {labels === "number" && numbers ? `P${numbers[p.id]}` : ITEMS[p.item]?.short ?? "?"}
                </text>
                <text textAnchor="middle" y={font * 1.05} fontSize={font * 0.95} fill={heightColour(h)}>
                  {labels === "number" ? `${ITEMS[p.item]?.short} · ${h}cm` : `${h}cm`}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Open edges that need (red) or might want (amber) handrails */}
      {showIssues && !moving && (
        <g pointerEvents="none">
          {runs(a.units, (u) => u.need === "required" && !u.railed, px(4)).map(([p, q], i) => (
            <line key={`r${i}`} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke="#fa5252" strokeWidth={5} strokeDasharray="8 5" vectorEffect="non-scaling-stroke" />
          ))}
          {runs(a.units, (u) => u.need === "warn" && !u.railed, px(4)).map(([p, q], i) => (
            <line key={`w${i}`} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke="#f59f00" strokeWidth={4} strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
          ))}
        </g>
      )}

      {/* Joins: assembly clamps on level joints and leg clamps where corners meet */}
      {showJoins && (
        <g pointerEvents="none">
          {a.joints.flatMap((j, ji) => j.segs.map(([p, q], si) => {
            const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
            const n = Math.max(1, Math.ceil(len / 100 - 0.05));
            return (
              <Fragment key={`${ji}-${si}`}>
                <line x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke="#40c057" strokeWidth={2} vectorEffect="non-scaling-stroke" />
                {Array.from({ length: n }, (_, k) => {
                  const t = (k + 0.5) / n;
                  const x = p[0] + (q[0] - p[0]) * t, y = p[1] + (q[1] - p[1]) * t;
                  return <rect key={k} x={x - px(5)} y={y - px(5)} width={px(10)} height={px(10)} fill="#40c057" stroke="#fff" strokeWidth={1} vectorEffect="non-scaling-stroke" />;
                })}
              </Fragment>
            );
          }))}
          {a.legs.map((c, i) => {
            const r = px(c.pids.length >= 2 && c.level ? 6 : 3.5);
            const fill = !c.level || c.pids.length < 2 ? "#ced4da" : c.pids.length >= 4 ? "#e64980" : "#7950f2";
            return <circle key={i} cx={c.at[0]} cy={c.at[1]} r={r} fill={fill} stroke="#212529" strokeWidth={1} vectorEffect="non-scaling-stroke" />;
          })}
        </g>
      )}

      {/* Handrails */}
      {plan.rails.map((r) => {
        const [p, q] = railEnds(r);
        const [dx, dy] = off(r.id);
        const selected = sel.has(r.id);
        const mid: Pt = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
        return (
          <g key={r.id} transform={`translate(${dx} ${dy})`} data-rid={r.id} style={{ cursor: "pointer" }}>
            <line x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke="transparent" strokeWidth={14} vectorEffect="non-scaling-stroke" />
            <line x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={selected ? "#d6336c" : RAIL_COLOUR} strokeWidth={selected ? 7 : 5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            <circle cx={p[0] + (q[0] - p[0]) * 0.066} cy={p[1] + (q[1] - p[1]) * 0.066} r={px(3.5)} fill="#fff" stroke={RAIL_COLOUR} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
            <circle cx={q[0] - (q[0] - p[0]) * 0.066} cy={q[1] - (q[1] - p[1]) * 0.066} r={px(3.5)} fill="#fff" stroke={RAIL_COLOUR} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
            {railNumbers && (() => {
              // Label on the outside of the stage
              const outX = mid[0] < cx ? -1 : 1, outY = mid[1] < cy ? -1 : 1;
              const tx = r.dir === "v" ? mid[0] + outX * px(8) : mid[0], ty = r.dir === "h" ? mid[1] + outY * px(12) : mid[1];
              return (
                <text x={tx} y={ty} textAnchor={r.dir === "v" ? (outX < 0 ? "end" : "start") : "middle"} dominantBaseline="middle" fontSize={px(11)} fontWeight={700} fill={RAIL_COLOUR}>
                  R{railNumbers[r.id]} · {ITEMS[r.item]?.w === 100 ? "1m" : "2m"}
                </text>
              );
            })()}
          </g>
        );
      })}
      {(showRailJoins ?? showJoins) && a.railJoins.map((p, i) => (
        <rect key={`j${i}`} x={p[0] - px(5)} y={p[1] - px(5)} width={px(10)} height={px(10)} transform={`rotate(45 ${p[0]} ${p[1]})`} fill="#fff" stroke={RAIL_COLOUR} strokeWidth={2} vectorEffect="non-scaling-stroke" pointerEvents="none" />
      ))}
    </g>
  );
}
