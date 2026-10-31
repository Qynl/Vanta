import type {
  ColliderVector3,
} from "@/game/data/maps/kit/colliders";
import {
  PROVING_GROUNDS_HAZARDS,
  PROVING_GROUNDS_TARGETS,
  type ProvingGroundsHazardDefinition,
  type ProvingGroundsTargetDefinition,
} from "@/game/data/maps/provingGrounds/provingGrounds";
import {
  HealthPool,
  PLAYER_VITALS,
  type DamageResult,
} from "@/game/sim/combat/damage";
import {
  PROTOTYPE_RIFLE,
  PrototypeRifle,
  rifleDamageAtDistance,
  type PrototypeRifleSnapshot,
} from "@/game/sim/combat/PrototypeRifle";
import {
  TargetDummy,
  distanceToTarget,
} from "@/game/sim/combat/TargetDummy";
import { PHYSICS_GROUPS } from "@/game/sim/physics/layers";
import type { PhysicsWorld } from "@/game/sim/physics/PhysicsWorld";
import { castRay } from "@/game/sim/physics/queries";
import {
  type DamageEvent,
  type EliminationCause,
  type HitZone,
  type SimEvent,
  SimEventBus,
} from "@/game/sim/events/SimEventBus";
import {
  LocalMatchState,
  type LocalMatchSnapshot,
} from "@/game/sim/match/LocalMatchState";

export const PLAYER_RESPAWN_TICKS = 150;
export const PLAYER_SHIELD_REGEN_DELAY_TICKS = 4 * 60;
export const PLAYER_SHIELD_REGEN_PER_SECOND = 35;
export const HAZARD_DAMAGE = 14;
export const HAZARD_DAMAGE_INTERVAL_TICKS = 15;

const EPSILON = 1e-8;

export interface CombatTickInput {
  readonly playerPosition: ColliderVector3;
  readonly aimOrigin: ColliderVector3;
  readonly aimDirection: ColliderVector3;
  readonly viewYaw: number;
  readonly fireHeld: boolean;
  readonly reloadPressed: boolean;
  readonly horizontalSpeed: number;
  readonly grounded: boolean;
  readonly crouched: boolean;
}

export interface CombatTickResult {
  readonly events: SimEvent[];
  readonly playerRespawned: boolean;
}

export interface CombatPlayerSnapshot {
  readonly alive: boolean;
  readonly health: number;
  readonly shield: number;
  readonly maxHealth: number;
  readonly maxShield: number;
  readonly respawnTicksRemaining: number;
}

export interface CombatTargetSnapshot {
  readonly id: string;
  readonly name: string;
  readonly alive: boolean;
  readonly health: number;
  readonly shield: number;
  readonly maxHealth: number;
  readonly maxShield: number;
  readonly distanceMetres: number;
}

export interface CombatSnapshot {
  readonly tick: number;
  readonly playerPosition: ColliderVector3;
  readonly viewYaw: number;
  readonly player: CombatPlayerSnapshot;
  readonly weapon: PrototypeRifleSnapshot;
  readonly targets: readonly CombatTargetSnapshot[];
  readonly match: LocalMatchSnapshot;
}

