import { FLOOR, ITEMS, STAIR_KINDS } from "../catalogue";
import type { Plan, Project } from "../types";
import type { Analysis } from "./analysis";
import { legCount } from "./geometry";

/** One line of the parts list. `items` are interchangeable catalogue items (e.g. clamp packs); the first is the one to buy. */
export interface Need {
  key: string;
  label: string;
  items: string[];
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
  /** Packs of items[0] to buy to cover the shortfall. */
  buyPacks: number;
  buyCost: number | null;
  weight: number | null;
}

export const packOf = (no: string) => ITEMS[no]?.pack ?? 1;
const ASSEMBLY = ["571346", "571345", "571344"];

export function needs(plan: Plan, a: Analysis): Need[] {
  const out = new Map<string, Need>();
  const add = (key: string, n: number, base: Omit<Need, "key" | "pieces">) => {
    if (n <= 0) return;
    const cur = out.get(key);
    if (cur) cur.pieces += n;
    else out.set(key, { key, pieces: n, ...base });
  };
  const hardItem = (no: string, n: number) => add(no, n, { label: ITEMS[no]?.name ?? no, items: [no], hard: true, estimate: false });

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
    add("439965", Math.floor(riser / 2), { label: ITEMS["439965"].name, items: ["439965"], hard: true, estimate: true, why: "Under each pair of neighbouring legs on Rollrisers" });
    add("439958", riser % 2, { label: ITEMS["439958"].name, items: ["439958"], hard: true, estimate: true, why: "Under single legs on Rollrisers" });
    if (!c.level) continue;
    if (c.pids.length >= 4) add("296474", 1, { label: ITEMS["296474"].name, items: ["296474"], hard: false, estimate: true, why: "Where four level platforms meet" });
    else if (c.pids.length >= 2) add("296473", 1, { label: ITEMS["296473"].name, items: ["296473"], hard: false, estimate: true, why: "Where two or three level platforms meet" });
  }
  const clamps = a.joints.reduce((s, j) => s + Math.max(1, Math.ceil(j.len / 100 - 0.05)), 0);
  add("assembly", clamps, { label: "Stairville Tour Stage Assembly Clamp", items: ASSEMBLY, hard: false, estimate: true, why: "About one per metre of joint between level platforms" });
  add("520324", clamps * 2, { label: ITEMS["520324"].name, items: ["520324"], hard: false, estimate: true, why: "About two per assembly clamp" });
  add("485811", a.railJoins.length, { label: ITEMS["485811"].name, items: ["485811"], hard: false, estimate: true, why: "One where two handrail ends meet" });
  add("473947", Math.ceil(plan.platforms.length / 6), { label: ITEMS["473947"].name, items: ["473947"], hard: false, estimate: true, why: "Six platforms per CargoBox" });
  return [...out.values()];
}

export function bom(project: Project, plan: Plan, a: Analysis): BomLine[] {
  return needs(plan, a).map((n) => {
    const ownedPieces = n.items.reduce((s, no) => s + (project.inventory[no] ?? 0) * packOf(no), 0);
    const shortPieces = Math.max(0, n.pieces - ownedPieces);
    const buy = n.items[0];
    const buyPacks = Math.ceil(shortPieces / packOf(buy));
    const price = ITEMS[buy]?.price;
    const w = ITEMS[buy]?.weight;
    return {
      ...n, ownedPieces, shortPieces, buyPacks,
      buyCost: buyPacks === 0 ? 0 : price != null ? buyPacks * price : null,
      weight: w != null ? (w / packOf(buy)) * n.pieces : null,
    };
  });
}

/** Hard shortfalls in pieces, by line key; used to refuse edits that need parts that aren't owned. */
export function hardShort(project: Project, plan: Plan, a: Analysis): Record<string, number> {
  return Object.fromEntries(bom(project, plan, a).filter((l) => l.hard && l.shortPieces > 0).map((l) => [l.key, l.shortPieces]));
}

/** Pieces of an item still free in this plan. */
export function remaining(project: Project, plan: Plan, a: Analysis, no: string) {
  const line = bom(project, plan, a).find((l) => l.items.includes(no));
  const owned = (project.inventory[no] ?? 0) * packOf(no);
  return line ? Math.max(0, line.ownedPieces - line.pieces) : owned;
}
