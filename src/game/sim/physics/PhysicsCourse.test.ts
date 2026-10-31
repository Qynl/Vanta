import RAPIER from "@dimforge/rapier3d-compat";
import { beforeAll, describe, expect, it } from "vitest";

import { PHYSICS_TEST_COURSE } from "@/game/data/maps/kit/testCourse";
import { KinematicCharacter } from "@/game/sim/physics/KinematicCharacter";
import { PHYSICS_GROUPS } from "@/game/sim/physics/layers";
import { initPhysics, PhysicsWorld } from "@/game/sim/physics/PhysicsWorld";
import { castRay, castShape } from "@/game/sim/physics/queries";
import { compileStaticCourse } from "@/game/sim/physics/StaticCourse";
import { runPhysicsCourse } from "@/test/physics/CourseHarness";

describe("headless physics course", () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it("traverses the ramp, jumps the gap and climbs the stairs", async () => {
    const physics = await PhysicsWorld.create();
    const course = compileStaticCourse(
      physics.world,
      PHYSICS_TEST_COURSE,
    );
    const character = new KinematicCharacter(physics.world, {
      position: { x: 0, y: 0.9, z: -15 },
    });

    try {
      const run = runPhysicsCourse({ physics, character });
      const final = run.samples.at(-1);

      expect(run.jumpTriggered).toBe(true);
      expect(run.landedAfterJump).toBe(true);
      expect(run.reachedEnd).toBe(true);
      expect(run.samples.length).toBeGreaterThan(400);
      expect(final).toBeDefined();
      expect(final?.z).toBeGreaterThanOrEqual(21.3);
      expect(final?.y).toBeCloseTo(3.42, 1);
      expect(final?.grounded).toBe(true);

      for (const sample of run.samples) {
        expect(Number.isFinite(sample.x)).toBe(true);
        expect(Number.isFinite(sample.y)).toBe(true);
        expect(Number.isFinite(sample.z)).toBe(true);
        expect(sample.y).toBeGreaterThan(0.8);
      }

      const flatStart = run.samples.filter(
        (sample) => sample.tick > 30 && sample.z < -2,
      );
      const landingDeck = run.samples.filter(
        (sample) =>
          sample.grounded && sample.z > 10.4 && sample.z < 15.5,
      );

      expect(flatStart.length).toBeGreaterThan(100);
      expect(landingDeck.length).toBeGreaterThan(20);
      expect(spread(flatStart.map(({ y }) => y))).toBeLessThan(0.035);
      expect(spread(landingDeck.map(({ y }) => y))).toBeLessThan(0.05);
      expect(run.maxHeight).toBeGreaterThan(3.9);
    } finally {
      character.dispose();
      course.dispose();
      physics.dispose();
    }
  });

  it("filters rays and shape casts by real collision groups", async () => {
    const physics = await PhysicsWorld.create();
    const course = compileStaticCourse(
      physics.world,
      PHYSICS_TEST_COURSE,
    );
    const playerBody = physics.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(0, 3, -10),
    );
    const playerCollider = physics.world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5).setCollisionGroups(
        PHYSICS_GROUPS.player,
      ),
      playerBody,
    );

    // Rapier refreshes its scene-query acceleration structures on step.
    physics.step();

    try {
      const allLayers = castRay(physics.world, {
        origin: { x: 0, y: 5, z: -10 },
        direction: { x: 0, y: -1, z: 0 },
        maxDistance: 10,
      });
      const worldOnly = castRay(physics.world, {
        origin: { x: 0, y: 5, z: -10 },
        direction: { x: 0, y: -1, z: 0 },
        maxDistance: 10,
        groups: PHYSICS_GROUPS.queryWorld,
      });
      const ballCast = castShape(physics.world, {
        shape: { kind: "ball", radius: 0.5 },
        position: { x: 0, y: 5, z: -10 },
        direction: { x: 0, y: -1, z: 0 },
        maxDistance: 10,
        groups: PHYSICS_GROUPS.queryWorld,
        excludeCollider: playerCollider,
      });

      expect(allLayers?.collider).toBe(playerCollider);
      expect(allLayers?.distance).toBeCloseTo(1.5, 4);
      expect(worldOnly?.distance).toBeCloseTo(5, 4);
      expect(worldOnly?.normal.y).toBeCloseTo(1, 4);
      expect(worldOnly?.point.y).toBeCloseTo(0, 4);
      expect(ballCast?.distance).toBeCloseTo(4.5, 4);
    } finally {
      course.dispose();
      physics.dispose();
    }
  });

  it("uses CCD for a fast sphere against thin ground", async () => {
    const physics = await PhysicsWorld.create();
    const course = compileStaticCourse(
      physics.world,
      PHYSICS_TEST_COURSE,
    );
    const sphere = physics.createDynamicSphere({
      position: { x: 0, y: 20, z: -10 },
      radius: 0.5,
      linearVelocity: { x: 0, y: -120, z: 0 },
      ccdEnabled: true,
    });

    try {
      for (let step = 0; step < 180; step += 1) {
        physics.step();
      }

      expect(physics.stepCount).toBe(180);
      expect(sphere.body.translation().y).toBeGreaterThan(0.45);
      expect(sphere.body.translation().y).toBeLessThan(0.7);
    } finally {
      course.dispose();
      physics.dispose();
    }
  });

  it("releases course, character and controller handles on reset", async () => {
    for (let cycle = 0; cycle < 3; cycle += 1) {
      const physics = await PhysicsWorld.create();
      const course = compileStaticCourse(
        physics.world,
        PHYSICS_TEST_COURSE,
      );
      const character = new KinematicCharacter(physics.world, {
        position: { x: 0, y: 0.9, z: -15 },
      });

      expect(course.bodyCount).toBe(1);
      expect(course.colliderCount).toBeGreaterThan(8);
      expect(physics.world.bodies.len()).toBe(2);
      expect(physics.world.colliders.len()).toBe(
        course.colliderCount + 1,
      );
      expect(physics.world.characterControllers.size).toBe(1);

      character.dispose();
      character.dispose();
      course.dispose();
      course.dispose();

      expect(physics.world.bodies.len()).toBe(0);
      expect(physics.world.colliders.len()).toBe(0);
      expect(physics.world.characterControllers.size).toBe(0);

      physics.dispose();
      expect(physics.isDisposed).toBe(true);
    }
  });
});

function spread(values: readonly number[]): number {
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;

  for (const value of values) {
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }

  return maximum - minimum;
}
