// The Stairville Tour Stage range as sold by Thomann. Prices (GBP, inc. VAT) and weights were copied
// from thomann.co.uk and the Tour Stage assembly instructions in 2026; treat them as approximate.

export type Group = "platform" | "support" | "rail" | "rail-acc" | "connector" | "stair" | "stair-acc" | "transport" | "spare";

export const GROUP_LABELS: Record<Group, string> = {
  platform: "Platforms",
  support: "Legs & wheels",
  rail: "Handrails",
  "rail-acc": "Handrail accessories",
  connector: "Connectors",
  stair: "Stairs",
  "stair-acc": "Stair accessories",
  transport: "Transport",
  spare: "Spares",
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
  price?: number;
  /** kg per pack */
  weight?: number;
  /** Pieces per pack (leg sets of 4, clamp packs…). Inventory counts packs; plans count pieces. */
  pack?: number;
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
  { no: "295737", name: "Stairville Tour Stage Platform 2x1m ODW", short: "2x1", group: "platform", page: "stairville_tour_stage_platform_2x1_m_odw", price: 309, weight: 33, shape: "rect", w: 200, d: 100, rated: true },
  { no: "462002", name: "Stairville Tour Stage Platform 1,5x1m ODW", short: "1.5x1", group: "platform", page: "stairville_tour_stage_platform_15x1m_odw", price: 264, weight: 27, shape: "rect", w: 150, d: 100 },
  { no: "295854", name: "Stairville Tour Stage Platform 1x1m ODW", short: "1x1", group: "platform", page: "stairville_tour_stage_platform_1x1_m_odw", price: 225, weight: 17.7, shape: "rect", w: 100, d: 100, rated: true },
  { no: "448737", name: "Stairville Tour Stage Platform 2x0.5m ODW", short: "2x0.5", group: "platform", page: "stairville_tour_stage_platform_2x0.5m_odw", price: 235, weight: 19, shape: "rect", w: 200, d: 50 },
  { no: "519650", name: "Stairville Tour Stage Platf. 1,5x0,5m ODW", short: "1.5x0.5", group: "platform", page: "stairville_tour_stage_platf._15x05m_odw", price: 213, weight: 16, shape: "rect", w: 150, d: 50 },
  { no: "448742", name: "Stairville Tour Stage Platform 1x0.5m ODW", short: "1x0.5", group: "platform", page: "stairville_tour_stage_platform_1x0.5m_odw", price: 159, weight: 12, shape: "rect", w: 100, d: 50 },
  { no: "443327", name: "Stairville Tour Stage Triangle 1x1m ODW", short: "Tri 1x1", group: "platform", page: "stairville_tour_stage_triangle_1x1m_odw", price: 161, weight: 11.5, shape: "tri-l", w: 100, d: 100 },
  { no: "443325", name: "Stairville Tour Stage Triangle 2x1m L ODW", short: "Tri 2x1 L", group: "platform", page: "stairville_tour_stage_triangle_2x1m_l_odw", price: 252, weight: 26.5, shape: "tri-l", w: 200, d: 100 },
  { no: "443326", name: "Stairville Tour Stage Triangle 2x1m R ODW", short: "Tri 2x1 R", group: "platform", page: "stairville_tour_stage_triangle_2x1m_r_odw", price: 252, weight: 26.5, shape: "tri-r", w: 200, d: 100 },
  { no: "464993", name: "Stairville Tour Stage Circular 1x1m ODW", short: "Circ 1x1", group: "platform", page: "stairville_tour_stage_circular_1x1m_odw", price: 230, weight: 15, shape: "quarter", w: 100, d: 100 },

  // Legs and wheels
  { no: "452010", name: "Stairville Tour Stage Leg Set of 4x 20cm", short: "Legs 20cm", group: "support", page: "stairville_tour_stage_leg_set_of_4x_20cm", price: 23.9, pack: 4, height: 20 },
  { no: "458589", name: "Stairville Tour Stage Leg Set of 4x 30cm", short: "Legs 30cm", group: "support", page: "stairville_tour_stage_leg_set_of_4x_30cm", price: 30, pack: 4, height: 30 },
  { no: "452011", name: "Stairville Tour Stage Leg Set of 4x 40cm", short: "Legs 40cm", group: "support", page: "stairville_tour_stage_leg_set_of_4x_40cm", price: 34, pack: 4, height: 40 },
  { no: "458591", name: "Stairville Tour Stage Leg Set of 4x 50cm", short: "Legs 50cm", group: "support", page: "stairville_tour_stage_leg_set_of_4x_50cm", pack: 4, height: 50 },
  { no: "452012", name: "Stairville Tour Stage Leg Set of 4x 60cm", short: "Legs 60cm", group: "support", page: "stairville_tour_stage_leg_set_of_4x_60cm", price: 44, pack: 4, height: 60 },
  { no: "452013", name: "Stairville Tour Stage Leg Set of 4x 80cm", short: "Legs 80cm", group: "support", page: "stairville_tour_stage_leg_set_of_4x_80cm", pack: 4, height: 80 },
  { no: "452009", name: "Stairville Tour Stage Leg Set of 4x 100cm", short: "Legs 100cm", group: "support", page: "stairville_tour_stage_leg_set_of_4x_100cm", pack: 4, height: 100 },
  { no: "452331", name: "Stairville Tour Stage Tele Leg 4x 40-60cm", short: "Tele 40–60", group: "support", page: "stairville_tourstage_tele_leg_4x_40_60cm", price: 101, pack: 4, minHeight: 40, maxHeight: 60 },
  { no: "452332", name: "Stairville Tour Stage Tele Leg 4x 60-100cm", short: "Tele 60–100", group: "support", page: "stairville_tourstage_tele_leg_4x_60_100cm", pack: 4, minHeight: 60, maxHeight: 100 },
  { no: "452333", name: "Stairville Tour Stage Tele Leg 4x 80-140cm", short: "Tele 80–140", group: "support", pack: 4, minHeight: 80, maxHeight: 140 },
  { no: "368986", name: "Stairville Tour Stage Leg Wheel 30cm", short: "Wheels 30cm", group: "support", page: "stairville_tour_stage_leg_wheel_30_cm", price: 35, height: 30, wheel: true, note: "Braked castor. Makes a single platform mobile; for joined platforms use Rollriser wheels." },
  { no: "368984", name: "Stairville Tour Stage Leg Wheel 40cm", short: "Wheels 40cm", group: "support", height: 40, wheel: true, note: "Braked castor. Makes a single platform mobile; for joined platforms use Rollriser wheels." },
  { no: "439958", name: "Stairville Tour Stage Rollriser Wheel 1", short: "Rollriser 1", group: "support", page: "stairville_tour_stage_rollriser_wheel_1", price: 49, weight: 2, note: "Goes under one leg, adds 13cm." },
  { no: "439965", name: "Stairville Tour Stage Rollriser Wheel 2", short: "Rollriser 2", group: "support", page: "stairville_tour_stage_rollriser_wheel_2", price: 66, weight: 2.7, note: "Goes under two neighbouring legs, adds 13cm." },

  // Handrails
  { no: "485819", name: "Stairville Tour Stage Handrail 2m Mk2 Bk", short: "Rail 2m", group: "rail", page: "stairville_tour_stage_handrail_2m_mk2_bk", price: 135, weight: 4.5, w: 200, note: "Includes two mounting brackets." },
  { no: "485812", name: "Stairville Tour Stage Handrail 1m Mk2 Bk", short: "Rail 1m", group: "rail", page: "stairville_tour_stage_handrail_1m_mk2_bk", price: 119, weight: 2.8, w: 100, note: "Includes two mounting brackets." },
  { no: "485811", name: "Stairville Tour Stage Handrail Clamp Bk", short: "Rail clamp", group: "rail-acc", page: "stairville_tour_stage_handrail_clamp_bk", price: 19.6, weight: 0.81, note: "Joins two neighbouring handrails." },
  { no: "499258", name: "Stairville Tour Stage Railing Holder 2 Bk", short: "Railing holder", group: "rail-acc", page: "stairville_tour_stage_railing_holder_2_bk", price: 22, weight: 0.7, note: "Spare: every handrail comes with two." },

  // Connectors
  { no: "571344", name: "Stairville Tour Stage Assembly Clamp 20x Pack", short: "Assembly clamp", group: "connector", price: 109, weight: 6.8, pack: 20, note: "Frame connector holding neighbouring platforms together." },
  { no: "571345", name: "Stairville Tour Stage Assembly Clamp 10x", short: "Assembly clamp", group: "connector", weight: 3.4, pack: 10, note: "Frame connector holding neighbouring platforms together." },
  { no: "571346", name: "Stairville Tour Stage Assembly Clamp 4x", short: "Assembly clamp", group: "connector", page: "stairville_tour_stage_assembly_clamp_4x", price: 23.9, weight: 1.36, pack: 4, note: "Frame connector holding neighbouring platforms together." },
  { no: "520324", name: "Stairville Tour Stage Self Leveling 4pcs.", short: "Self-levelling", group: "connector", page: "stairville_tour_stage_self_leveling_4pcs", price: 7.6, pack: 4, note: "Wedge inserts that stop height differences between joined platforms." },
  { no: "296473", name: "Stairville Tour Stage Leg Clamp 2", short: "Leg clamp 2", group: "connector", page: "stairville_tour_stage_leg_clamp_2", price: 7.7, note: "Clamps two neighbouring legs." },
  { no: "296474", name: "Stairville Tour Stage Leg Clamp 4", short: "Leg clamp 4", group: "connector", page: "stairville_tour_stage_leg_clamp_4", price: 15.9, note: "Clamps four neighbouring legs." },
  { no: "296477", name: "Stairville Tour/iX Stage Clamp Connector", short: "Clamp connector", group: "connector", note: "Quick connector for the outside guide rails." },
  { no: "480148", name: "Stairville Tour/iX Stage Clamp Conn. 10x", short: "Clamp connector", group: "connector", pack: 10, note: "Quick connector for the outside guide rails." },

  // Stairs
  { no: "467310", name: "Stairville iX/Tour Stage Stair 20cm", short: "Stair 20", group: "stair", page: "stairville_ix_tour_stage_stair_20cm", price: 125, weight: 8.5 },
  { no: "366097", name: "Stairville iX/Tour Stage Stair 20/40cm", short: "Stair 20/40", group: "stair", page: "stairville_ix_tour_stage_stair_20_40cm", price: 175, weight: 19.7 },
  { no: "448932", name: "Stairville iX/Tour Stage Stair Ext. 60cm", short: "Stair ext 60", group: "stair", weight: 12.2 },
  { no: "448936", name: "Stairville iX/Tour Stage Stair Ext. 80cm", short: "Stair ext 80", group: "stair", weight: 13.4 },
  { no: "296005", name: "Stairville Tour Stage VarioStair 40-60", short: "Vario 40–60", group: "stair", weight: 18 },
  { no: "296461", name: "Stairville Tour Stage VarioStair 60-100", short: "Vario 60–100", group: "stair", page: "stairville_tour_stage_variostair_60_100", price: 339, weight: 29.9 },
  { no: "296465", name: "Stairville Tour Stage VarioStair 80-120", short: "Vario 80–120", group: "stair", page: "stairville_tour_stage_vario_stair_80_140", price: 418, weight: 56 },
  { no: "442997", name: "Stairville Tour Stage VarioStair 100-140", short: "Vario 100–140", group: "stair", page: "stairville_tour_stage_variostair_100_140", price: 554, weight: 51 },
  { no: "485805", name: "Stairville iX/Tour Stage Stair Handrail B", short: "iX stair rail", group: "stair-acc", page: "stairville_ix_tour_stage_stair_handrail_bk", price: 170, weight: 2.7, note: "For the modular stairs with 3 or more steps." },
  { no: "591999", name: "Stairville Tour Stage VarioStair Rail Bk", short: "Vario stair rail", group: "stair-acc", page: "stairville_tour_stage_variostair_rail_bk", price: 119, weight: 3.8 },
  { no: "296468", name: "Stairville Tour Stage VarioStair Handrail", short: "Vario stair rail (silver)", group: "stair-acc", page: "stairville_tour_stage_stair_handrail", price: 90, weight: 3.8 },
  { no: "499264", name: "Stairville Tour Stage Railing Holder 3 Bk", short: "Stair railing holder", group: "stair-acc", page: "stairville_tour_stage_railing_holder_3_bk", price: 11, weight: 0.5, note: "Spare holder for the 3-step modular stair handrail." },

  // Transport
  { no: "473947", name: "Stageworx CargoBox", short: "CargoBox", group: "transport", page: "stageworx_cargobox", price: 525, weight: 49, note: "Carries up to 6 platforms upright." },
  { no: "237709", name: "Stairville Auto Ratchet Strap 300cm/50mm", short: "Ratchet strap", group: "transport", price: 19.9 },

  // Spares
  { no: "428876", name: "Stairville Tour Stage Alu Clamping Piece", short: "Alu clamping piece", group: "spare", page: "stairville_alu_clamping_piece_tour_stage", price: 2.55, note: "Spare clamping wedge for the leg sockets." },
];

