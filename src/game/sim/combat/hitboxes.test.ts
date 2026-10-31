import { describe, expect, it } from "vitest";

import {
  TARGET_HITBOX,
  resolveTargetHit,
} from "@/game/sim/combat/hitboxes";

const target = {
  position: { x: 0, y: 0, z: 0 },
  yaw: 0,
};

describe("target hitboxes", () => {
  it("resolves distinct head, torso and leg hits", () => {
    const head = resolveTargetHit(
      { x: 0, y: TARGET_HITBOX.head.centerY, z: -10 },
      { x: 0, y: 0, z: 1 },
      20,
      target,
    );
    const torso = resolveTargetHit(
      { x: 0, y: TARGET_HITBOX.torso.centerY, z: -10 },
      { x: 0, y: 0, z: 1 },
      20,
      target,
    );
    const legs = resolveTargetHit(
      {
        x: TARGET_HITBOX.legs.offsetX,
        y: TARGET_HITBOX.legs.centerY,
        z: -10,
      },
      { x: 0, y: 0, z: 1 },
      20,
      target,
    );

    expect(head?.zone).toBe("head");
    expect(head?.distance).toBeCloseTo(9.79, 2);
    expect(torso?.zone).toBe("torso");
    expect(legs?.zone).toBe("legs");
    expect(legs?.point.z).toBeCloseTo(-0.1, 1);
  });

  it("misses above the silhouette, respects range, and rotates legs", () => {
    expect(
      resolveTargetHit(
        { x: 0, y: 2.4, z: -10 },
        { x: 0, y: 0, z: 1 },
        20,
        target,
      ),
    ).toBeNull();

    expect(
      resolveTargetHit(
        { x: 0, y: 1.7, z: -10 },
        { x: 0, y: 0, z: 1 },
        5,
        target,
      ),
    ).toBeNull();

    const rotated = resolveTargetHit(
      { x: 0, y: TARGET_HITBOX.legs.centerY, z: -10 },
      { x: 0, y: 0, z: 1 },
      20,
      { position: { x: 0, y: 0, z: 0 }, yaw: Math.PI / 2 },
    );

    expect(rotated?.zone).toBe("legs");
  });

  it("returns a surface normal for hit effects", () => {
    const hit = resolveTargetHit(
      { x: 0, y: 1.7, z: -10 },
      { x: 0, y: 0, z: 1 },
      20,
      target,
    );

    expect(hit).not.toBeNull();
    expect(Math.hypot(hit?.normal.x ?? 0, hit?.normal.y ?? 0, hit?.normal.z ?? 0)).toBeCloseTo(1, 4);
    expect(hit?.normal.z).toBeCloseTo(-1, 4);
  });
});
