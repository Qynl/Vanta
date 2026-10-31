export const PHYSICS_LAYER = {
  world: 1 << 0,
  player: 1 << 1,
  enemy: 1 << 2,
  projectile: 1 << 3,
  pickup: 1 << 4,
  trigger: 1 << 5,
  debris: 1 << 6,
} as const;

export type PhysicsLayerName = keyof typeof PHYSICS_LAYER;

export const ALL_LAYERS = 0xffff;

/** All gameplay layers that a world ray may inspect. */
export const QUERY_LAYERS =
  PHYSICS_LAYER.world |
  PHYSICS_LAYER.enemy |
  PHYSICS_LAYER.projectile |
  PHYSICS_LAYER.pickup |
  PHYSICS_LAYER.debris;

/**
 * Rapier packs collision groups into one 32-bit integer: the high 16 bits are
 * this collider's membership and the low 16 bits are the layers it can hit.
 */
export function interactionGroups(
  membership: number,
  filter = ALL_LAYERS,
): number {
  return (
    ((membership & 0xffff) << 16) |
    (filter & 0xffff)
  ) >>> 0;
}

export function layerMask(...layers: number[]): number {
  return layers.reduce((mask, layer) => mask | layer, 0) & ALL_LAYERS;
}

export function groupsCanInteract(first: number, second: number): boolean {
  const firstMembership = (first >>> 16) & 0xffff;
  const firstFilter = first & 0xffff;
  const secondMembership = (second >>> 16) & 0xffff;
  const secondFilter = second & 0xffff;

  return (
    (firstMembership & secondFilter) !== 0 &&
    (secondMembership & firstFilter) !== 0
  );
}

export const PHYSICS_GROUPS = {
  world: interactionGroups(PHYSICS_LAYER.world),
  player: interactionGroups(
    PHYSICS_LAYER.player,
    PHYSICS_LAYER.world | PHYSICS_LAYER.enemy,
  ),
  enemy: interactionGroups(
    PHYSICS_LAYER.enemy,
    PHYSICS_LAYER.world | PHYSICS_LAYER.player | PHYSICS_LAYER.projectile,
  ),
  projectile: interactionGroups(
    PHYSICS_LAYER.projectile,
    PHYSICS_LAYER.world | PHYSICS_LAYER.enemy | PHYSICS_LAYER.player,
  ),
  pickup: interactionGroups(PHYSICS_LAYER.pickup, PHYSICS_LAYER.player),
  trigger: interactionGroups(PHYSICS_LAYER.trigger, ALL_LAYERS),
  debris: interactionGroups(PHYSICS_LAYER.debris, PHYSICS_LAYER.world),
  queryWorld: interactionGroups(QUERY_LAYERS, PHYSICS_LAYER.world),
  queryHitscan: interactionGroups(
    PHYSICS_LAYER.projectile,
    PHYSICS_LAYER.world | PHYSICS_LAYER.enemy,
  ),
  queryAll: interactionGroups(ALL_LAYERS, ALL_LAYERS),
} as const;
