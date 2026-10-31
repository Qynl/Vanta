import { describe, expect, it } from "vitest";

import {
  ALL_LAYERS,
  groupsCanInteract,
  interactionGroups,
  layerMask,
  PHYSICS_GROUPS,
  PHYSICS_LAYER,
} from "@/game/sim/physics/layers";

describe("physics layers", () => {
  it("packs membership into the high bits and filter into the low bits", () => {
    const groups = interactionGroups(
      PHYSICS_LAYER.player,
      PHYSICS_LAYER.world | PHYSICS_LAYER.enemy,
    );

    expect(groups >>> 16).toBe(PHYSICS_LAYER.player);
    expect(groups & 0xffff).toBe(
      PHYSICS_LAYER.world | PHYSICS_LAYER.enemy,
    );
    expect(interactionGroups(ALL_LAYERS, ALL_LAYERS)).toBe(0xffffffff);
  });

  it("only reports interactions when both filters include the other membership", () => {
    expect(
      groupsCanInteract(PHYSICS_GROUPS.player, PHYSICS_GROUPS.world),
    ).toBe(true);
    expect(
      groupsCanInteract(PHYSICS_GROUPS.player, PHYSICS_GROUPS.enemy),
    ).toBe(true);
    expect(
      groupsCanInteract(PHYSICS_GROUPS.player, PHYSICS_GROUPS.pickup),
    ).toBe(false);
    expect(
      groupsCanInteract(PHYSICS_GROUPS.debris, PHYSICS_GROUPS.player),
    ).toBe(false);
    expect(
      groupsCanInteract(PHYSICS_GROUPS.queryWorld, PHYSICS_GROUPS.player),
    ).toBe(false);
    expect(
      groupsCanInteract(PHYSICS_GROUPS.queryWorld, PHYSICS_GROUPS.world),
    ).toBe(true);
  });

  it("builds masks without leaking outside the 16-bit layer range", () => {
    expect(
      layerMask(PHYSICS_LAYER.world, PHYSICS_LAYER.enemy),
    ).toBe(PHYSICS_LAYER.world | PHYSICS_LAYER.enemy);
    expect(layerMask(0x1ffff)).toBe(0xffff);
  });
});
