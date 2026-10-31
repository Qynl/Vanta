import { describe, expect, it } from "vitest";

import {
  ARSENAL_CATEGORIES,
  ARSENAL_CATEGORY_IDS,
  WEAPON_COUNT,
} from "@/game/data/arsenalCategories";

describe("arsenal taxonomy", () => {
  it("contains ten unique weapon classes", () => {
    expect(ARSENAL_CATEGORIES).toHaveLength(10);
    expect(new Set(ARSENAL_CATEGORY_IDS).size).toBe(10);
    expect(new Set(ARSENAL_CATEGORIES.map((category) => category.id)).size).toBe(
      10,
    );
  });

  it("totals exactly sixty systems with six per class", () => {
    expect(WEAPON_COUNT).toBe(60);

    for (const category of ARSENAL_CATEGORIES) {
      expect(category.systems).toBe(6);
    }
  });

  it("assigns each class a valid slot and display code", () => {
    for (const category of ARSENAL_CATEGORIES) {
      expect(category.code.length).toBeGreaterThan(0);
      expect(["PRIMARY", "SECONDARY", "MELEE"]).toContain(category.slot);
    }
  });
});
