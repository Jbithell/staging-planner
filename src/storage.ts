import type { Plan, Project, Venue } from "./types";
import { DEFAULT_INVENTORY } from "./catalogue";
import { defaultProject } from "./samples";
import { log } from "./log";

const KEY = "tsp:project";
export const FORMAT = "tour-stage-planner";
const VERSION = 1;

export function serialiseProject(p: Project) {
  return JSON.stringify({ format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(), project: p });
}

const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/** Validates loosely and fills defaults, so files from older versions keep loading. */
export function parseProject(text: string): Project {
  const data = JSON.parse(text);
  if (data?.format !== FORMAT) throw new Error("This isn't a Tour Stage Planner file");
  if (typeof data.version !== "number" || data.version > VERSION) throw new Error("This file was made by a newer version of the app");
  const p = data.project ?? {};
  const plans: Plan[] = arr<Plan>(p.plans).map((pl) => ({
    id: String(pl.id), name: String(pl.name ?? "Plan"), notes: String(pl.notes ?? ""), venueId: pl.venueId ?? null,
    audience: pl.audience ?? "top", platforms: arr(pl.platforms), rails: arr(pl.rails), stairs: arr(pl.stairs),
  }));
  if (!plans.length) throw new Error("The file has no plans");
  const venues: Venue[] = arr<Venue>(p.venues).filter((v) => typeof v.image === "string");
  return {
    inventory: { ...Object.fromEntries(Object.keys(DEFAULT_INVENTORY).map((k) => [k, 0])), ...(p.inventory ?? {}) },
    allowOverInventory: !!p.allowOverInventory,
    gridCm: Number(p.gridCm) || 50,
    venues,
    plans,
    activePlanId: plans.some((x) => x.id === p.activePlanId) ? p.activePlanId : plans[0].id,
  };
}

export function loadProject(): Project {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = parseProject(raw);
      log("storage", "loaded from localStorage", `${(raw.length / 1024).toFixed(0)} kB`);
      return p;
    }
  } catch (e) {
    console.error(e);
  }
  log("storage", "starting a new project with the example plans");
  return defaultProject();
}

/** Throws (e.g. QuotaExceededError) if the browser refuses to store it. */
export function saveProject(p: Project) {
  const s = serialiseProject(p);
  localStorage.setItem(KEY, s);
  log("storage", "saved", `${(s.length / 1024).toFixed(0)} kB`);
}

export function downloadProject(p: Project, name = "tour-stage-plans") {
  const blob = new Blob([serialiseProject(p)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${name.replace(/[^\w\- ]+/g, "").trim() || "tour-stage-plans"}.tourstage.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Scales a floor plan down to ≤2000px and keeps whichever of PNG/JPEG is smaller, to fit localStorage. */
export async function loadFloorPlan(file: Blob): Promise<{ image: string; width: number; height: number }> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
  const width = Math.round(bmp.width * s), height = Math.round(bmp.height * s);
  const c = document.createElement("canvas");
  c.width = width; c.height = height;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bmp, 0, 0, width, height);
  const png = c.toDataURL("image/png"), jpg = c.toDataURL("image/jpeg", 0.85);
  return { image: png.length < jpg.length ? png : jpg, width, height };
}
