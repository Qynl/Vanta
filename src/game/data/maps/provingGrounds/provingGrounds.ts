import type {
  ColliderVector3,
  StaticCourseLayout,
} from "@/game/data/maps/kit/colliders";

/**
 * M5's training campus is lifted above the staging district. The target gallery
 * runs straight ahead from spawn; the movement qualification wing is west and
 * the blocked-out M6 flow lanes are east.
 */
export const PROVING_GROUNDS_ORIGIN = {
  x: -28,
  y: 8,
  z: 46,
} as const;

export const PROVING_GROUNDS_SPAWN = {
  x: PROVING_GROUNDS_ORIGIN.x,
  y: PROVING_GROUNDS_ORIGIN.y + 0.91,
  z: PROVING_GROUNDS_ORIGIN.z - 18,
} as const;

export const PROVING_GROUNDS_YAW = Math.PI;
export const PROVING_GROUNDS_FALL_Y = PROVING_GROUNDS_ORIGIN.y - 1;

export interface ProvingGroundsTargetDefinition {
  readonly id: string;
  readonly name: string;
  /** Feet position in world space. */
  readonly position: ColliderVector3;
  readonly yaw: number;
}

export interface ProvingGroundsHazardDefinition {
  readonly id: string;
  readonly label: string;
  /** Floor position in world space. */
  readonly position: ColliderVector3;
  readonly radius: number;
  readonly height: number;
}

export interface PickupAnchorDefinition {
  readonly id: string;
  readonly position: ColliderVector3;
}

function target(
  id: string,
  name: string,
  x: number,
  z: number,
): ProvingGroundsTargetDefinition {
  return {
    id,
    name,
    position: {
      x: PROVING_GROUNDS_ORIGIN.x + x,
      y: PROVING_GROUNDS_ORIGIN.y,
      z: PROVING_GROUNDS_ORIGIN.z + z,
    },
    yaw: Math.PI,
  };
}

function hazard(
  id: string,
  label: string,
  x: number,
  z: number,
  radius: number,
  height: number,
): ProvingGroundsHazardDefinition {
  return {
    id,
    label,
    position: {
      x: PROVING_GROUNDS_ORIGIN.x + x,
      y: PROVING_GROUNDS_ORIGIN.y,
      z: PROVING_GROUNDS_ORIGIN.z + z,
    },
    radius,
    height,
  };
}

export const PROVING_GROUNDS_TARGETS: readonly ProvingGroundsTargetDefinition[] = [
  target("target_cqc", "T-01 / CQC", -3.5, -0.5),
  target("target_mid", "T-02 / MID", 4, 6),
  target("target_long", "T-03 / LONG", -1, 15),
];

export const PROVING_GROUNDS_HAZARDS: readonly ProvingGroundsHazardDefinition[] = [
  hazard(
    "hazard_calibration",
    "Damage calibration",
    7,
    -2.5,
    1.2,
    2.4,
  ),
];

/**
 * Reserved placement data for the M8 pickup compiler. Nothing is rendered or
 * granted in M5, so these anchors cannot be mistaken for live pickups.
 */
export const PROVING_GROUNDS_PICKUP_ANCHORS: readonly PickupAnchorDefinition[] = [
  {
    id: "pg_anchor_west",
    position: {
      x: PROVING_GROUNDS_ORIGIN.x - 7.5,
      y: PROVING_GROUNDS_ORIGIN.y,
      z: PROVING_GROUNDS_ORIGIN.z + 9,
    },
  },
  {
    id: "pg_anchor_east",
    position: {
      x: PROVING_GROUNDS_ORIGIN.x + 28,
      y: PROVING_GROUNDS_ORIGIN.y,
      z: PROVING_GROUNDS_ORIGIN.z + 10,
    },
  },
];

export const PROVING_GROUNDS: StaticCourseLayout = {
  id: "sector-09-proving-grounds",
  name: "Sector 09 proving grounds",
  origin: PROVING_GROUNDS_ORIGIN,
  colliders: [
    // Spawn hub and target gallery.
    {
      id: "spawn-deck",
      kind: "box",
      position: { x: 0, y: -0.5, z: -14 },
      size: { x: 18, y: 1, z: 16 },
    },
    {
      id: "target-deck",
      kind: "box",
      position: { x: 0, y: -0.5, z: 7 },
      size: { x: 20, y: 1, z: 26 },
    },
    {
      id: "target-backstop",
      kind: "box",
      position: { x: 0, y: 2, z: 21 },
      size: { x: 20, y: 4, z: 1 },
    },

    // Movement qualification wing (M3/M4 layout, translated west).
    {
      id: "course-bridge",
      kind: "box",
      position: { x: -12, y: -0.5, z: -12 },
      size: { x: 6, y: 1, z: 4 },
    },
    {
      id: "start-ground",
      kind: "box",
      position: { x: -18, y: -0.5, z: -7 },
      size: { x: 6, y: 1, z: 14 },
    },
    {
      id: "ramp",
      kind: "ramp",
      position: { x: -18, y: 0, z: 2 },
      width: 5.4,
      length: 4,
      height: 1.2,
    },
    {
      id: "upper-deck",
      kind: "box",
      position: { x: -18, y: 1, z: 7 },
      size: { x: 6, y: 0.4, z: 6 },
    },
    {
      id: "gap-catch",
      kind: "box",
      position: { x: -18, y: -2.9, z: 11 },
      size: { x: 6, y: 1, z: 2 },
    },
    {
      id: "landing",
      kind: "box",
      position: { x: -18, y: 1, z: 15 },
      size: { x: 6, y: 0.4, z: 6 },
    },
    {
      id: "stairs",
      kind: "stairs",
      position: { x: -18, y: 1.2, z: 19.05 },
      width: 4,
      steps: 5,
      rise: 0.26,
      run: 0.42,
    },
    {
      id: "high-deck",
      kind: "box",
      position: { x: -18, y: 2.3, z: 22.6 },
      size: { x: 6, y: 0.4, z: 5 },
    },

    // M6 flow-lab greybox: wall-run corridor, low slide roof, traversal gap
    // and a separate landing island. The geometry is real; the FLOW mechanics
    // that will exploit it land in M6.
    {
      id: "flow-deck",
      kind: "box",
      position: { x: 18, y: -0.5, z: 10 },
      size: { x: 9, y: 1, z: 16 },
    },
    {
      id: "wall-run-west",
      kind: "box",
      position: { x: 15.5, y: 1.2, z: 10 },
      size: { x: 0.25, y: 2.4, z: 12 },
    },
    {
      id: "wall-run-east",
      kind: "box",
      position: { x: 21.5, y: 1.2, z: 10 },
      size: { x: 0.25, y: 2.4, z: 12 },
    },
    {
      id: "slide-roof",
      kind: "box",
      position: { x: 18.5, y: 1.75, z: 13 },
      size: { x: 6, y: 0.5, z: 4.5 },
    },
    {
      id: "dash-island",
      kind: "box",
      position: { x: 28, y: -0.5, z: 10 },
      size: { x: 6, y: 1, z: 16 },
    },
  ],
};
