export type SoloMatchPhase = "live" | "player-down";

export interface LocalMatchSnapshot {
  readonly phase: SoloMatchPhase;
  readonly tick: number;
  readonly eliminations: number;
  readonly headshotEliminations: number;
  readonly deaths: number;
  readonly shotsFired: number;
  readonly shotsHit: number;
  readonly accuracy: number;
  readonly respawnTicksRemaining: number;
}

/**
 * Minimal solo-training match state for M5. It records real outcomes from the
 * combat sim; it is not a substitute for the M20 mode framework.
 */
export class LocalMatchState {
  private phase: SoloMatchPhase = "live";
  private tick = 0;
  private eliminations = 0;
  private headshotEliminations = 0;
  private deaths = 0;
  private shotsFired = 0;
  private shotsHit = 0;
  private respawnTicksRemaining = 0;

  get snapshot(): LocalMatchSnapshot {
    return {
      phase: this.phase,
      tick: this.tick,
      eliminations: this.eliminations,
      headshotEliminations: this.headshotEliminations,
      deaths: this.deaths,
      shotsFired: this.shotsFired,
      shotsHit: this.shotsHit,
      accuracy:
        this.shotsFired > 0 ? this.shotsHit / this.shotsFired : 0,
      respawnTicksRemaining: this.respawnTicksRemaining,
    };
  }

  advance(tick: number): void {
    this.tick = tick;
  }

  recordShot(hit: boolean): void {
    this.shotsFired += 1;

    if (hit) {
      this.shotsHit += 1;
    }
  }

  recordElimination(headshot: boolean): void {
    this.eliminations += 1;

    if (headshot) {
      this.headshotEliminations += 1;
    }
  }

  recordDeath(respawnTicks: number): void {
    this.phase = "player-down";
    this.deaths += 1;
    this.respawnTicksRemaining = Math.max(0, Math.ceil(respawnTicks));
  }

  advanceRespawn(): number {
    if (this.phase !== "player-down") {
      return 0;
    }

    this.respawnTicksRemaining = Math.max(
      0,
      this.respawnTicksRemaining - 1,
    );

    return this.respawnTicksRemaining;
  }

  recordRespawn(): void {
    this.phase = "live";
    this.respawnTicksRemaining = 0;
  }
}
