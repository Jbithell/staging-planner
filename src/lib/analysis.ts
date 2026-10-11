import { ITEMS, STAIR_KINDS } from "../catalogue";
import type { Plan, Platform } from "../types";
import { OPPOSITE, SIDE_VEC, footprint, pointInPoly, polysOverlap, railEnds, railLength, rectPts, stageHeight, stairRect, type Pt } from "./geometry";

export type Facing = "downstage" | "upstage" | "side";

/** A ~10cm piece of a platform's outline, used to work out drops, rails and joints. */
export interface EdgeUnit {
  pid: string;
  a: Pt;
  b: Pt;
  mid: Pt;
  len: number;
  /** Outward normal. */
  n: Pt;
  axis: "h" | "v" | null;
  facing: Facing;
  neighbour: string | null;
  /** How far you would fall off this piece of edge (0 when the other side is level or higher). */
  drop: number;
  railed: boolean;
  stair: boolean;
  need: "required" | "warn" | null;
}

export interface Joint { a: string; b: string; len: number; segs: [Pt, Pt][] }
export interface LegCluster { at: Pt; pids: string[]; level: boolean; rollriser: boolean }
export interface Issue { level: "error" | "warning"; text: string; ids: string[]; at?: Pt }

export interface Analysis {
  heights: Record<string, number>;
  units: EdgeUnit[];
  joints: Joint[];
  legs: LegCluster[];
  /** Points where two rail ends meet (one handrail clamp each). */
  railJoins: Pt[];
  /** Platform each stair hangs off. */
  stairHost: Record<string, string | null>;
  issues: Issue[];
}

const UNIT = 10;
const key = ([x, y]: Pt) => `${Math.round(x)},${Math.round(y)}`;
const near = (a: Pt, b: Pt, tol = 1.5) => Math.abs(a[0] - b[0]) <= tol && Math.abs(a[1] - b[1]) <= tol;
const fmtM = (cm: number) => `${(cm / 100).toFixed(cm % 100 === 0 ? 0 : 1)}m`;

export function platformLabel(p: Platform, heights: Record<string, number>) {
  return `${ITEMS[p.item]?.short ?? p.item} (${heights[p.id]}cm)`;
}

/** Rail lies on the unit's line and covers its midpoint. */
function railCovers(plan: Plan, u: EdgeUnit) {
  if (!u.axis) return false;
  return plan.rails.some((r) => {
    if (r.dir !== u.axis) return false;
    const l = railLength(r);
    return u.axis === "h"
      ? Math.abs(u.mid[1] - r.y) < 1 && u.mid[0] > r.x && u.mid[0] < r.x + l
      : Math.abs(u.mid[0] - r.x) < 1 && u.mid[1] > r.y && u.mid[1] < r.y + l;
  });
}

function stairCovers(plan: Plan, u: EdgeUnit) {
  return plan.stairs.some((s) => {
    const k = STAIR_KINDS[s.kind];
    if (!k || !u.axis) return false;
    const v = SIDE_VEC[s.facing];
    if (Math.abs(u.n[0] - v[0]) > 0.01 || Math.abs(u.n[1] - v[1]) > 0.01) return false;
    return u.axis === "h"
      ? Math.abs(u.mid[1] - s.y) < 1 && Math.abs(u.mid[0] - s.x) < k.w / 2
      : Math.abs(u.mid[0] - s.x) < 1 && Math.abs(u.mid[1] - s.y) < k.w / 2;
  });
}

