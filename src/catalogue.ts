// The Stairville Tour Stage range as sold by Thomann. Weights come from thomann.co.uk and the Tour Stage
// assembly instructions; treat them as approximate. Everything is counted in single pieces: Thomann sells some
// parts in sets or packs of different sizes, and pieces get broken and thrown away.

export type Group = "platform" | "support" | "rail" | "rail-acc" | "connector" | "stair" | "stair-acc";

export const GROUP_LABELS: Record<Group, string> = {
  platform: "Platforms",
  support: "Legs & wheels",
  rail: "Handrails",
  "rail-acc": "Handrail accessories",
  connector: "Connectors",
  stair: "Stairs",
  "stair-acc": "Stair accessories",
};

/** Platform outline in its own frame: rect, right triangle (right angle top-left for "tri-l", top-right for "tri-r") or quarter circle. */
export type ShapeKind = "rect" | "tri-l" | "tri-r" | "quarter";

export interface Item {
  no: string;
  name: string;
  /** Short label used on drawings. */
  short: string;
  group: Group;
  /** Thomann page slug (www.thomann.co.uk/<page>.htm). Without one we link to a search for the item number. */
  page?: string;
  /** kg per piece */
  weight?: number;
  /** Other Thomann item numbers selling this part (other pack sizes), as [item no., label]. */
  also?: [string, string][];
  note?: string;
  // platform
  shape?: ShapeKind;
  w?: number;
  d?: number;
  /** Load-rated (TÜV) standard formats; the others are decorative. */
  rated?: boolean;
  // support
  height?: number;
  minHeight?: number;
  maxHeight?: number;
  wheel?: boolean;
}