export const ITEMS: Record<string, Item> = Object.fromEntries(CATALOGUE.map((i) => [i.no, i]));

export const item = (no: string): Item | undefined => ITEMS[no];

export const thomannUrl = (it: Item) =>
  it.page ? `https://www.thomann.co.uk/${it.page}.htm` : `https://www.thomann.co.uk/search_dir.html?sw=${it.no}`;

export const imageUrl = (no: string) => `https://thumbs.static-thomann.de/thumb/thumb220x220/pics/prod/${no}.jpg`;

/** Packs owned according to Thomann invoice 90373565 (24.06.2026). Everything else starts at 0. */
export const DEFAULT_INVENTORY: Record<string, number> = {
  "295737": 10, "295854": 2,
  "458589": 13, "452012": 5, "368986": 8,
  "485819": 7, "485812": 2, "485811": 8, "499258": 1,
  "571344": 1, "520324": 12, "296474": 4, "296473": 6,
  "428876": 4, "473947": 2, "237709": 2,
};

/** Stair builds: which catalogue items make them, the stage heights they suit and their footprint. */
export interface StairKind {
  id: string;
  label: string;
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
  { id: "ix-1", label: "iX/Tour Stair 20cm (1 step)", items: ["467310"], minHeight: 30, maxHeight: 40, w: 99, d: 35 },
  { id: "ix-2", label: "iX/Tour Stair 20/40cm (2 steps)", items: ["366097"], minHeight: 50, maxHeight: 60, w: 99, d: 68 },
  { id: "ix-3", label: "iX/Tour Stair 20/40 + Ext. 60 (3 steps)", items: ["366097", "448932"], minHeight: 70, maxHeight: 80, w: 99, d: 103, rail: "485805" },
  { id: "ix-4", label: "iX/Tour Stair 20/40 + Ext. 60 + Ext. 80 (4 steps)", items: ["366097", "448932", "448936"], minHeight: 90, maxHeight: 100, w: 99, d: 138, rail: "485805" },
  { id: "vario-40", label: "VarioStair 40–60", items: ["296005"], minHeight: 40, maxHeight: 60, w: 78, d: 75, rail: "591999" },
  { id: "vario-60", label: "VarioStair 60–100", items: ["296461"], minHeight: 60, maxHeight: 100, w: 78, d: 120, rail: "591999" },
  { id: "vario-80", label: "VarioStair 80–120", items: ["296465"], minHeight: 80, maxHeight: 120, w: 78, d: 150, rail: "591999" },
  { id: "vario-100", label: "VarioStair 100–140", items: ["442997"], minHeight: 100, maxHeight: 140, w: 75, d: 180, rail: "591999" },
];

export const STAIR_KINDS: Record<string, StairKind> = Object.fromEntries(STAIRS.map((s) => [s.id, s]));

export const PLATFORM_THICKNESS = 9;
export const ROLLRISER_HEIGHT = 13;
/** Support id meaning "no legs, platform straight on the floor". */
export const FLOOR = "floor";