export function analyse(plan: Plan): Analysis {
  const issues: Issue[] = [];
  const heights: Record<string, number> = {};
  const polys: Record<string, Pt[]> = {};
  const byId: Record<string, Platform> = {};
  for (const p of plan.platforms) {
    heights[p.id] = stageHeight(p);
    polys[p.id] = footprint(p).pts;
    byId[p.id] = p;
    if (!ITEMS[p.item]) issues.push({ level: "error", text: `Unknown platform item ${p.item}`, ids: [p.id] });
  }
  const label = (id: string) => platformLabel(byId[id], heights);
  const at = (pt: Pt) => plan.platforms.find((p) => pointInPoly(pt, polys[p.id]));
  const otherAt = (pt: Pt, self: string) => plan.platforms.find((p) => p.id !== self && pointInPoly(pt, polys[p.id]));

  // Overlaps
  for (let i = 0; i < plan.platforms.length; i++)
    for (let j = i + 1; j < plan.platforms.length; j++) {
      const a = plan.platforms[i], b = plan.platforms[j];
      if (polysOverlap(polys[a.id], polys[b.id]))
        issues.push({ level: "error", text: `${label(a.id)} and ${label(b.id)} overlap`, ids: [a.id, b.id], at: polys[a.id][0] });
    }

  // Edge units
  const away = SIDE_VEC[OPPOSITE[plan.audience]];
  const units: EdgeUnit[] = [];
  for (const p of plan.platforms) {
    const pts = polys[p.id];
    for (let i = 0; i < pts.length; i++) {
      const A = pts[i], B = pts[(i + 1) % pts.length];
      const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
      if (L < 0.5) continue;
      // Polygons run clockwise on screen (y down), so the outward normal is (dy, -dx).
      const n: Pt = [(B[1] - A[1]) / L, -(B[0] - A[0]) / L];
      const axis = Math.abs(B[1] - A[1]) < 0.01 ? "h" : Math.abs(B[0] - A[0]) < 0.01 ? "v" : null;
      const dot = n[0] * away[0] + n[1] * away[1];
      const facing: Facing = dot > 0.6 ? "upstage" : dot < -0.6 ? "downstage" : "side";
      const count = Math.max(1, Math.round(L / UNIT));
      for (let k = 0; k < count; k++) {
        const a: Pt = [A[0] + ((B[0] - A[0]) * k) / count, A[1] + ((B[1] - A[1]) * k) / count];
        const b: Pt = [A[0] + ((B[0] - A[0]) * (k + 1)) / count, A[1] + ((B[1] - A[1]) * (k + 1)) / count];
        const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const nb = otherAt([mid[0] + n[0] * 3, mid[1] + n[1] * 3], p.id);
        const drop = Math.max(0, heights[p.id] - (nb ? heights[nb.id] : 0));
        const u: EdgeUnit = { pid: p.id, a, b, mid, len: L / count, n, axis, facing, neighbour: nb?.id ?? null, drop, railed: false, stair: false, need: null };
        u.railed = railCovers(plan, u);
        u.stair = stairCovers(plan, u);
        if (drop > 0 && !u.stair) {
          // The manual asks for railings on every open edge above 80cm.
          if (facing === "upstage" || heights[p.id] > 80) u.need = "required";
          else if (facing === "side") u.need = "warn";
        }
        units.push(u);
      }
    }
  }

  // Unrailed edges: neighbouring pieces on the same line are reported together, even across platforms
  const groups = new Map<string, EdgeUnit[]>();
  for (const u of units) {
    if (!u.need || u.railed) continue;
    const line = u.axis === "h" ? `h${Math.round(u.mid[1])}` : u.axis === "v" ? `v${Math.round(u.mid[0])}` : `p${u.pid}`;
    const k = `${u.need}|${u.facing}|${u.n[0].toFixed(2)},${u.n[1].toFixed(2)}|${line}`;
    groups.set(k, [...(groups.get(k) ?? []), u]);
  }
  for (const list of groups.values()) {
    const ax = list[0].axis === "v" ? 1 : 0;
    list.sort((p, q) => p.mid[ax] - q.mid[ax]);
    const runs: EdgeUnit[][] = [];
    for (const u of list) {
      const last = runs[runs.length - 1];
      const prev = last?.[last.length - 1];
      if (prev && (!u.axis || Math.abs(Math.max(prev.a[ax], prev.b[ax]) - Math.min(u.a[ax], u.b[ax])) < 0.5)) last.push(u);
      else runs.push([u]);
    }
    for (const run of runs) {
      const u = run[0];
      const len = fmtM(Math.round(run.reduce((s, x) => s + x.len, 0)));
      const drop = Math.max(...run.map((x) => x.drop));
      const pids = [...new Set(run.map((x) => x.pid))];
      const where = pids.length > 1 ? `${pids.length} platforms` : label(pids[0]);
      const what = `${u.facing === "upstage" ? "Upstage" : u.facing === "side" ? "Side" : "Downstage"} edge of ${where}`;
      const at = run[Math.floor(run.length / 2)].mid;
      if (!u.axis) issues.push({ level: "warning", text: `${what} is open (${len}, ${drop}cm drop) but no straight handrail fits a diagonal or curved edge — block it off another way`, ids: pids, at });
      else if (u.need === "required") issues.push({ level: "error", text: `${what} needs handrails: ${len} unrailed, ${drop}cm drop`, ids: pids, at });
      else issues.push({ level: "warning", text: `${what} is open: ${len} without handrails, ${drop}cm drop`, ids: pids, at });
    }
  }

  // Joints between level neighbours (assembly clamps) and awkward height steps
  const joints = new Map<string, Joint>();
  const steps = new Set<string>();
  for (const u of units) {
    if (!u.neighbour) continue;
    const dh = Math.abs(heights[u.pid] - heights[u.neighbour]);
    const [a, b] = u.pid < u.neighbour ? [u.pid, u.neighbour] : [u.neighbour, u.pid];
    if (dh === 0) {
      if (u.pid !== a) continue; // count each shared piece once
      const k = `${a}|${b}`;
      const j = joints.get(k) ?? { a, b, len: 0, segs: [] };
      j.len += u.len;
      const last = j.segs[j.segs.length - 1];
      if (last && near(last[1], u.a)) last[1] = u.b;
      else j.segs.push([u.a, u.b]);
      joints.set(k, j);
    } else if (dh < 5 && !steps.has(`${a}|${b}`)) {
      steps.add(`${a}|${b}`);
      issues.push({ level: "warning", text: `${label(a)} and ${label(b)} differ by only ${dh}cm — a trip hazard`, ids: [a, b], at: u.mid });
    }
  }

  // Legs that meet at a corner can share a leg clamp
  const legMap = new Map<string, LegCluster>();
  for (const p of plan.platforms) {
    if (p.support.item === "floor") continue;
    for (const pt of footprint(p).legs) {
      const k = key(pt);
      const c = legMap.get(k) ?? { at: pt, pids: [], level: true, rollriser: true };
      if (c.pids.length && heights[c.pids[0]] !== heights[p.id]) c.level = false;
      if (!p.support.rollriser) c.rollriser = false;
      c.pids.push(p.id);
      legMap.set(k, c);
    }
  }
  const legs = [...legMap.values()];

  // Wheels and tall stages
  for (const p of plan.platforms) {
    const s = ITEMS[p.support.item];
    if (s?.wheel && units.some((u) => u.pid === p.id && u.neighbour))
      issues.push({ level: "warning", text: `${label(p.id)} is on leg wheels but joined to other platforms — Thomann recommend Rollriser wheels instead`, ids: [p.id], at: polys[p.id][0] });
    if (heights[p.id] > 100)
      issues.push({ level: "warning", text: `${label(p.id)} is over 100cm: fit diagonal struts between the legs`, ids: [p.id], at: polys[p.id][0] });
    if (p.support.item !== "floor" && !s) issues.push({ level: "error", text: `Unknown leg item ${p.support.item}`, ids: [p.id] });
  }

  // Rails must run along platform edges and not overlap each other
  for (const r of plan.rails) {
    const l = railLength(r);
    const [e0] = railEnds(r);
    let onEdge = 0, onExposed = 0, n = 0;
    for (let t = 5; t < l; t += UNIT) {
      n++;
      const pt: Pt = r.dir === "h" ? [e0[0] + t, e0[1]] : [e0[0], e0[1] + t];
      const hits = units.filter((u) => u.axis === r.dir && near(u.mid, pt, UNIT / 2 + 0.1) && (r.dir === "h" ? Math.abs(u.mid[1] - pt[1]) < 1 : Math.abs(u.mid[0] - pt[0]) < 1));
      if (hits.length) onEdge++;
      if (hits.some((u) => u.drop > 0)) onExposed++;
    }
    const name = ITEMS[r.item]?.short ?? "Handrail";
    if (onEdge < n) issues.push({ level: "error", text: `${name} isn't fully along a platform edge`, ids: [r.id], at: [r.x, r.y] });
    else if (onExposed < n) issues.push({ level: "warning", text: `${name} runs along an edge with no drop`, ids: [r.id], at: [r.x, r.y] });
  }
  for (let i = 0; i < plan.rails.length; i++)
    for (let j = i + 1; j < plan.rails.length; j++) {
      const a = plan.rails[i], b = plan.rails[j];
      if (a.dir !== b.dir) continue;
      const [a0, a1] = railEnds(a), [b0, b1] = railEnds(b);
      const same = a.dir === "h" ? Math.abs(a.y - b.y) < 1 : Math.abs(a.x - b.x) < 1;
      const ax = a.dir === "h" ? 0 : 1;
      if (same && Math.min(a1[ax], b1[ax]) - Math.max(a0[ax], b0[ax]) > 1)
        issues.push({ level: "error", text: "Two handrails overlap", ids: [a.id, b.id], at: a0 });
    }
  const railJoins: Pt[] = [];
  const ends = plan.rails.flatMap((r) => railEnds(r));
  const used = new Set<number>();
  for (let i = 0; i < ends.length; i++) {
    if (used.has(i)) continue;
    for (let j = i + 1; j < ends.length; j++) {
      if (used.has(j) || Math.floor(i / 2) === Math.floor(j / 2)) continue;
      if (near(ends[i], ends[j], 2)) { railJoins.push(ends[i]); used.add(i); used.add(j); break; }
    }
  }

  // Stairs
  const stairHost: Record<string, string | null> = {};
  for (const s of plan.stairs) {
    const k = STAIR_KINDS[s.kind];
    const v = SIDE_VEC[s.facing];
    const host = at([s.x - v[0] * 3, s.y - v[1] * 3]);
    stairHost[s.id] = host?.id ?? null;
    const name = k?.label ?? "Stair";
    if (!host) { issues.push({ level: "error", text: `${name} isn't against a platform`, ids: [s.id], at: [s.x, s.y] }); continue; }
    const h = heights[host.id];
    if (k && (h < k.minHeight || h > k.maxHeight))
      issues.push({ level: "error", text: `${name} suits ${k.minHeight}–${k.maxHeight}cm, but ${label(host.id)} is ${h}cm`, ids: [s.id, host.id], at: [s.x, s.y] });
    const sp = rectPts(stairRect(s));
    const hit = plan.platforms.find((p) => polysOverlap(sp, polys[p.id]));
    if (hit) issues.push({ level: "error", text: `${name} runs into ${label(hit.id)}`, ids: [s.id, hit.id], at: [s.x, s.y] });
  }

  issues.sort((a, b) => (a.level === b.level ? 0 : a.level === "error" ? -1 : 1));
  return { heights, units, joints: [...joints.values()], legs, railJoins, stairHost, issues };
}
