import { describe, expect, it } from "vitest";

import {
  PROVING_GROUNDS,
  PROVING_GROUNDS_HAZARDS,
  PROVING_GROUNDS_ORIGIN,
  PROVING_GROUNDS_PICKUP_ANCHORS,
  PROVING_GROUNDS_SPAWN,
  PROVING_GROUNDS_TARGETS,
} from "@/game/data/maps/provingGrounds/provingGrounds";

describe("proving grounds layout", () => {
  it("places unique targets in front of spawn on the target deck", () => {
    const ids = new Set(PROVING_GROUNDS_TARGETS.map((target) => target.id));

    expect(PROVING_GROUNDS_TARGETS).toHaveLength(3);
    expect(ids.size).toBe(3);

    for (const target of PROVING_GROUNDS_TARGETS) {
      expect(target.position.y).toBe(PROVING_GROUNDS_ORIGIN.y);
      expect(target.position.z).toBeGreaterThan(
        PROVING_GROUNDS_SPAWN.z,
      );
      expect(target.position.z).toBeLessThan(
        PROVING_GROUNDS_ORIGIN.z + 21,
      );
    }

    const distances = PROVING_GROUNDS_TARGETS.map((target) =>
      Math.hypot(
        target.position.x - PROVING_GROUNDS_SPAWN.x,
        target.position.z - PROVING_GROUNDS_SPAWN.z,
      ),
    );

    expect(distances[0]).toBeGreaterThan(15);
    expect(distances[1]).toBeGreaterThan(distances[0] ?? 0);
    expect(distances[2]).toBeGreaterThan(distances[1] ?? 0);
  });

  it("contains the combat hazard, flow lanes and reserved pickup anchors", () => {
    expect(PROVING_GROUNDS_HAZARDS).toHaveLength(1);
    expect(PROVING_GROUNDS_HAZARDS[0]?.label).toMatch(/damage/i);
    expect(PROVING_GROUNDS_PICKUP_ANCHORS).toHaveLength(2);

    const ids = PROVING_GROUNDS.colliders.map(
      (collider) => collider.id,
    );

    expect(ids).toContain("target-deck");
    expect(ids).toContain("wall-run-west");
    expect(ids).toContain("slide-roof");
    expect(ids).toContain("dash-island");
    expect(ids).toContain("high-deck");
    expect(new Set(ids).size).toBe(ids.length);
  });
});
