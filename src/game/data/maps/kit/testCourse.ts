import type { StaticCourseLayout } from "./colliders";

/**
 * Deterministic headless course for the M3 physics gate. It runs along +Z:
 * flat ground -> ramp -> upper deck -> 2 m gap -> landing -> stairs -> high deck.
 */
export const PHYSICS_TEST_COURSE: StaticCourseLayout = {
  id: "physics-test-course",
  name: "Collider qualification lane",
  colliders: [
    {
      id: "start-ground",
      kind: "box",
      position: { x: 0, y: -0.5, z: -10 },
      size: { x: 6, y: 1, z: 16 },
    },
    {
      id: "ramp",
      kind: "ramp",
      position: { x: 0, y: 0, z: 0 },
      width: 5.4,
      length: 4,
      height: 1.2,
    },
    {
      id: "upper-deck",
      kind: "box",
      position: { x: 0, y: 1, z: 5 },
      size: { x: 6, y: 0.4, z: 6 },
    },
    {
      id: "gap-catch",
      kind: "box",
      position: { x: 0, y: -2.9, z: 9 },
      size: { x: 6, y: 1, z: 2 },
    },
    {
      id: "landing",
      kind: "box",
      position: { x: 0, y: 1, z: 13 },
      size: { x: 6, y: 0.4, z: 6 },
    },
    {
      id: "stairs",
      kind: "stairs",
      position: { x: 0, y: 1.2, z: 17.05 },
      width: 4,
      steps: 5,
      rise: 0.26,
      run: 0.42,
    },
    {
      id: "high-deck",
      kind: "box",
      position: { x: 0, y: 2.3, z: 20.6 },
      size: { x: 6, y: 0.4, z: 5 },
    },
    {
      id: "sightline-column",
      kind: "cylinder",
      position: { x: 8, y: 1.4, z: 5 },
      radius: 0.7,
      height: 2.8,
    },
  ],
};
