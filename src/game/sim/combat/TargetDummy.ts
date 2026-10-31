import RAPIER from "@dimforge/rapier3d-compat";

import type { ColliderVector3 } from "@/game/data/maps/kit/colliders";
import type { ProvingGroundsTargetDefinition } from "@/game/data/maps/provingGrounds/provingGrounds";
import { HealthPool, TARGET_VITALS, type DamageResult } from "@/game/sim/combat/damage";
import {
  resolveTargetHit,
  type HitboxHit,
} from "@/game/sim/combat/hitboxes";
import { PHYSICS_GROUPS } from "@/game/sim/physics/layers";
import type { PhysicsWorld } from "@/game/sim/physics/PhysicsWorld";

export const TARGET_DUMMY_RESPAWN_TICKS = 4 * 60;

export const TARGET_DUMMY_CAPSULE = {
  radius: 0.35,
  halfHeight: 0.55,
  centerOffsetY: 0.91,
} as const;

export class TargetDummy {
  readonly id: string;
  readonly name: string;
  readonly position: ColliderVector3;
  readonly yaw: number;
  readonly health = new HealthPool(
    TARGET_VITALS.maxHealth,
    TARGET_VITALS.maxShield,
  );
  private readonly world: RAPIER.World;
  private readonly body: RAPIER.RigidBody;
  private readonly collider: RAPIER.Collider;
  private alive = true;
  private respawnAtTick: number | null = null;
  private disposed = false;

  constructor(
    physics: PhysicsWorld,
    definition: ProvingGroundsTargetDefinition,
  ) {
    this.world = physics.world;
    this.id = definition.id;
    this.name = definition.name;
    this.position = { ...definition.position };
    this.yaw = definition.yaw;
    this.body = physics.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(
        this.position.x,
        this.position.y,
        this.position.z,
      ),
    );
    this.collider = physics.world.createCollider(
      RAPIER.ColliderDesc.capsule(
        TARGET_DUMMY_CAPSULE.halfHeight,
        TARGET_DUMMY_CAPSULE.radius,
      )
        .setTranslation(0, TARGET_DUMMY_CAPSULE.centerOffsetY, 0)
        .setCollisionGroups(PHYSICS_GROUPS.enemy)
        .setFriction(0.6),
      this.body,
    );
  }

  get isAlive(): boolean {
    return this.alive;
  }

  get canRespawnAt(): number | null {
    return this.respawnAtTick;
  }

  hitTest(
    origin: ColliderVector3,
    direction: ColliderVector3,
    maxDistance: number,
  ): HitboxHit | null {
    if (!this.alive) {
      return null;
    }

    return resolveTargetHit(origin, direction, maxDistance, {
      position: this.position,
      yaw: this.yaw,
    });
  }

  applyDamage(amount: number, tick: number): DamageResult {
    if (!this.alive) {
      return {
        requested: 0,
        applied: 0,
        shieldDamage: 0,
        healthDamage: 0,
        lethal: false,
        overkill: 0,
      };
    }

    const result = this.health.applyDamage(amount);

    if (result.lethal) {
      this.alive = false;
      this.respawnAtTick = tick + TARGET_DUMMY_RESPAWN_TICKS;
      this.collider.setEnabled(false);
    }

    return result;
  }

  respawn(): void {
    if (this.disposed) {
      return;
    }

    this.alive = true;
    this.respawnAtTick = null;
    this.health.reset();
    this.collider.setEnabled(true);
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.collider.setEnabled(false);
    // Removing the body also removes its attached collider.
    this.world.removeRigidBody(this.body);
  }
}

export function distanceToTarget(
  position: ColliderVector3,
  target: Pick<TargetDummy, "position">,
): number {
  return Math.hypot(
    target.position.x - position.x,
    target.position.y - position.y,
    target.position.z - position.z,
  );
}