export const CATALOGUE: Item[] = [
  // Platforms
  { no: "295737", name: "Stairville Tour Stage Platform 2x1m ODW", short: "2x1", group: "platform", page: "stairville_tour_stage_platform_2x1_m_odw", weight: 33, shape: "rect", w: 200, d: 100, rated: true },
  { no: "462002", name: "Stairville Tour Stage Platform 1,5x1m ODW", short: "1.5x1", group: "platform", page: "stairville_tour_stage_platform_15x1m_odw", weight: 27, shape: "rect", w: 150, d: 100 },
  { no: "295854", name: "Stairville Tour Stage Platform 1x1m ODW", short: "1x1", group: "platform", page: "stairville_tour_stage_platform_1x1_m_odw", weight: 17.7, shape: "rect", w: 100, d: 100, rated: true },
  { no: "448737", name: "Stairville Tour Stage Platform 2x0.5m ODW", short: "2x0.5", group: "platform", page: "stairville_tour_stage_platform_2x0.5m_odw", weight: 19, shape: "rect", w: 200, d: 50 },
  { no: "519650", name: "Stairville Tour Stage Platf. 1,5x0,5m ODW", short: "1.5x0.5", group: "platform", page: "stairville_tour_stage_platf._15x05m_odw", weight: 16, shape: "rect", w: 150, d: 50 },
  { no: "448742", name: "Stairville Tour Stage Platform 1x0.5m ODW", short: "1x0.5", group: "platform", page: "stairville_tour_stage_platform_1x0.5m_odw", weight: 12, shape: "rect", w: 100, d: 50 },
  { no: "443327", name: "Stairville Tour Stage Triangle 1x1m ODW", short: "Tri 1x1", group: "platform", page: "stairville_tour_stage_triangle_1x1m_odw", weight: 11.5, shape: "tri-l", w: 100, d: 100 },
  { no: "443325", name: "Stairville Tour Stage Triangle 2x1m L ODW", short: "Tri 2x1 L", group: "platform", page: "stairville_tour_stage_triangle_2x1m_l_odw", weight: 26.5, shape: "tri-l", w: 200, d: 100 },
  { no: "443326", name: "Stairville Tour Stage Triangle 2x1m R ODW", short: "Tri 2x1 R", group: "platform", page: "stairville_tour_stage_triangle_2x1m_r_odw", weight: 26.5, shape: "tri-r", w: 200, d: 100 },
  { no: "464993", name: "Stairville Tour Stage Circular 1x1m ODW", short: "Circ 1x1", group: "platform", page: "stairville_tour_stage_circular_1x1m_odw", weight: 15, shape: "quarter", w: 100, d: 100 },

  // Legs and wheels
  { no: "452010", name: "Stairville Tour Stage Leg 20cm", short: "Legs 20cm", group: "support", page: "stairville_tour_stage_leg_set_of_4x_20cm", height: 20, note: "Sold in sets of 4." },
  { no: "458589", name: "Stairville Tour Stage Leg 30cm", short: "Legs 30cm", group: "support", page: "stairville_tour_stage_leg_set_of_4x_30cm", height: 30, note: "Sold in sets of 4." },
  { no: "452011", name: "Stairville Tour Stage Leg 40cm", short: "Legs 40cm", group: "support", page: "stairville_tour_stage_leg_set_of_4x_40cm", height: 40, note: "Sold in sets of 4." },
  { no: "458591", name: "Stairville Tour Stage Leg 50cm", short: "Legs 50cm", group: "support", page: "stairville_tour_stage_leg_set_of_4x_50cm", height: 50, note: "Sold in sets of 4." },
  { no: "452012", name: "Stairville Tour Stage Leg 60cm", short: "Legs 60cm", group: "support", page: "stairville_tour_stage_leg_set_of_4x_60cm", height: 60, note: "Sold in sets of 4." },
  { no: "452013", name: "Stairville Tour Stage Leg 80cm", short: "Legs 80cm", group: "support", page: "stairville_tour_stage_leg_set_of_4x_80cm", height: 80, note: "Sold in sets of 4." },
  { no: "452009", name: "Stairville Tour Stage Leg 100cm", short: "Legs 100cm", group: "support", page: "stairville_tour_stage_leg_set_of_4x_100cm", height: 100, note: "Sold in sets of 4." },
  { no: "452331", name: "Stairville Tour Stage Tele Leg 40-60cm", short: "Tele 40–60", group: "support", page: "stairville_tourstage_tele_leg_4x_40_60cm", minHeight: 40, maxHeight: 60, note: "Sold in sets of 4." },
  { no: "452332", name: "Stairville Tour Stage Tele Leg 60-100cm", short: "Tele 60–100", group: "support", page: "stairville_tourstage_tele_leg_4x_60_100cm", minHeight: 60, maxHeight: 100, note: "Sold in sets of 4." },
  { no: "452333", name: "Stairville Tour Stage Tele Leg 80-140cm", short: "Tele 80–140", group: "support", minHeight: 80, maxHeight: 140, note: "Sold in sets of 4." },
  { no: "368986", name: "Stairville Tour Stage Leg Wheel 30cm", short: "Wheels 30cm", group: "support", page: "stairville_tour_stage_leg_wheel_30_cm", height: 30, wheel: true, note: "Braked castor. Makes a single platform mobile; for joined platforms use Rollriser wheels." },
  { no: "368984", name: "Stairville Tour Stage Leg Wheel 40cm", short: "Wheels 40cm", group: "support", height: 40, wheel: true, note: "Braked castor. Makes a single platform mobile; for joined platforms use Rollriser wheels." },
  { no: "439958", name: "Stairville Tour Stage Rollriser Wheel 1", short: "Rollriser 1", group: "support", page: "stairville_tour_stage_rollriser_wheel_1", weight: 2, note: "Goes under one leg, adds 13cm." },
  { no: "439965", name: "Stairville Tour Stage Rollriser Wheel 2", short: "Rollriser 2", group: "support", page: "stairville_tour_stage_rollriser_wheel_2", weight: 2.7, note: "Goes under two neighbouring legs, adds 13cm." },

  // Handrails
  { no: "485819", name: "Stairville Tour Stage Handrail 2m Mk2 Bk", short: "Rail 2m", group: "rail", page: "stairville_tour_stage_handrail_2m_mk2_bk", weight: 4.5, w: 200, note: "Includes two mounting brackets." },
  { no: "485812", name: "Stairville Tour Stage Handrail 1m Mk2 Bk", short: "Rail 1m", group: "rail", page: "stairville_tour_stage_handrail_1m_mk2_bk", weight: 2.8, w: 100, note: "Includes two mounting brackets." },
  { no: "485811", name: "Stairville Tour Stage Handrail Clamp Bk", short: "Rail clamp", group: "rail-acc", page: "stairville_tour_stage_handrail_clamp_bk", weight: 0.81, note: "Joins two neighbouring handrails." },
  { no: "499258", name: "Stairville Tour Stage Railing Holder 2 Bk", short: "Railing holder", group: "rail-acc", page: "stairville_tour_stage_railing_holder_2_bk", weight: 0.7, note: "Spare: every handrail comes with two." },

  // Connectors
  { no: "571346", name: "Stairville Tour Stage Assembly Clamp", short: "Assembly clamp", group: "connector", page: "stairville_tour_stage_assembly_clamp_4x", weight: 0.34, also: [["571345", "Pack of 10"], ["571344", "Pack of 20"]], note: "Frame connector holding neighbouring platforms together. Sold in packs of 4, 10 or 20." },
  { no: "520324", name: "Stairville Tour Stage Self Leveling insert", short: "Self-levelling", group: "connector", page: "stairville_tour_stage_self_leveling_4pcs", note: "Wedge inserts that stop height differences between joined platforms. Sold in packs of 4." },
  { no: "296473", name: "Stairville Tour Stage Leg Clamp 2", short: "Leg clamp 2", group: "connector", page: "stairville_tour_stage_leg_clamp_2", note: "Clamps two neighbouring legs." },
  { no: "296474", name: "Stairville Tour Stage Leg Clamp 4", short: "Leg clamp 4", group: "connector", page: "stairville_tour_stage_leg_clamp_4", note: "Clamps four neighbouring legs." },
  { no: "296477", name: "Stairville Tour/iX Stage Clamp Connector", short: "Clamp connector", group: "connector", also: [["480148", "Pack of 10"]], note: "Quick connector for the outside guide rails." },

  // Stairs
  { no: "467310", name: "Stairville iX/Tour Stage Stair 20cm", short: "Stair 20", group: "stair", page: "stairville_ix_tour_stage_stair_20cm", weight: 8.5 },
  { no: "366097", name: "Stairville iX/Tour Stage Stair 20/40cm", short: "Stair 20/40", group: "stair", page: "stairville_ix_tour_stage_stair_20_40cm", weight: 19.7 },
  { no: "448932", name: "Stairville iX/Tour Stage Stair Ext. 60cm", short: "Stair ext 60", group: "stair", weight: 12.2 },
  { no: "448936", name: "Stairville iX/Tour Stage Stair Ext. 80cm", short: "Stair ext 80", group: "stair", weight: 13.4 },
  { no: "296005", name: "Stairville Tour Stage VarioStair 40-60", short: "Vario 40–60", group: "stair", weight: 18 },
  { no: "296461", name: "Stairville Tour Stage VarioStair 60-100", short: "Vario 60–100", group: "stair", page: "stairville_tour_stage_variostair_60_100", weight: 29.9 },
  { no: "296465", name: "Stairville Tour Stage VarioStair 80-120", short: "Vario 80–120", group: "stair", page: "stairville_tour_stage_vario_stair_80_140", weight: 56 },
  { no: "442997", name: "Stairville Tour Stage VarioStair 100-140", short: "Vario 100–140", group: "stair", page: "stairville_tour_stage_variostair_100_140", weight: 51 },
  { no: "485805", name: "Stairville iX/Tour Stage Stair Handrail B", short: "iX stair rail", group: "stair-acc", page: "stairville_ix_tour_stage_stair_handrail_bk", weight: 2.7, note: "For the modular stairs with 3 or more steps." },
  { no: "591999", name: "Stairville Tour Stage VarioStair Rail Bk", short: "Vario stair rail", group: "stair-acc", page: "stairville_tour_stage_variostair_rail_bk", weight: 3.8 },
  { no: "296468", name: "Stairville Tour Stage VarioStair Handrail", short: "Vario stair rail (silver)", group: "stair-acc", page: "stairville_tour_stage_stair_handrail", weight: 3.8 },
  { no: "499264", name: "Stairville Tour Stage Railing Holder 3 Bk", short: "Stair railing holder", group: "stair-acc", page: "stairville_tour_stage_railing_holder_3_bk", weight: 0.5, note: "Spare holder for the 3-step modular stair handrail." },

];

