import RAPIER from "@dimforge/rapier3d-compat";

import type { ColliderVector3 } from "@/game/data/maps/kit/colliders";
import { PHYSICS_STEP_SECONDS } from "@/game/sim/physics/FixedStep";
import { PHYSICS_GROUPS } from "@/game/sim/physics/layers";

export interface PhysicsWorldOptions {
  gravity?: ColliderVector3;
}

export interface DynamicSphereOptions {
  position: ColliderVector3;
  radius: number;
  ccdEnabled?: boolean;
  linearVelocity?: ColliderVector3;
  collisionGroups?: number;
  friction?: number;
  restitution?: number;
}

export interface DynamicSphere {
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
}

let initialization: Promise<void> | null = null;

/** Loads the Rapier WASM module once per browser/runtime session. */
export function initPhysics(): Promise<void> {
  if (!initialization) {
    initialization = RAPIER.init().catch((error: unknown) => {
      initialization = null;
      throw error;
    });
  }

  return initialization;
}

export class PhysicsWorld {
  readonly world: RAPIER.World;
  private disposed = false;
  private completedSteps = 0;

  private constructor({ gravity }: PhysicsWorldOptions) {
    this.world = new RAPIER.World(
      gravity ?? { x: 0, y: -9.81, z: 0 },
    );
    this.world.timestep = PHYSICS_STEP_SECONDS;
    this.world.maxCcdSubsteps = 2;
  }

  static async create(
    options: PhysicsWorldOptions = {},
  ): Promise<PhysicsWorld> {
    await initPhysics();
    return new PhysicsWorld(options);
  }

  get stepCount(): number {
    return this.completedSteps;
  }

  get isDisposed(): boolean {
    return this.disposed;
  }

  step(): number {
    this.assertOpen();
    this.world.step();
    this.completedSteps += 1;
    return this.completedSteps;
  }

  createDynamicSphere({
    position,
    radius,
    ccdEnabled = true,
    linearVelocity,
    collisionGroups = PHYSICS_GROUPS.projectile,
    friction = 0.55,
    restitution = 0.1,
  }: DynamicSphereOptions): DynamicSphere {
    this.assertOpen();

    if (!Number.isFinite(radius) || radius <= 0) {
      throw new Error("Dynamic sphere radius must be positive.");
    }

    let bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y, position.z)
      .setCcdEnabled(ccdEnabled);

    if (linearVelocity) {
      bodyDesc = bodyDesc.setLinvel(
        linearVelocity.x,
        linearVelocity.y,
        linearVelocity.z,
      );
    }

    const body = this.world.createRigidBody(bodyDesc);
    const collider = this.world.createCollider(
      RAPIER.ColliderDesc.ball(radius)
        .setFriction(friction)
        .setRestitution(restitution)
        .setCollisionGroups(collisionGroups),
      body,
    );

    return { body, collider };
  }

  /**
   * Frees every Rapier resource at once. Character controllers and compiled
   * courses should be disposed first when their owning session needs to run
   * explicit cleanup; their handles become invalid with this world.
   */
  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.world.free();
  }

  private assertOpen(): void {
    if (this.disposed) {
      throw new Error("Physics world has already been disposed.");
    }
  }
}

export async function createPhysicsWorld(
  options: PhysicsWorldOptions = {},
): Promise<PhysicsWorld> {
  return PhysicsWorld.create(options);
}
