import type { ColliderVector3 } from "@/game/data/maps/kit/colliders";

export type HitZone = "head" | "torso" | "legs";
export type EliminationCause = "rifle" | "hazard" | "fall";
export type ShotResult = "world" | "target" | "miss";

interface SimEventBase {
  readonly tick: number;
}

export interface ShotFiredEvent extends SimEventBase {
  readonly type: "shot";
  readonly weaponId: string;
  readonly origin: ColliderVector3;
  readonly direction: ColliderVector3;
  readonly endPoint: ColliderVector3;
  readonly result: ShotResult;
  readonly targetId?: string;
  readonly zone?: HitZone;
}

export interface DamageEvent extends SimEventBase {
  readonly type: "damage";
  readonly sourceId: string;
  readonly targetId: string;
  readonly weaponId: string | null;
  readonly zone: HitZone | null;
  readonly amount: number;
  readonly shieldDamage: number;
  readonly healthDamage: number;
  readonly lethal: boolean;
  readonly sourcePosition: ColliderVector3;
  readonly point: ColliderVector3;
}

export interface EliminationEvent extends SimEventBase {
  readonly type: "elimination";
  readonly killerId: string;
  readonly killerName: string;
  readonly victimId: string;
  readonly victimName: string;
  readonly cause: EliminationCause;
  readonly weaponId: string | null;
  readonly headshot: boolean;
}

export interface RespawnEvent extends SimEventBase {
  readonly type: "respawn";
  readonly entityId: string;
}

export type SimEvent =
  | ShotFiredEvent
  | DamageEvent
  | EliminationEvent
  | RespawnEvent;

const DEFAULT_CAPACITY = 256;

/**
 * Bounded, typed event queue for host-owned simulation outcomes. UI consumers
 * drain it; high-frequency render code may observe effects without owning any
 * damage, ammo or respawn state.
 */
export class SimEventBus {
  private readonly capacity: number;
  private queue: SimEvent[] = [];
  private dropped = 0;

  constructor(capacity = DEFAULT_CAPACITY) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new Error("Event bus capacity must be a positive integer.");
    }

    this.capacity = capacity;
  }

  get pendingCount(): number {
    return this.queue.length;
  }

  get droppedCount(): number {
    return this.dropped;
  }

  emit(event: SimEvent): void {
    this.queue.push(event);

    if (this.queue.length > this.capacity) {
      this.queue.shift();
      this.dropped += 1;
    }
  }

  drain(): SimEvent[] {
    if (this.queue.length === 0) {
      return [];
    }

    const events = this.queue;
    this.queue = [];
    return events;
  }

  clear(): void {
    this.queue = [];
    this.dropped = 0;
  }
}
