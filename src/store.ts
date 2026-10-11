import { create } from "zustand";
import { notifications } from "@mantine/notifications";
import type { Plan, Project, Tool, View } from "./types";
import { ITEMS } from "./catalogue";
import { analyse } from "./lib/analysis";
import { bom, hardShort } from "./lib/bom";
import { loadProject, saveProject } from "./storage";
import { emptyPlan } from "./samples";
import { uid } from "./lib/util";
import { log } from "./log";

const HISTORY = 40;

interface State {
  project: Project;
  past: Project[];
  future: Project[];
  saveState: "saved" | "pending" | "error";
  view: View;
  tool: Tool;
  stairKind: string;
  /** Handrail the rail tool places. */
  railItem: string;
  selection: string[];
}

export const useStore = create<State>(() => ({
  project: loadProject(),
  past: [],
  future: [],
  saveState: "saved",
  view: "design",
  tool: "select",
  stairKind: "auto",
  railItem: "485819",
  selection: [],
}));

const get = useStore.getState;
const set = useStore.setState;

export const activePlan = (p: Project): Plan => p.plans.find((x) => x.id === p.activePlanId) ?? p.plans[0];

export function setProject(fn: (p: Project) => Project, undoable = true) {
  const { project, past } = get();
  const next = fn(project);
  if (next === project) return;
  set({
    project: next,
    saveState: "pending",
    ...(undoable ? { past: [...past.slice(-HISTORY + 1), project], future: [] } : {}),
  });
}

export function flushSave() {
  try {
    saveProject(get().project);
    set({ saveState: "saved" });
  } catch (e) {
    console.error(e);
    set({ saveState: "error" });
  }
}

/**
 * Changes the active plan. Unless the user has allowed planning beyond their stock, a change that
 * needs more platforms, legs, rails or stairs than are owned is refused. Returns whether it was applied.
 */
export function updatePlan(fn: (pl: Plan) => Plan, undoable = true): boolean {
  const project = get().project;
  const plan = activePlan(project);
  const next = fn(plan);
  if (next === plan) return false;
  if (!project.allowOverInventory) {
    const before = hardShort(project, plan, analyse(plan));
    const after = hardShort(project, next, analyse(next));
    const worse = Object.keys(after).filter((k) => after[k] > (before[k] ?? 0));
    if (worse.length) {
      const lines = bom(project, next, analyse(next)).filter((l) => worse.includes(l.no));
      const what = lines.map((l) => `${ITEMS[l.no]?.short ?? l.label} (you own ${l.ownedPieces}, this needs ${l.pieces})`).join(", ");
      notifications.show({ color: "red", title: "Not enough parts", message: `${what}. Add them in Parts I own, or turn on “Plan beyond what I own”.` });
      log("plan", "refused: not enough", worse);
      return false;
    }
  }
  setProject((p) => ({ ...p, plans: p.plans.map((x) => (x.id === plan.id ? next : x)) }), undoable);
  return true;
}

export function undo() {
  const { past, project, future } = get();
  if (!past.length) return;
  set({ project: past[past.length - 1], past: past.slice(0, -1), future: [project, ...future], saveState: "pending", selection: [] });
}

export function redo() {
  const { past, project, future } = get();
  if (!future.length) return;
  set({ project: future[0], past: [...past, project], future: future.slice(1), saveState: "pending", selection: [] });
}

export const select = (ids: string[]) => set({ selection: ids });
export const setView = (view: View) => set({ view });
export const setTool = (tool: Tool) => set({ tool, selection: tool === "select" ? get().selection : [] });
export const setStairKind = (stairKind: string) => set({ stairKind });
export const setRailItem = (railItem: string) => set({ railItem });

export function openPlan(id: string) {
  setProject((p) => ({ ...p, activePlanId: id }), false);
  set({ selection: [] });
}

export function newPlan(name: string) {
  const cur = activePlan(get().project);
  const pl = emptyPlan(name, cur?.venueId ?? null);
  setProject((p) => ({ ...p, plans: [...p.plans, pl], activePlanId: pl.id }));
  set({ selection: [] });
  log("plan", "new", name);
}

export function duplicatePlan(id: string) {
  const src = get().project.plans.find((p) => p.id === id);
  if (!src) return;
  const copy: Plan = structuredClone({ ...src, id: uid(), name: `${src.name} (copy)` });
  setProject((p) => ({ ...p, plans: [...p.plans, copy], activePlanId: copy.id }));
}

export function deletePlan(id: string) {
  setProject((p) => {
    const plans = p.plans.filter((x) => x.id !== id);
    if (!plans.length) plans.push(emptyPlan("Plan 1"));
    return { ...p, plans, activePlanId: p.activePlanId === id ? plans[0].id : p.activePlanId };
  });
  set({ selection: [] });
}

export function renamePlan(id: string, patch: Partial<Pick<Plan, "name" | "notes">>) {
  setProject((p) => ({ ...p, plans: p.plans.map((x) => (x.id === id ? { ...x, ...patch } : x)) }), false);
}

export function replaceProject(project: Project) {
  set({ project, past: [...get().past, get().project], future: [], selection: [], saveState: "pending" });
}
