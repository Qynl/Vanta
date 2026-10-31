import { beforeAll, describe, expect, it } from "vitest";

import { PhysicsDebugWireframes } from "@/client/render/debug/PhysicsDebug";
import type { StaticCourseLayout } from "@/game/data/maps/kit/colliders";
import { initPhysics, PhysicsWorld } from "@/game/sim/physics/PhysicsWorld";
import { compileStaticCourse } from "@/game/sim/physics/StaticCourse";

const SINGLE_BOX: StaticCourseLayout = {
  id: "debug-box",
  name: "Debug box",
  colliders: [
    {
      id: "box",
      kind: "box",
      position: { x: 0, y: 0, z: 0 },
      size: { x: 2, y: 2, z: 2 },
    },
  ],
};

describe("physics debug wireframes", () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it("builds line geometry from the live collider bounds", async () => {
    const physics = await PhysicsWorld.create();
    const course = compileStaticCourse(physics.world, SINGLE_BOX);
    const wireframes = new PhysicsDebugWireframes();

    try {
      physics.step();
      wireframes.update(physics.world);

      const positions =
        wireframes.object.geometry.getAttribute("position");
      const colors = wireframes.object.geometry.getAttribute("color");

      expect(positions.count).toBeGreaterThan(0);
      expect(colors.count).toBe(positions.count);

      for (let index = 0; index < positions.count; index += 1) {
        expect(positions.getX(index)).toBeGreaterThanOrEqual(-1.001);
        expect(positions.getX(index)).toBeLessThanOrEqual(1.001);
        expect(positions.getY(index)).toBeGreaterThanOrEqual(-1.001);
        expect(positions.getY(index)).toBeLessThanOrEqual(1.001);
        expect(positions.getZ(index)).toBeGreaterThanOrEqual(-1.001);
        expect(positions.getZ(index)).toBeLessThanOrEqual(1.001);
      }

      expect(wireframes.visible).toBe(false);
      wireframes.setVisible(true);
      expect(wireframes.object.visible).toBe(true);
    } finally {
      wireframes.dispose();
      course.dispose();
      physics.dispose();
    }
  });

  it("refuses to update after disposal", async () => {
    const physics = await PhysicsWorld.create();
    const wireframes = new PhysicsDebugWireframes();

    wireframes.dispose();
    expect(() => wireframes.update(physics.world)).toThrow();

    physics.dispose();
  });
});