export const ITEMS: Record<string, Item> = Object.fromEntries(CATALOGUE.map((i) => [i.no, i]));

export const item = (no: string): Item | undefined => ITEMS[no];

export const thomannUrl = (it: Pick<Item, "no" | "page">) =>
  it.page ? `https://www.thomann.co.uk/${it.page}.htm` : `https://www.thomann.co.uk/search_dir.html?sw=${it.no}`;

export const imageUrl = (no: string) => `https://thumbs.static-thomann.de/thumb/thumb220x220/pics/prod/${no}.jpg`;

/** Pieces a first-time user starts with (the original kit). Everything else starts at 0. */
export const DEFAULT_INVENTORY: Record<string, number> = {
  "295737": 10, "295854": 2,
  "458589": 52, "452012": 20, "368986": 8,
  "485819": 7, "485812": 2, "485811": 8, "499258": 1,
  "571346": 20, "520324": 48, "296474": 4, "296473": 6,
};

/** Version 1 files counted packs; these were their sizes, and pack items that are now one part. */
export const V1_PACKS: Record<string, [string, number]> = {
  "452010": ["452010", 4], "458589": ["458589", 4], "452011": ["452011", 4], "458591": ["458591", 4], "452012": ["452012", 4],
  "452013": ["452013", 4], "452009": ["452009", 4], "452331": ["452331", 4], "452332": ["452332", 4], "452333": ["452333", 4],
  "571344": ["571346", 20], "571345": ["571346", 10], "571346": ["571346", 4], "520324": ["520324", 4], "480148": ["296477", 10],
};

