import { MOVEMENT_TUNING } from "@/game/sim/player/Movement";
import type { HitZone } from "@/game/sim/events/SimEventBus";

export const PROTOTYPE_RIFLE = {
  id: "proto_vk7",
  name: "VK-7 Prototype",
  shortName: "VK-7",
  magazineSize: 30,
  reserveAmmo: 210,
  baseDamage: 24,
  headMultiplier: 2,
  torsoMultiplier: 1,
  legMultiplier: 0.8,
  falloffStartMetres: 16,
  falloffEndMetres: 42,
  minimumFalloffMultiplier: 0.6,
  maxRangeMetres: 80,
  fireIntervalSeconds: 0.105,
  reloadSeconds: 1.4,
  baseSpreadRadians: 0.0018,
  movementSpreadRadians: 0.011,
  airborneSpreadRadians: 0.01,
  crouchSpreadMultiplier: 0.72,
  maxBloomRadians: 0.018,
  bloomPerShotRadians: 0.0028,
  bloomRecoveryPerSecond: 0.06,
  maxSpreadRadians: 0.036,
} as const;

export interface PrototypeRifleStepInput {
  readonly fireHeld: boolean;
  readonly reloadPressed: boolean;
  readonly horizontalSpeed: number;
  readonly grounded: boolean;
  readonly crouched: boolean;
}

export interface PrototypeRifleStep {
  readonly fired: boolean;
  readonly spreadRadians: number;
  readonly reloadStarted: boolean;
}

export interface PrototypeRifleSnapshot {
  readonly id: string;
  readonly name: string;
  readonly shortName: string;
  readonly ammo: number;
  readonly reserve: number;
  readonly magazineSize: number;
  readonly reloading: boolean;
  readonly reloadProgress: number;
  readonly spreadRadians: number;
  readonly shotsFired: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

export function rifleZoneMultiplier(zone: HitZone): number {
  if (zone === "head") {
    return PROTOTYPE_RIFLE.headMultiplier;
  }

  if (zone === "legs") {
    return PROTOTYPE_RIFLE.legMultiplier;
  }

  return PROTOTYPE_RIFLE.torsoMultiplier;
}

export function rifleFalloffMultiplier(distanceMetres: number): number {
  if (
    !Number.isFinite(distanceMetres) ||
    distanceMetres <= PROTOTYPE_RIFLE.falloffStartMetres
  ) {
    return 1;
  }

  if (distanceMetres >= PROTOTYPE_RIFLE.falloffEndMetres) {
    return PROTOTYPE_RIFLE.minimumFalloffMultiplier;
  }

  const progress =
    (distanceMetres - PROTOTYPE_RIFLE.falloffStartMetres) /
    (PROTOTYPE_RIFLE.falloffEndMetres -
      PROTOTYPE_RIFLE.falloffStartMetres);

  return (
    1 +
    (PROTOTYPE_RIFLE.minimumFalloffMultiplier - 1) * progress
  );
}

export function rifleDamageAtDistance(
  distanceMetres: number,
  zone: HitZone,
): number {
  return (
    PROTOTYPE_RIFLE.baseDamage *
    rifleFalloffMultiplier(distanceMetres) *
    rifleZoneMultiplier(zone)
  );
}

/**
 * M5's single prototype hit-scan rifle. It is intentionally smaller than the
 * M7 weapon runtime: it proves firing, ammo, reload, spread and damage before
 * the modular framework absorbs it.
 */
export class PrototypeRifle {
  private currentAmmo: number = PROTOTYPE_RIFLE.magazineSize;
  private currentReserve: number = PROTOTYPE_RIFLE.reserveAmmo;
  private cooldownRemaining = 0;
  private reloadRemaining = 0;
  private bloom = 0;
  private shots = 0;
  private spread: number = PROTOTYPE_RIFLE.baseSpreadRadians;

