import { FLOOR, ITEMS, PLATFORM_THICKNESS, ROLLRISER_HEIGHT, STAIR_KINDS } from "../catalogue";
import type { Platform, Rail, Rot, Side, Stair } from "../types";

export type Pt = [number, number];

const ARC_STEPS = 12;

/** Footprint polygon in the platform's own frame (clockwise on screen), with the indices of its leg corners. */
function baseShape(no: string): { pts: Pt[]; legs: Pt[] } {
  const it = ITEMS[no];
  const w = it?.w ?? 100, d = it?.d ?? 100;
  switch (it?.shape) {
    case "tri-l": return { pts: [[0, 0], [w, 0], [0, d]], legs: [[0, 0], [w, 0], [0, d]] };
    case "tri-r": return { pts: [[0, 0], [w, 0], [w, d]], legs: [[0, 0], [w, 0], [w, d]] };
    case "quarter": {
      const pts: Pt[] = [[0, 0]];
      for (let i = 0; i <= ARC_STEPS; i++) {
        const t = (i / ARC_STEPS) * (Math.PI / 2);
        pts.push([w * Math.cos(t), d * Math.sin(t)]);
      }
      return { pts, legs: [[0, 0], [w, 0], [0, d]] };
    }
    default: return { pts: [[0, 0], [w, 0], [w, d], [0, d]], legs: [[0, 0], [w, 0], [w, d], [0, d]] };
  }
}

function rotPt([x, y]: Pt, rot: Rot): Pt {
  switch (rot) {
    case 90: return [-y, x];
    case 180: return [-x, -y];
    case 270: return [y, -x];
    default: return [x, y];
  }
}

const r1 = (v: number) => Math.round(v * 10) / 10;

/** Footprint polygon and leg positions in room coordinates. */
export function footprint(p: Pick<Platform, "item" | "x" | "y" | "rot">): { pts: Pt[]; legs: Pt[]; w: number; d: number } {
  const { pts, legs } = baseShape(p.item);
  const rp = pts.map((q) => rotPt(q, p.rot));
  const rl = legs.map((q) => rotPt(q, p.rot));
  const minX = Math.min(...rp.map((q) => q[0])), minY = Math.min(...rp.map((q) => q[1]));
  const maxX = Math.max(...rp.map((q) => q[0])), maxY = Math.max(...rp.map((q) => q[1]));
  const t = (q: Pt): Pt => [r1(q[0] - minX + p.x), r1(q[1] - minY + p.y)];
  return { pts: rp.map(t), legs: rl.map(t), w: r1(maxX - minX), d: r1(maxY - minY) };
}

export function stageHeight(p: Platform): number {
  const s = p.support;
  if (s.item === FLOOR) return PLATFORM_THICKNESS;
  const it = ITEMS[s.item];
  const h = it?.minHeight != null ? Math.min(it.maxHeight!, Math.max(it.minHeight, s.height ?? it.minHeight)) : (it?.height ?? 30);
  return h + (s.rollriser ? ROLLRISER_HEIGHT : 0);
}

export function legCount(p: Platform) {
  return p.support.item === FLOOR ? 0 : baseShape(p.item).legs.length;
}

export function pointInPoly([x, y]: Pt, pts: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Separating-axis test for convex polygons; touching edges don't count as overlapping. */
export function polysOverlap(a: Pt[], b: Pt[], tol = 0.5): boolean {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length];
      const nx = y1 - y2, ny = x2 - x1;
      const len = Math.hypot(nx, ny);
      if (len < 1e-9) continue;
      let aMin = Infinity, aMax = -Infinity, bMin = Infinity, bMax = -Infinity;
      for (const [x, y] of a) { const v = (x * nx + y * ny) / len; aMin = Math.min(aMin, v); aMax = Math.max(aMax, v); }
      for (const [x, y] of b) { const v = (x * nx + y * ny) / len; bMin = Math.min(bMin, v); bMax = Math.max(bMax, v); }
      if (aMax - tol <= bMin || bMax - tol <= aMin) return false;
    }
  }
  return true;
}

export function bbox(pts: Pt[]) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1 };
}

/** Unit vector pointing out of the stage towards a side of the drawing. */
export const SIDE_VEC: Record<Side, Pt> = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] };
export const OPPOSITE: Record<Side, Side> = { top: "bottom", bottom: "top", left: "right", right: "left" };

export function railLength(r: Rail) {
  return ITEMS[r.item]?.w ?? 200;
}

export function railEnds(r: Rail): [Pt, Pt] {
  const l = railLength(r);
  return [[r.x, r.y], r.dir === "h" ? [r.x + l, r.y] : [r.x, r.y + l]];
}

/** Stair footprint: a rectangle off the stage edge. */
export function stairRect(s: Stair) {
  const k = STAIR_KINDS[s.kind];
  const w = k?.w ?? 99, d = k?.d ?? 70;
  switch (s.facing) {
    case "top": return { x: s.x - w / 2, y: s.y - d, w, h: d };
    case "bottom": return { x: s.x - w / 2, y: s.y, w, h: d };
    case "left": return { x: s.x - d, y: s.y - w / 2, w: d, h: w };
    case "right": return { x: s.x, y: s.y - w / 2, w: d, h: w };
  }
}

export function rectPts(r: { x: number; y: number; w: number; h: number }): Pt[] {
  return [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]];
}

export const snap = (v: number, step: number) => Math.round(v / step) * step;

/** Rotates a point 90° clockwise (on screen) around a centre. */
export function rot90([x, y]: Pt, [cx, cy]: Pt): Pt {
  return [cx - (y - cy), cy + (x - cx)];
}
