import { FLOOR, ITEMS, STAIR_KINDS } from "../catalogue";
import type { Plan, Project } from "../types";
import type { Analysis } from "./analysis";
import { legCount } from "./geometry";

/** One line of the parts list, in single pieces of one catalogue part. */
export interface Need {
  no: string;
  label: string;
  pieces: number;
  /** Hard needs (platforms, legs, rails, stairs) can't be placed beyond stock unless the override is on. */
  hard: boolean;
  /** Worked out from the layout rather than placed by hand. */
  estimate: boolean;
  why?: string;
}

export interface BomLine extends Need {
  ownedPieces: number;
  shortPieces: number;
  weight: number | null;
}

export function needs(plan: Plan, a: Analysis): Need[] {
  const out = new Map<string, Need>();
  const add = (no: string, n: number, base: Omit<Need, "no" | "pieces" | "label">) => {
    if (n <= 0) return;
    const cur = out.get(no);
    if (cur) cur.pieces += n;
    else out.set(no, { no, pieces: n, label: ITEMS[no]?.name ?? no, ...base });
  };
  const hardItem = (no: string, n: number) => add(no, n, { hard: true, estimate: false });

  for (const p of plan.platforms) {
    hardItem(p.item, 1);
    if (p.support.item !== FLOOR) hardItem(p.support.item, legCount(p));
  }
  for (const r of plan.rails) hardItem(r.item, 1);
  for (const s of plan.stairs) {
    const k = STAIR_KINDS[s.kind];
    if (!k) continue;
    for (const no of k.items) hardItem(no, 1);
    if (k.rail) hardItem(k.rail, s.handrails);
  }

  const byId = Object.fromEntries(plan.platforms.map((p) => [p.id, p]));
  for (const c of a.legs) {
    const riser = c.pids.filter((id) => byId[id].support.rollriser).length;
    add("439965", Math.floor(riser / 2), { hard: true, estimate: true, why: "Under each pair of neighbouring legs on Rollrisers" });
    add("439958", riser % 2, { hard: true, estimate: true, why: "Under single legs on Rollrisers" });
    if (!c.level) continue;
    if (c.pids.length >= 4) add("296474", 1, { hard: false, estimate: true, why: "Where four level platforms meet" });
    else if (c.pids.length >= 2) add("296473", 1, { hard: false, estimate: true, why: "Where two or three level platforms meet" });
  }
  const clamps = a.joints.reduce((s, j) => s + Math.max(1, Math.ceil(j.len / 100 - 0.05)), 0);
  add("571346", clamps, { hard: false, estimate: true, why: "About one per metre of joint between level platforms" });
  add("520324", clamps * 2, { hard: false, estimate: true, why: "About two per assembly clamp" });
  add("485811", a.railJoins.length, { hard: false, estimate: true, why: "One where two handrail ends meet" });
  return [...out.values()];
}

export function bom(project: Project, plan: Plan, a: Analysis): BomLine[] {
  return needs(plan, a).map((n) => {
    const ownedPieces = project.inventory[n.no] ?? 0;
    const w = ITEMS[n.no]?.weight;
    return { ...n, ownedPieces, shortPieces: Math.max(0, n.pieces - ownedPieces), weight: w != null ? w * n.pieces : null };
  });
}

/** Hard shortfalls in pieces, by line key; used to refuse edits that need parts that aren't owned. */
export function hardShort(project: Project, plan: Plan, a: Analysis): Record<string, number> {
  return Object.fromEntries(bom(project, plan, a).filter((l) => l.hard && l.shortPieces > 0).map((l) => [l.no, l.shortPieces]));
}

/** Pieces of an item still free in this plan. */
export function remaining(project: Project, plan: Plan, a: Analysis, no: string) {
  const line = needs(plan, a).find((l) => l.no === no);
  return Math.max(0, (project.inventory[no] ?? 0) - (line?.pieces ?? 0));
}
