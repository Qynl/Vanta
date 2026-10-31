import RAPIER from "@dimforge/rapier3d-compat";
import { beforeAll, describe, expect, it } from "vitest";

import {
  buildStaticColliderDescs,
  createRampColliderDesc,
} from "@/game/sim/physics/ColliderKit";
import { initPhysics } from "@/game/sim/physics/PhysicsWorld";

describe("collider kit", () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it("builds box, ramp and cylinder descriptors", () => {
    const built = buildStaticColliderDescs([
      {
        id: "box",
        kind: "box",
        position: { x: 1, y: 2, z: 3 },
        size: { x: 2, y: 4, z: 6 },
      },
      {
        id: "ramp",
        kind: "ramp",
        position: { x: 0, y: 0, z: 0 },
        width: 4,
        length: 6,
        height: 1.5,
      },
      {
        id: "column",
        kind: "cylinder",
        position: { x: -2, y: 1, z: 0 },
        radius: 0.75,
        height: 2,
      },
    ]);

    expect(built.map(({ id }) => id)).toEqual([
      "box",
      "ramp",
      "column",
    ]);
    expect(built[0]?.desc.shape.type).toBe(RAPIER.ShapeType.Cuboid);
    expect(built[0]?.desc.translation).toEqual({ x: 1, y: 2, z: 3 });
    expect(built[1]?.desc.shape.type).toBe(
      RAPIER.ShapeType.ConvexPolyhedron,
    );
    expect(built[2]?.desc.shape.type).toBe(RAPIER.ShapeType.Cylinder);
  });

  it("applies yaw as a Y-axis quaternion", () => {
    const [box] = buildStaticColliderDescs([
      {
        id: "rotated",
        kind: "box",
        position: { x: 0, y: 0, z: 0 },
        yaw: Math.PI / 2,
        size: { x: 1, y: 1, z: 1 },
      },
    ]);

    expect(box?.desc.rotation.y).toBeCloseTo(Math.SQRT1_2, 6);
    expect(box?.desc.rotation.w).toBeCloseTo(Math.SQRT1_2, 6);
  });

  it("expands stairs into solid, contiguous steps", () => {
    const built = buildStaticColliderDescs([
      {
        id: "steps",
        kind: "stairs",
        position: { x: 2, y: 1, z: 10 },
        width: 3,
        steps: 5,
        rise: 0.25,
        run: 0.4,
      },
    ]);

    expect(built).toHaveLength(5);
    expect(built.map(({ id }) => id)).toEqual([
      "steps:step-1",
      "steps:step-2",
      "steps:step-3",
      "steps:step-4",
      "steps:step-5",
    ]);
    expect(built[0]?.desc.translation?.z).toBeCloseTo(9.2, 6);
    expect(built[4]?.desc.translation?.z).toBeCloseTo(10.8, 6);
    expect(built[4]?.desc.translation?.y).toBeCloseTo(1.625, 6);
  });

  it("rejects degenerate dimensions", () => {
    expect(() => createRampColliderDesc(4, 0, 1)).toThrow();
    expect(() =>
      buildStaticColliderDescs([
        {
          id: "bad",
          kind: "box",
          position: { x: 0, y: 0, z: 0 },
          size: { x: 1, y: 0, z: 1 },
        },
      ]),
    ).toThrow();
    expect(() =>
      buildStaticColliderDescs([
        {
          id: "bad-stairs",
          kind: "stairs",
          position: { x: 0, y: 0, z: 0 },
          width: 2,
          steps: 0,
          rise: 0.2,
          run: 0.3,
        },
      ]),
    ).toThrow();
  });
});
