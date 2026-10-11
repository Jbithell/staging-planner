// All lengths are whole centimetres in room coordinates: x to the right, y down the drawing.

export type Rot = 0 | 90 | 180 | 270;
export type Side = "top" | "bottom" | "left" | "right";

export interface Support {
  /** Catalogue item number of the legs/wheels, or "floor". */
  item: string;
  /** Chosen height for telescopic legs. */
  height?: number;
  /** Stands on Rollriser wheels (+13cm). */
  rollriser?: boolean;
}

export interface Platform {
  id: string;
  item: string;
  /** Top-left of the rotated footprint's bounding box. */
  x: number;
  y: number;
  rot: Rot;
  support: Support;
}

/** A straight handrail lying along a platform edge, from (x, y) for its length to the right ("h") or down ("v"). */
export interface Rail {
  id: string;
  item: string;
  x: number;
  y: number;
  dir: "h" | "v";
}

/** A stair whose top edge is centred on (x, y) on a platform edge, running away from the stage towards `facing`. */
export interface Stair {
  id: string;
  kind: string;
  x: number;
  y: number;
  facing: Side;
  handrails: 0 | 1 | 2;
}

export interface Venue {
  id: string;
  name: string;
  image: string;
  /** Image size in pixels. */
  width: number;
  height: number;
  /** null until the scale has been set. */
  cmPerPx: number | null;
  scaleLine?: { a: [number, number]; b: [number, number]; metres: number };
}

export interface Plan {
  id: string;
  name: string;
  notes: string;
  venueId: string | null;
  audience: Side;
  platforms: Platform[];
  rails: Rail[];
  stairs: Stair[];
}

export interface Project {
  /** Single pieces owned per catalogue item number. */
  inventory: Record<string, number>;
  allowOverInventory: boolean;
  gridCm: number;
  venues: Venue[];
  plans: Plan[];
  activePlanId: string;
}

export type View = "design" | "build" | "parts";
export type Tool = "select" | "rail" | "stair";
