import { DEFAULT_INVENTORY } from "./catalogue";
import type { Plan, Platform, Project, Rail } from "./types";
import { uid } from "./lib/util";

const P2 = "295737", P1 = "295854", L30 = "458589", L60 = "452012", R2 = "485819", R1 = "485812";

const plat = (item: string, x: number, y: number, legs: string, rot: 0 | 90 = 0): Platform => ({ id: uid(), item, x, y, rot, support: { item: legs } });
const rail = (item: string, x: number, y: number, dir: "h" | "v"): Rail => ({ id: uid(), item, x, y, dir });
const plan = (name: string, notes: string, platforms: Platform[], rails: Rail[]): Plan => ({
  id: uid(), name, notes, venueId: null, audience: "top", platforms, rails, stairs: [],
});

/** Three example layouts to start from. */
export function samplePlans(): Plan[] {
  const long = plan("One long stage", "All at 30cm stage height.",
    [0, 200, 400, 600, 800].flatMap((x) => [plat(P2, x, 0, L30), plat(P2, x, 100, L30)]),
    [...[0, 200, 400, 600, 800].map((x) => rail(R2, x, 200, "h")), rail(R2, 0, 0, "v"), rail(R2, 1000, 0, "v")]);

  const thrust = plan("Thrust", "All at 30cm stage height. Audience on three sides.",
    [0, 100, 200, 300].flatMap((y) => [plat(P2, 0, y, L30), plat(P2, 200, y, L30)]),
    [rail(R2, 0, 400, "h"), rail(R2, 200, 400, "h")]);

  const twoStages = plan("Two stages, each with two tiers", "Outer platforms at 30cm, inner tiers at 60cm.",
    [
      plat(P2, 0, 0, L30), plat(P2, 0, 100, L60), plat(P2, 0, 200, L60), plat(P1, 200, 0, L30), plat(P2, 200, 100, L30, 90),
      plat(P1, 900, 0, L30), plat(P2, 900, 100, L30, 90), plat(P2, 1000, 0, L30), plat(P2, 1000, 100, L60), plat(P2, 1000, 200, L60),
    ],
    [rail(R2, 0, 300, "h"), rail(R1, 200, 300, "h"), rail(R2, 0, 100, "v"), rail(R1, 900, 300, "h"), rail(R2, 1000, 300, "h"), rail(R2, 1200, 100, "v")]);

  return [long, thrust, twoStages];
}

export function emptyPlan(name: string, venueId: string | null = null): Plan {
  return { id: uid(), name, notes: "", venueId, audience: "top", platforms: [], rails: [], stairs: [] };
}

export function defaultProject(): Project {
  const plans = samplePlans();
  return { inventory: { ...DEFAULT_INVENTORY }, allowOverInventory: false, gridCm: 50, venues: [], plans, activePlanId: plans[0].id };
}