export interface LocalCombatSimulationOptions {
  readonly physics: PhysicsWorld;
  readonly targets?: readonly ProvingGroundsTargetDefinition[];
  readonly hazards?: readonly ProvingGroundsHazardDefinition[];
  readonly initialPlayerPosition?: ColliderVector3;
  readonly seed?: number;
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function normalize(direction: ColliderVector3): ColliderVector3 | null {
  const length = Math.hypot(
    direction.x,
    direction.y,
    direction.z,
  );

  if (!Number.isFinite(length) || length < EPSILON) {
    return null;
  }

  return {
    x: direction.x / length,
    y: direction.y / length,
    z: direction.z / length,
  };
}

function cross(
  first: ColliderVector3,
  second: ColliderVector3,
): ColliderVector3 {
  return {
    x: first.y * second.z - first.z * second.y,
    y: first.z * second.x - first.x * second.z,
    z: first.x * second.y - first.y * second.x,
  };
}

function applySpread(
  direction: ColliderVector3,
  spreadRadians: number,
  random: () => number,
): ColliderVector3 {
  const unit = normalize(direction);

  if (!unit) {
    return { x: 0, y: 0, z: 1 };
  }

  if (!Number.isFinite(spreadRadians) || spreadRadians <= 0) {
    return unit;
  }

  const referenceUp =
    Math.abs(unit.y) > 0.95
      ? { x: 1, y: 0, z: 0 }
      : { x: 0, y: 1, z: 0 };
  const right = normalize(cross(referenceUp, unit));
  const up = normalize(cross(unit, right ?? referenceUp));

  if (!right || !up) {
    return unit;
  }

  const radial = spreadRadians * Math.sqrt(random());
  const angle = random() * Math.PI * 2;
  const tangent = Math.tan(radial);
  const offsetX = Math.cos(angle) * tangent;
  const offsetY = Math.sin(angle) * tangent;

  return normalize({
    x: unit.x + right.x * offsetX + up.x * offsetY,
    y: unit.y + right.y * offsetX + up.y * offsetY,
    z: unit.z + right.z * offsetX + up.z * offsetY,
  }) ?? unit;
}

function insideHazard(
  playerPosition: ColliderVector3,
  hazard: ProvingGroundsHazardDefinition,
): boolean {
  const horizontalDistance = Math.hypot(
    playerPosition.x - hazard.position.x,
    playerPosition.z - hazard.position.z,
  );

  return (
    horizontalDistance <= hazard.radius &&
    playerPosition.y >= hazard.position.y - 0.2 &&
    playerPosition.y <= hazard.position.y + hazard.height
  );
}

/**
 * Local authoritative combat loop for M5. It owns player vitals, the prototype
 * rifle, target dummy damage/respawn, hazard damage and all outcome events.
 * Rendering only consumes this state; it never decides hits or kills.
 */
export class LocalCombatSimulation {
  readonly eventBus = new SimEventBus();
  readonly weapon = new PrototypeRifle();
  readonly matchState = new LocalMatchState();
  readonly playerHealth = new HealthPool(
    PLAYER_VITALS.maxHealth,
    PLAYER_VITALS.maxShield,
  );
  private readonly physics: PhysicsWorld;
  private readonly hazards: readonly ProvingGroundsHazardDefinition[];
  private readonly dummies: readonly TargetDummy[];
  private readonly random: () => number;
  private tick = 0;
  private lastPlayerPosition: ColliderVector3 = { x: 0, y: 0, z: 0 };
  private lastViewYaw = 0;
  private hazardCooldown = 0;
  private shieldRegenDelay = 0;
  private disposed = false;

  constructor({
    physics,
    targets = PROVING_GROUNDS_TARGETS,
    hazards = PROVING_GROUNDS_HAZARDS,
    initialPlayerPosition = { x: 0, y: 0, z: 0 },
    seed = 0x5a17c0de,
  }: LocalCombatSimulationOptions) {
    this.physics = physics;
    this.hazards = hazards;
    this.lastPlayerPosition = { ...initialPlayerPosition };
    this.random = seededRandom(seed);
    this.dummies = targets.map(
      (definition) => new TargetDummy(physics, definition),
    );
  }

  get isPlayerAlive(): boolean {
    return this.playerHealth.isAlive;
  }

  get snapshot(): CombatSnapshot {
    const match = this.matchState.snapshot;

    return {
      tick: this.tick,
      playerPosition: { ...this.lastPlayerPosition },
      viewYaw: this.lastViewYaw,
      player: {
        alive: this.playerHealth.isAlive,
        health: this.playerHealth.health,
        shield: this.playerHealth.shield,
        maxHealth: this.playerHealth.maxHealth,
        maxShield: this.playerHealth.maxShield,
        respawnTicksRemaining: match.respawnTicksRemaining,
      },
      weapon: this.weapon.snapshot,
      targets: this.dummies.map((dummy) => ({
        id: dummy.id,
        name: dummy.name,
        alive: dummy.isAlive,
        health: dummy.health.health,
        shield: dummy.health.shield,
        maxHealth: dummy.health.maxHealth,
        maxShield: dummy.health.maxShield,
        distanceMetres: distanceToTarget(
          this.lastPlayerPosition,
          dummy,
        ),
      })),
      match,
    };
  }