/** Stair builds: which catalogue items make them, the stage heights they suit and their footprint. */
export interface StairKind {
  id: string;
  label: string;
  /** Title for the palette card. */
  short: string;
  items: string[];
  minHeight: number;
  maxHeight: number;
  w: number;
  /** Depth out from the stage edge (approximate for the Vario stairs). */
  d: number;
  /** Handrail item that fits, if any. */
  rail?: string;
}

export const STAIRS: StairKind[] = [
  { id: "ix-1", label: "iX/Tour Stair 20cm (1 step)", short: "iX stair, 1 step", items: ["467310"], minHeight: 30, maxHeight: 40, w: 99, d: 35 },
  { id: "ix-2", label: "iX/Tour Stair 20/40cm (2 steps)", short: "iX stair, 2 steps", items: ["366097"], minHeight: 50, maxHeight: 60, w: 99, d: 68 },
  { id: "ix-3", label: "iX/Tour Stair 20/40 + Ext. 60 (3 steps)", short: "iX stair, 3 steps", items: ["366097", "448932"], minHeight: 70, maxHeight: 80, w: 99, d: 103, rail: "485805" },
  { id: "ix-4", label: "iX/Tour Stair 20/40 + Ext. 60 + Ext. 80 (4 steps)", short: "iX stair, 4 steps", items: ["366097", "448932", "448936"], minHeight: 90, maxHeight: 100, w: 99, d: 138, rail: "485805" },
  { id: "vario-40", label: "VarioStair 40–60", short: "VarioStair 40–60", items: ["296005"], minHeight: 40, maxHeight: 60, w: 78, d: 75, rail: "591999" },
  { id: "vario-60", label: "VarioStair 60–100", short: "VarioStair 60–100", items: ["296461"], minHeight: 60, maxHeight: 100, w: 78, d: 120, rail: "591999" },
  { id: "vario-80", label: "VarioStair 80–120", short: "VarioStair 80–120", items: ["296465"], minHeight: 80, maxHeight: 120, w: 78, d: 150, rail: "591999" },
  { id: "vario-100", label: "VarioStair 100–140", short: "VarioStair 100–140", items: ["442997"], minHeight: 100, maxHeight: 140, w: 75, d: 180, rail: "591999" },
];

export const STAIR_KINDS: Record<string, StairKind> = Object.fromEntries(STAIRS.map((s) => [s.id, s]));

export const PLATFORM_THICKNESS = 9;
export const ROLLRISER_HEIGHT = 13;
/** Support id meaning "no legs, platform straight on the floor". */
export const FLOOR = "floor";
