import { describe, expect, it } from "vitest";

import {
  PROTOTYPE_RIFLE,
  PrototypeRifle,
  rifleDamageAtDistance,
  rifleFalloffMultiplier,
} from "@/game/sim/combat/PrototypeRifle";

const neutral = {
  fireHeld: false,
  reloadPressed: false,
  horizontalSpeed: 0,
  grounded: true,
  crouched: false,
};

describe("prototype rifle", () => {
  it("fires immediately, then respects the weapon cadence", () => {
    const rifle = new PrototypeRifle();
    const first = rifle.step(1 / 60, {
      ...neutral,
      fireHeld: true,
    });

    expect(first.fired).toBe(true);
    expect(rifle.snapshot.ammo).toBe(29);

    let shots = 0;

    for (let tick = 0; tick < 60; tick += 1) {
      if (rifle.step(1 / 60, { ...neutral, fireHeld: true }).fired) {
        shots += 1;
      }
    }

    expect(shots).toBeGreaterThanOrEqual(8);
    expect(shots).toBeLessThanOrEqual(10);
    expect(rifle.snapshot.ammo).toBe(30 - 1 - shots);
  });

  it("reloads from reserve and blocks fire while cycling", () => {
    const rifle = new PrototypeRifle();
    let fired = 0;

    for (let tick = 0; tick < 100 && fired < 5; tick += 1) {
      if (rifle.step(1 / 60, { ...neutral, fireHeld: true }).fired) {
        fired += 1;
      }
    }

    expect(fired).toBe(5);
    expect(rifle.snapshot.ammo).toBe(25);

    const reload = rifle.step(1 / 60, {
      ...neutral,
      reloadPressed: true,
    });
    expect(reload.reloadStarted).toBe(true);
    expect(reload.fired).toBe(false);
    expect(rifle.snapshot.reloading).toBe(true);
    expect(rifle.snapshot.ammo).toBe(25);

    for (let tick = 0; tick < 85; tick += 1) {
      rifle.step(1 / 60, {
        ...neutral,
        fireHeld: true,
      });
    }

    expect(rifle.snapshot.reloading).toBe(false);
    expect(rifle.snapshot.ammo).toBe(
      PROTOTYPE_RIFLE.magazineSize - 1,
    );
    expect(rifle.snapshot.reserve).toBe(PROTOTYPE_RIFLE.reserveAmmo - 5);
  });

  it("uses falloff and per-zone multipliers without rounding", () => {
    expect(rifleFalloffMultiplier(0)).toBe(1);
    expect(rifleFalloffMultiplier(16)).toBe(1);
    expect(
      rifleFalloffMultiplier(
        (PROTOTYPE_RIFLE.falloffStartMetres +
          PROTOTYPE_RIFLE.falloffEndMetres) /
          2,
      ),
    ).toBeCloseTo(0.8, 6);
    expect(rifleFalloffMultiplier(100)).toBe(0.6);
    expect(rifleDamageAtDistance(0, "torso")).toBe(24);
    expect(rifleDamageAtDistance(0, "head")).toBe(48);
    expect(rifleDamageAtDistance(0, "legs")).toBeCloseTo(19.2, 6);
  });

  it("expands spread from movement and settles while crouched", () => {
    const rifle = new PrototypeRifle();
    const standing = rifle.step(1 / 60, neutral);
    const moving = rifle.step(1 / 60, {
      ...neutral,
      horizontalSpeed: 9.4,
    });
    const airborne = rifle.step(1 / 60, {
      ...neutral,
      horizontalSpeed: 9.4,
      grounded: false,
    });
    const crouched = rifle.step(1 / 60, {
      ...neutral,
      horizontalSpeed: 9.4,
      crouched: true,
    });

    expect(standing.spreadRadians).toBeCloseTo(
      PROTOTYPE_RIFLE.baseSpreadRadians,
      6,
    );
    expect(moving.spreadRadians).toBeGreaterThan(standing.spreadRadians);
    expect(airborne.spreadRadians).toBeGreaterThan(moving.spreadRadians);
    expect(crouched.spreadRadians).toBeLessThan(moving.spreadRadians);
  });
});