  step(input: CombatTickInput): CombatTickResult {
    if (this.disposed) {
      throw new Error("Combat simulation has been disposed.");
    }

    this.tick += 1;
    this.matchState.advance(this.tick);
    this.lastPlayerPosition = { ...input.playerPosition };
    this.lastViewYaw = Number.isFinite(input.viewYaw) ? input.viewYaw : 0;
    const events: SimEvent[] = [];
    this.updateTargetRespawns(events);

    if (!this.playerHealth.isAlive) {
      const remaining = this.matchState.advanceRespawn();

      if (remaining === 0) {
        this.respawnPlayer(events);
        return {
          events: this.flushEvents(events),
          playerRespawned: true,
        };
      }

      return {
        events: this.flushEvents(events),
        playerRespawned: false,
      };
    }

    this.hazardCooldown = Math.max(0, this.hazardCooldown - 1);
    this.updatePlayerShield();
    this.applyHazardDamage(input, events);

    if (!this.playerHealth.isAlive) {
      return {
        events: this.flushEvents(events),
        playerRespawned: false,
      };
    }

    const weaponStep = this.weapon.step(1 / 60, {
      fireHeld: input.fireHeld,
      reloadPressed: input.reloadPressed,
      horizontalSpeed: input.horizontalSpeed,
      grounded: input.grounded,
      crouched: input.crouched,
    });

    if (weaponStep.fired) {
      this.fireRifle(input, weaponStep.spreadRadians, events);
    }

    return {
      events: this.flushEvents(events),
      playerRespawned: false,
    };
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.dummies.forEach((dummy) => dummy.dispose());
    this.eventBus.clear();
  }

  private flushEvents(events: SimEvent[]): SimEvent[] {
    events.forEach((event) => this.eventBus.emit(event));
    return this.eventBus.drain();
  }

  private updateTargetRespawns(events: SimEvent[]): void {
    for (const dummy of this.dummies) {
      const respawnAt = dummy.canRespawnAt;

      if (
        respawnAt !== null &&
        this.tick >= respawnAt &&
        !dummy.isAlive
      ) {
        dummy.respawn();
        events.push({
          type: "respawn",
          tick: this.tick,
          entityId: dummy.id,
        });
      }
    }
  }

  private applyHazardDamage(
    input: CombatTickInput,
    events: SimEvent[],
  ): void {
    const hazard = this.hazards.find((candidate) =>
      insideHazard(input.playerPosition, candidate),
    );

    if (!hazard) {
      this.hazardCooldown = 0;
      return;
    }

    if (this.hazardCooldown > 0) {
      return;
    }

    this.hazardCooldown = HAZARD_DAMAGE_INTERVAL_TICKS;
    const sourcePosition = {
      x: hazard.position.x,
      y: hazard.position.y + hazard.height * 0.5,
      z: hazard.position.z,
    };
    const result = this.playerHealth.applyDamage(HAZARD_DAMAGE);
    this.shieldRegenDelay = PLAYER_SHIELD_REGEN_DELAY_TICKS;
    events.push(
      this.buildDamageEvent({
        targetId: "player",
        sourceId: hazard.id,
        weaponId: null,
        zone: null,
        sourcePosition,
        point: {
          x: input.playerPosition.x,
          y: input.playerPosition.y,
          z: input.playerPosition.z,
        },
        result,
      }),
    );

    if (result.lethal) {
      this.eliminatePlayer(
        hazard.id,
        hazard.label,
        "hazard",
        events,
      );
    }
  }

  private updatePlayerShield(): void {
    if (this.shieldRegenDelay > 0) {
      this.shieldRegenDelay -= 1;
      return;
    }

    this.playerHealth.restoreShield(
      PLAYER_SHIELD_REGEN_PER_SECOND / 60,
    );
  }

