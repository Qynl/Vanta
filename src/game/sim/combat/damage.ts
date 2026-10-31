export const PLAYER_VITALS = {
  maxHealth: 100,
  maxShield: 100,
} as const;

export const TARGET_VITALS = {
  maxHealth: 100,
  maxShield: 50,
} as const;

export interface DamageResult {
  readonly requested: number;
  readonly applied: number;
  readonly shieldDamage: number;
  readonly healthDamage: number;
  readonly lethal: boolean;
  readonly overkill: number;
}

const EMPTY_DAMAGE: DamageResult = {
  requested: 0,
  applied: 0,
  shieldDamage: 0,
  healthDamage: 0,
  lethal: false,
  overkill: 0,
};

/**
 * Shield absorbs damage before health. Values stay fractional so falloff and
 * zone multipliers are not rounded twice; presentation rounds them at the HUD.
 */
export class HealthPool {
  readonly maxHealth: number;
  readonly maxShield: number;
  private currentHealth: number;
  private currentShield: number;

  constructor(maxHealth: number, maxShield: number) {
    if (
      !Number.isFinite(maxHealth) ||
      maxHealth <= 0 ||
      !Number.isFinite(maxShield) ||
      maxShield < 0
    ) {
      throw new Error("Health pools require positive health and non-negative shield.");
    }

    this.maxHealth = maxHealth;
    this.maxShield = maxShield;
    this.currentHealth = maxHealth;
    this.currentShield = maxShield;
  }

  get health(): number {
    return this.currentHealth;
  }

  get shield(): number {
    return this.currentShield;
  }

  get healthRatio(): number {
    return this.currentHealth / this.maxHealth;
  }

  get shieldRatio(): number {
    return this.maxShield > 0 ? this.currentShield / this.maxShield : 0;
  }

  get isAlive(): boolean {
    return this.currentHealth > 0;
  }

  applyDamage(amount: number): DamageResult {
    if (!this.isAlive || !Number.isFinite(amount) || amount <= 0) {
      return EMPTY_DAMAGE;
    }

    const shieldDamage = Math.min(this.currentShield, amount);
    this.currentShield -= shieldDamage;
    const healthRequested = amount - shieldDamage;
    const healthDamage = Math.min(this.currentHealth, healthRequested);
    this.currentHealth -= healthDamage;
    const applied = shieldDamage + healthDamage;

    return {
      requested: amount,
      applied,
      shieldDamage,
      healthDamage,
      lethal: this.currentHealth <= 0,
      overkill: Math.max(0, healthRequested - healthDamage),
    };
  }

  restoreShield(amount: number): number {
    if (!this.isAlive || !Number.isFinite(amount) || amount <= 0) {
      return 0;
    }

    const restored = Math.min(
      this.maxShield - this.currentShield,
      amount,
    );
    this.currentShield += restored;
    return restored;
  }

  reset(): void {
    this.currentHealth = this.maxHealth;
    this.currentShield = this.maxShield;
  }
}
