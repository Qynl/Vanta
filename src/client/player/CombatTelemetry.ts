import type { ColliderVector3 } from "@/game/data/maps/kit/colliders";
import type { CombatSnapshot } from "@/game/sim/combat/LocalCombatSimulation";
import type {
  DamageEvent,
  EliminationEvent,
  HitZone,
  SimEvent,
} from "@/game/sim/events/SimEventBus";

export interface HitFeedback {
  readonly id: number;
  readonly tick: number;
  readonly targetId: string;
  readonly targetName: string;
  readonly zone: HitZone;
  readonly amount: number;
  readonly shieldDamage: number;
  readonly healthDamage: number;
  readonly lethal: boolean;
}

export interface DamageFeedback {
  readonly id: number;
  readonly tick: number;
  readonly amount: number;
  readonly sourceId: string;
  readonly sourcePosition: ColliderVector3;
}

export interface KillfeedEntry {
  readonly id: number;
  readonly tick: number;
  readonly killerId: string;
  readonly killerName: string;
  readonly victimId: string;
  readonly victimName: string;
  readonly cause: EliminationEvent["cause"];
  readonly headshot: boolean;
}

export interface CombatTelemetrySnapshot {
  readonly state: CombatSnapshot;
  readonly lastHit: HitFeedback | null;
  readonly lastDamage: DamageFeedback | null;
  readonly killfeed: readonly KillfeedEntry[];
}

const MAX_KILLFEED = 5;

/**
 * Bounded HUD bridge. Simulation steps publish at 4 Hz, but real damage,
 * elimination and respawn events force an immediate snapshot so hits and death
 * prompts cannot lag behind the render frame.
 */
export class CombatTelemetry {
  private readonly listeners = new Set<() => void>();
  private readonly publishIntervalMs: number;
  private latestState: CombatSnapshot;
  private snapshot: CombatTelemetrySnapshot;
  private lastPublishAt = Number.NEGATIVE_INFINITY;
  private lastHit: HitFeedback | null = null;
  private lastDamage: DamageFeedback | null = null;
  private killfeed: KillfeedEntry[] = [];
  private serial = 0;

  constructor(initialState: CombatSnapshot, publishIntervalMs = 250) {
    this.publishIntervalMs = Math.max(50, publishIntervalMs);
    this.latestState = initialState;
    this.snapshot = {
      state: initialState,
      lastHit: null,
      lastDamage: null,
      killfeed: [],
    };
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = (): CombatTelemetrySnapshot => this.snapshot;

  publish(
    state: CombatSnapshot,
    events: readonly SimEvent[] = [],
    now = performance.now(),
  ): void {
    this.latestState = state;
    let feedbackChanged = false;

    for (const event of events) {
      if (event.type === "damage") {
        this.recordDamage(event);
        feedbackChanged = true;
      } else if (event.type === "elimination") {
        this.recordElimination(event);
        feedbackChanged = true;
      } else if (
        event.type === "respawn" &&
        event.entityId === "player"
      ) {
        this.lastDamage = null;
        feedbackChanged = true;
      }
    }

    if (
      !feedbackChanged &&
      now - this.lastPublishAt < this.publishIntervalMs
    ) {
      return;
    }

    this.lastPublishAt = now;
    this.snapshot = {
      state: this.latestState,
      lastHit: this.lastHit,
      lastDamage: this.lastDamage,
      killfeed: [...this.killfeed],
    };
    this.listeners.forEach((listener) => listener());
  }

  flush(now = performance.now()): void {
    this.lastPublishAt = now;
    this.snapshot = {
      state: this.latestState,
      lastHit: this.lastHit,
      lastDamage: this.lastDamage,
      killfeed: [...this.killfeed],
    };
    this.listeners.forEach((listener) => listener());
  }

  dispose(): void {
    this.listeners.clear();
  }

  private recordDamage(event: DamageEvent): void {
    this.serial += 1;

    if (event.targetId === "player") {
      this.lastDamage = {
        id: this.serial,
        tick: event.tick,
        amount: event.amount,
        sourceId: event.sourceId,
        sourcePosition: { ...event.sourcePosition },
      };
      return;
    }

    const target = this.latestState.targets.find(
      (candidate) => candidate.id === event.targetId,
    );

    if (!event.zone) {
      return;
    }

    this.lastHit = {
      id: this.serial,
      tick: event.tick,
      targetId: event.targetId,
      targetName: target?.name ?? event.targetId,
      zone: event.zone,
      amount: event.amount,
      shieldDamage: event.shieldDamage,
      healthDamage: event.healthDamage,
      lethal: event.lethal,
    };
  }

  private recordElimination(event: EliminationEvent): void {
    this.serial += 1;
    this.killfeed = [
      {
        id: this.serial,
        tick: event.tick,
        killerId: event.killerId,
        killerName: event.killerName,
        victimId: event.victimId,
        victimName: event.victimName,
        cause: event.cause,
        headshot: event.headshot,
      },
      ...this.killfeed,
    ].slice(0, MAX_KILLFEED);
  }
}