  get snapshot(): PrototypeRifleSnapshot {
    return {
      id: PROTOTYPE_RIFLE.id,
      name: PROTOTYPE_RIFLE.name,
      shortName: PROTOTYPE_RIFLE.shortName,
      ammo: this.currentAmmo,
      reserve: this.currentReserve,
      magazineSize: PROTOTYPE_RIFLE.magazineSize,
      reloading: this.reloadRemaining > 0,
      reloadProgress:
        this.reloadRemaining > 0
          ? 1 - this.reloadRemaining / PROTOTYPE_RIFLE.reloadSeconds
          : 0,
      spreadRadians: this.spread,
      shotsFired: this.shots,
    };
  }

  step(
    deltaSeconds: number,
    input: PrototypeRifleStepInput,
  ): PrototypeRifleStep {
    const delta = Number.isFinite(deltaSeconds)
      ? clamp(deltaSeconds, 0, 0.05)
      : 0;

    this.cooldownRemaining = Math.max(
      0,
      this.cooldownRemaining - delta,
    );
    this.bloom = Math.max(
      0,
      this.bloom - PROTOTYPE_RIFLE.bloomRecoveryPerSecond * delta,
    );

    let reloadStarted = false;

    if (this.reloadRemaining > 0) {
      this.reloadRemaining = Math.max(0, this.reloadRemaining - delta);

      if (this.reloadRemaining === 0) {
        this.finishReload();
      }
    } else if (
      input.reloadPressed ||
      (this.currentAmmo === 0 &&
        this.currentReserve > 0 &&
        input.fireHeld)
    ) {
      reloadStarted = this.startReload();
    }

    this.spread = this.computeSpread(input);
    let fired = false;

    if (
      !reloadStarted &&
      this.reloadRemaining === 0 &&
      this.cooldownRemaining === 0 &&
      input.fireHeld &&
      this.currentAmmo > 0
    ) {
      this.currentAmmo -= 1;
      this.shots += 1;
      this.cooldownRemaining = PROTOTYPE_RIFLE.fireIntervalSeconds;
      this.bloom = Math.min(
        PROTOTYPE_RIFLE.maxBloomRadians,
        this.bloom + PROTOTYPE_RIFLE.bloomPerShotRadians,
      );
      fired = true;

      if (this.currentAmmo === 0 && this.currentReserve > 0) {
        reloadStarted = this.startReload();
      }
    }

    this.spread = this.computeSpread(input);

    return {
      fired,
      spreadRadians: this.spread,
      reloadStarted,
    };
  }

  reset(): void {
    this.currentAmmo = PROTOTYPE_RIFLE.magazineSize;
    this.currentReserve = PROTOTYPE_RIFLE.reserveAmmo;
    this.cooldownRemaining = 0;
    this.reloadRemaining = 0;
    this.bloom = 0;
    this.shots = 0;
    this.spread = PROTOTYPE_RIFLE.baseSpreadRadians;
  }

  private computeSpread(input: PrototypeRifleStepInput): number {
    const speedRatio = clamp(
      Math.max(0, input.horizontalSpeed) / MOVEMENT_TUNING.walkSpeed,
      0,
      1.4,
    );
    const stanceMultiplier = input.crouched
      ? PROTOTYPE_RIFLE.crouchSpreadMultiplier
      : 1;
    const spread =
      PROTOTYPE_RIFLE.baseSpreadRadians +
      PROTOTYPE_RIFLE.movementSpreadRadians * speedRatio +
      (input.grounded ? 0 : PROTOTYPE_RIFLE.airborneSpreadRadians) +
      this.bloom;

    return clamp(
      spread * stanceMultiplier,
      0,
      PROTOTYPE_RIFLE.maxSpreadRadians,
    );
  }

  private startReload(): boolean {
    if (
      this.reloadRemaining > 0 ||
      this.currentAmmo >= PROTOTYPE_RIFLE.magazineSize ||
      this.currentReserve <= 0
    ) {
      return false;
    }

    this.reloadRemaining = PROTOTYPE_RIFLE.reloadSeconds;
    return true;
  }

  private finishReload(): void {
    const missing = PROTOTYPE_RIFLE.magazineSize - this.currentAmmo;
    const loaded = Math.min(missing, this.currentReserve);
    this.currentAmmo += loaded;
    this.currentReserve -= loaded;
  }
}
