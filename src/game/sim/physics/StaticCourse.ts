import RAPIER from "@dimforge/rapier3d-compat";

import type { StaticCourseLayout } from "@/game/data/maps/kit/colliders";
import { buildStaticColliderDescs } from "@/game/sim/physics/ColliderKit";
import { PHYSICS_GROUPS } from "@/game/sim/physics/layers";

export interface CompiledStaticCourse {
  readonly layoutId: string;
  readonly body: RAPIER.RigidBody;
  readonly colliders: readonly RAPIER.Collider[];
  readonly collidersById: ReadonlyMap<string, RAPIER.Collider>;
  readonly bodyCount: number;
  readonly colliderCount: number;
  dispose: () => void;
}

/**
 * Compiles every static shape into one fixed rigid body. One body is
 * intentional: static map geometry never moves, so this keeps the island and
 * inspector cost minimal while retaining per-shape collider handles.
 */
export function compileStaticCourse(
  world: RAPIER.World,
  layout: StaticCourseLayout,
): CompiledStaticCourse {
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(
      layout.origin?.x ?? 0,
      layout.origin?.y ?? 0,
      layout.origin?.z ?? 0,
    ),
  );
  const colliders: RAPIER.Collider[] = [];
  const collidersById = new Map<string, RAPIER.Collider>();
  let disposed = false;

  try {
    for (const built of buildStaticColliderDescs(layout.colliders)) {
      if (collidersById.has(built.id)) {
        throw new Error(
          `Duplicate collider id "${built.id}" in layout "${layout.id}".`,
        );
      }

      built.desc.setCollisionGroups(PHYSICS_GROUPS.world);
      const collider = world.createCollider(built.desc, body);
      colliders.push(collider);
      collidersById.set(built.id, collider);
    }
  } catch (error) {
    world.removeRigidBody(body);
    throw error;
  }

  return {
    layoutId: layout.id,
    body,
    colliders,
    collidersById,
    bodyCount: 1,
    colliderCount: colliders.length,
    dispose: () => {
      if (disposed) {
        return;
      }

      disposed = true;
      collidersById.clear();
      world.removeRigidBody(body);
    },
  };
}
