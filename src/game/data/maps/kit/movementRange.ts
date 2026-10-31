import { PHYSICS_TEST_COURSE } from "@/game/data/maps/kit/testCourse";
import type { StaticCourseLayout } from "@/game/data/maps/kit/colliders";

/**
 * The qualification lane is lifted above the staging district so a missed gap
 * reads as a fall rather than clipping through the arena floor. Physics and
 * renderer both consume this one layout/origin pair.
 */
export const MOVEMENT_RANGE_ORIGIN = {
  x: -28,
  y: 8,
  z: 46,
} as const;

export const MOVEMENT_RANGE_SPAWN = {
  x: MOVEMENT_RANGE_ORIGIN.x,
  y: MOVEMENT_RANGE_ORIGIN.y + 0.91,
  z: MOVEMENT_RANGE_ORIGIN.z - 15,
} as const;

export const MOVEMENT_RANGE_YAW = Math.PI;
export const MOVEMENT_RANGE_FALL_Y = MOVEMENT_RANGE_ORIGIN.y - 1;

export const MOVEMENT_RANGE: StaticCourseLayout = {
  ...PHYSICS_TEST_COURSE,
  id: "sector-09-movement-qualification",
  name: "Sector 09 movement qualification",
  origin: MOVEMENT_RANGE_ORIGIN,
};
