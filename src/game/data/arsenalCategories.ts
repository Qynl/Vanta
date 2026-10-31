export const ARSENAL_CATEGORY_IDS = [
  "assault",
  "smg",
  "shotgun",
  "sniper",
  "marksman",
  "pistol",
  "energy",
  "heavy",
  "experimental",
  "melee",
] as const;

export type ArsenalCategoryId = (typeof ARSENAL_CATEGORY_IDS)[number];

export interface ArsenalCategory {
  id: ArsenalCategoryId;
  code: string;
  name: string;
  role: string;
  description: string;
  slot: "PRIMARY" | "SECONDARY" | "MELEE";
  systems: number;
}

export const ARSENAL_CATEGORIES = [
  {
    id: "assault",
    code: "AR",
    name: "ASSAULT",
    role: "LINE CONTROL",
    description:
      "Sustained automatic fire for every range band. The backbone of a committed push.",
    slot: "PRIMARY",
    systems: 6,
  },
  {
    id: "smg",
    code: "SMG",
    name: "SUB-MACHINE",
    role: "CLOSE PRESSURE",
    description:
      "High cadence, fast handling. Built to keep momentum alive through tight routes.",
    slot: "PRIMARY",
    systems: 6,
  },
  {
    id: "shotgun",
    code: "SG",
    name: "SHOTGUN",
    role: "BREACH",
    description:
      "Close-range pressure with real one-shot threat and tools for forcing space.",
    slot: "PRIMARY",
    systems: 6,
  },
  {
    id: "sniper",
    code: "SR",
    name: "SNIPER",
    role: "PRECISION",
    description:
      "One angle, one decision. Hold sightlines and punish exposed rotations.",
    slot: "PRIMARY",
    systems: 6,
  },
  {
    id: "marksman",
    code: "MR",
    name: "MARKSMAN",
    role: "RANGE CONTROL",
    description:
      "Controlled semi-auto damage that bridges rifle pressure and sniper reach.",
    slot: "PRIMARY",
    systems: 6,
  },
  {
    id: "pistol",
    code: "PST",
    name: "PISTOL",
    role: "SIDEARM",
    description:
      "Reliable backups with infinite reserve. Never disarmed, never comfortable.",
    slot: "SECONDARY",
    systems: 6,
  },
  {
    id: "energy",
    code: "EN",
    name: "ENERGY",
    role: "SYSTEM SHIFT",
    description:
      "Heat, arcs, shield disruption and beams. Tools that change how a fight is fought.",
    slot: "PRIMARY",
    systems: 6,
  },
  {
    id: "heavy",
    code: "HV",
    name: "HEAVY",
    role: "SUPPRESSION",
    description:
      "Spin-up, splash and payloads. Area denial purchased with mobility.",
    slot: "PRIMARY",
    systems: 6,
  },
  {
    id: "experimental",
    code: "EX",
    name: "EXPERIMENTAL",
    role: "PROTOTYPE",
    description:
      "Gravity, fire, ricochet and charge. Unstable ideas with lethal applications.",
    slot: "PRIMARY",
    systems: 6,
  },
  {
    id: "melee",
    code: "ME",
    name: "MELEE",
    role: "ZERO RANGE",
    description:
      "Fast finishers, wide arcs and stuns for when the fight closes to contact.",
    slot: "MELEE",
    systems: 6,
  },
] as const satisfies readonly ArsenalCategory[];

export const WEAPON_COUNT = ARSENAL_CATEGORIES.reduce(
  (total, category) => total + category.systems,
  0,
);
