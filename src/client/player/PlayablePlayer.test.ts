import * as THREE from "three";
import { describe, expect, it } from "vitest";

import type { PlayerFrameInput } from "@/client/input/InputController";
import { PlayablePlayer } from "@/client/player/PlayablePlayer";
import { CameraRig } from "@/client/render/camera/CameraRig";
import { ProceduralMaterialLibrary } from "@/client/render/materials/ProceduralMaterials";
import { NEUTRAL_MOVEMENT_INPUT } from "@/game/sim/player/Movement";

function frame(overrides: Partial<PlayerFrameInput> = {}): PlayerFrameInput {
  return {
    ...NEUTRAL_MOVEMENT_INPUT,
    lookX: 0,
    lookY: 0,
    fireHeld: false,
    reloadPressed: false,
    ...overrides,
  };
}

describe("playable player", () => {
  it("attaches to the scene, pauses safely and advances fixed steps", async () => {
    const scene = new THREE.Scene();
    const materials = new ProceduralMaterialLibrary({ textureSize: 32 });
    const cameraRig = new CameraRig({ fov: 100 });
    const player = await PlayablePlayer.create({
      scene,
      cameraRig,
      materials,
    });
    let nextInput = frame();

    try {
      expect(scene.getObjectByName("movement-range")).toBeDefined();
      expect(scene.getObjectByName("proving-grounds-combat")).toBeDefined();
      expect(scene.getObjectByName("rifle-feedback")).toBeDefined();
      expect(
        player.combatTelemetry.getSnapshot().state.targets,
      ).toHaveLength(3);
      expect(player.isPaused).toBe(true);
      const start = player.snapshot;

      player.setInputSource({ consumeFrame: () => nextInput });
      for (let frameIndex = 0; frameIndex < 10; frameIndex += 1) {
        player.update(1 / 60);
      }

      expect(player.snapshot.tick).toBe(start.tick);
      expect(cameraRig.camera.position.y).toBeGreaterThan(9);

      player.setPaused(false);
      nextInput = frame({ forward: 1, sprint: true });
      for (let frameIndex = 0; frameIndex < 60; frameIndex += 1) {
        player.update(1 / 60);
      }

      expect(player.snapshot.tick).toBeGreaterThan(start.tick + 50);
      expect(player.snapshot.position.z).toBeGreaterThan(
        start.position.z + 1,
      );

      const movingPosition = player.snapshot.position;
      player.setPaused(true);
      for (let frameIndex = 0; frameIndex < 10; frameIndex += 1) {
        player.update(1 / 60);
      }
      expect(player.snapshot.position.z).toBeCloseTo(
        movingPosition.z,
        6,
      );
    } finally {
      player.dispose();
    }

    expect(scene.getObjectByName("movement-range")).toBeUndefined();
    expect(scene.getObjectByName("proving-grounds-combat")).toBeUndefined();
    expect(scene.getObjectByName("rifle-feedback")).toBeUndefined();
    materials.dispose();
  });

  it("fires from the camera into the real target simulation", async () => {
    const scene = new THREE.Scene();
    const materials = new ProceduralMaterialLibrary({ textureSize: 32 });
    const cameraRig = new CameraRig({ fov: 100 });
    const player = await PlayablePlayer.create({
      scene,
      cameraRig,
      materials,
    });
    let nextInput = frame({
      lookX: 106,
      lookY: -2,
      fireHeld: true,
    });

    try {
      player.setInputSource({ consumeFrame: () => nextInput });
      player.setPaused(false);
      player.update(1 / 60);
      nextInput = frame({ fireHeld: true });

      for (let frameIndex = 0; frameIndex < 60; frameIndex += 1) {
        player.update(1 / 60);
      }

      const telemetry = player.combatTelemetry.getSnapshot();
      const target = telemetry.state.targets[0];

      expect(telemetry.state.weapon.ammo).toBeLessThan(30);
      expect(telemetry.state.match.shotsFired).toBeGreaterThan(3);
      expect(target?.alive).toBe(false);
      expect(telemetry.state.match.eliminations).toBe(1);
      expect(telemetry.killfeed.length).toBeGreaterThan(0);
      expect(telemetry.lastHit).not.toBeNull();
    } finally {
      player.dispose();
      materials.dispose();
    }
  });
});