  private fireRifle(
    input: CombatTickInput,
    spreadRadians: number,
    events: SimEvent[],
  ): void {
    const direction = applySpread(
      input.aimDirection,
      spreadRadians,
      this.random,
    );
    const worldHit = castRay(this.physics.world, {
      origin: input.aimOrigin,
      direction,
      maxDistance: PROTOTYPE_RIFLE.maxRangeMetres,
      groups: PHYSICS_GROUPS.queryWorld,
    });
    const worldDistance =
      worldHit?.distance ?? PROTOTYPE_RIFLE.maxRangeMetres;
    let nearestTarget:
      | {
          dummy: TargetDummy;
          hit: NonNullable<ReturnType<TargetDummy["hitTest"]>>;
        }
      | null = null;

    for (const dummy of this.dummies) {
      const hit = dummy.hitTest(
        input.aimOrigin,
        direction,
        worldDistance,
      );

      if (
        hit &&
        (!nearestTarget || hit.distance < nearestTarget.hit.distance)
      ) {
        nearestTarget = { dummy, hit };
      }
    }

    if (!nearestTarget) {
      this.matchState.recordShot(false);
      events.push({
        type: "shot",
        tick: this.tick,
        weaponId: PROTOTYPE_RIFLE.id,
        origin: { ...input.aimOrigin },
        direction,
        endPoint: worldHit?.point ?? {
          x: input.aimOrigin.x + direction.x * PROTOTYPE_RIFLE.maxRangeMetres,
          y: input.aimOrigin.y + direction.y * PROTOTYPE_RIFLE.maxRangeMetres,
          z: input.aimOrigin.z + direction.z * PROTOTYPE_RIFLE.maxRangeMetres,
        },
        result: worldHit ? "world" : "miss",
      });
      return;
    }

    const { dummy, hit } = nearestTarget;
    const damage = rifleDamageAtDistance(hit.distance, hit.zone);
    const result = dummy.applyDamage(damage, this.tick);
    this.matchState.recordShot(true);
    events.push({
      type: "shot",
      tick: this.tick,
      weaponId: PROTOTYPE_RIFLE.id,
      origin: { ...input.aimOrigin },
      direction,
      endPoint: hit.point,
      result: "target",
      targetId: dummy.id,
      zone: hit.zone,
    });
    events.push(
      this.buildDamageEvent({
        targetId: dummy.id,
        sourceId: "player",
        weaponId: PROTOTYPE_RIFLE.id,
        zone: hit.zone,
        sourcePosition: input.aimOrigin,
        point: hit.point,
        result,
      }),
    );

    if (result.lethal) {
      this.matchState.recordElimination(hit.zone === "head");
      events.push({
        type: "elimination",
        tick: this.tick,
        killerId: "player",
        killerName: "Operator",
        victimId: dummy.id,
        victimName: dummy.name,
        cause: "rifle",
        weaponId: PROTOTYPE_RIFLE.id,
        headshot: hit.zone === "head",
      });
    }
  }

  private buildDamageEvent({
    targetId,
    sourceId,
    weaponId,
    zone,
    sourcePosition,
    point,
    result,
  }: {
    targetId: string;
    sourceId: string;
    weaponId: string | null;
    zone: HitZone | null;
    sourcePosition: ColliderVector3;
    point: ColliderVector3;
    result: DamageResult;
  }): DamageEvent {
    return {
      type: "damage",
      tick: this.tick,
      sourceId,
      targetId,
      weaponId,
      zone,
      amount: result.applied,
      shieldDamage: result.shieldDamage,
      healthDamage: result.healthDamage,
      lethal: result.lethal,
      sourcePosition: { ...sourcePosition },
      point: { ...point },
    };
  }

  private eliminatePlayer(
    killerId: string,
    killerName: string,
    cause: EliminationCause,
    events: SimEvent[],
  ): void {
    this.matchState.recordDeath(PLAYER_RESPAWN_TICKS);
    events.push({
      type: "elimination",
      tick: this.tick,
      killerId,
      killerName,
      victimId: "player",
      victimName: "Operator",
      cause,
      weaponId: null,
      headshot: false,
    });
  }

  private respawnPlayer(events: SimEvent[]): void {
    this.playerHealth.reset();
    this.weapon.reset();
    this.hazardCooldown = 0;
    this.shieldRegenDelay = 0;
    this.matchState.recordRespawn();
    events.push({
      type: "respawn",
      tick: this.tick,
      entityId: "player",
    });
  }
}
