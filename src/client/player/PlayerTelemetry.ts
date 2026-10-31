import type { PlayerSimulationSnapshot } from "@/game/sim/player/LocalPlayerSimulation";

export type PlayerTelemetrySnapshot = PlayerSimulationSnapshot;

export function createEmptyPlayerTelemetry(): PlayerTelemetrySnapshot {
  return {
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    horizontalSpeed: 0,
    verticalSpeed: 0,
    grounded: false,
    crouched: false,
    sprinting: false,
    phase: "idle",
    yaw: 0,
    tick: 0,
    respawns: 0,
    landed: false,
    impactSpeed: 0,
    capsuleHalfHeight: 0.55,
    eyeOffset: 0.72,
  };
}

/**
 * Low-frequency bridge to React HUD. Movement still runs every fixed tick; the
 * UI only receives a bounded 4 Hz snapshot so it can never drive render cadence.
 */
export class PlayerTelemetry {
  private readonly listeners = new Set<() => void>();
  private readonly publishIntervalMs: number;
  private latest: PlayerTelemetrySnapshot = createEmptyPlayerTelemetry();
  private snapshot: PlayerTelemetrySnapshot = this.latest;
  private lastPublishAt = Number.NEGATIVE_INFINITY;

  constructor(publishIntervalMs = 250) {
    this.publishIntervalMs = Math.max(50, publishIntervalMs);
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = (): PlayerTelemetrySnapshot => this.snapshot;

  publish(
    next: PlayerSimulationSnapshot,
    force = false,
    now = performance.now(),
  ): void {
    this.latest = next;

    if (!force && now - this.lastPublishAt < this.publishIntervalMs) {
      return;
    }

    this.lastPublishAt = now;
    this.snapshot = this.latest;
    this.listeners.forEach((listener) => listener());
  }

  flush(now = performance.now()): void {
    this.lastPublishAt = now;
    this.snapshot = this.latest;
    this.listeners.forEach((listener) => listener());
  }

  dispose(): void {
    this.listeners.clear();
  }
}
