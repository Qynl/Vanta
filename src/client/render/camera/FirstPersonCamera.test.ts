import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { CameraRig } from "@/client/render/camera/CameraRig";
import {
  FirstPersonCamera,
  MAX_LOOK_PITCH,
  type FirstPersonCameraPose,
} from "@/client/render/camera/FirstPersonCamera";

function pose(
  overrides: Partial<FirstPersonCameraPose> = {},
): FirstPersonCameraPose {
  return {
    position: { x: 3, y: 10, z: -2 },
    horizontalSpeed: 0,
    grounded: true,
    sprinting: false,
    crouched: false,
    landed: false,
    landingImpact: 0,
    reducedMotion: false,
    ...overrides,
  };
}

function makeCamera(yaw = 0) {
  const cameraRig = new CameraRig({ fov: 100 });
  const camera = new FirstPersonCamera({ cameraRig, yaw });
  return { camera, cameraRig };
}

describe("first-person camera", () => {
  it("turns toward the mouse, clamps pitch and honors invert Y", () => {
    const { camera, cameraRig } = makeCamera();
    camera.update(pose(), 1 / 60);

    const forward = new THREE.Vector3();
    cameraRig.camera.getWorldDirection(forward);
    expect(forward.z).toBeCloseTo(-1, 5);

    camera.look(1000, 0, 1, false);
    camera.update(pose(), 1 / 60);
    cameraRig.camera.getWorldDirection(forward);
    expect(forward.x).toBeGreaterThan(0.7);

    camera.look(0, 100_000, 1, false);
    expect(camera.lookPitch).toBe(-MAX_LOOK_PITCH);

    const inverted = makeCamera().camera;
    inverted.look(0, 100, 1, true);
    expect(inverted.lookPitch).toBeGreaterThan(0);
  });

  it("adds grounded head bob but suppresses it for reduced motion", () => {
    const moving = makeCamera();
    const baseY = 10.72;
    let maximumDeviation = 0;

    for (let frame = 0; frame < 45; frame += 1) {
      moving.camera.update(
        pose({ horizontalSpeed: 9.4, grounded: true }),
        1 / 60,
      );
      maximumDeviation = Math.max(
        maximumDeviation,
        Math.abs(moving.cameraRig.camera.position.y - baseY),
      );
    }

    expect(maximumDeviation).toBeGreaterThan(0.008);

    const reduced = makeCamera();
    for (let frame = 0; frame < 45; frame += 1) {
      reduced.camera.update(
        pose({
          horizontalSpeed: 9.4,
          grounded: true,
          reducedMotion: true,
        }),
        1 / 60,
      );
    }

    expect(reduced.cameraRig.camera.position.y).toBeCloseTo(baseY, 6);
  });

  it("smooths crouch eye height and sinks on landing", () => {
    const { camera, cameraRig } = makeCamera();

    for (let frame = 0; frame < 20; frame += 1) {
      camera.update(pose({ crouched: true }), 1 / 60);
    }

    expect(camera.crouchAmount).toBeGreaterThan(0.95);
    expect(cameraRig.camera.position.y).toBeCloseTo(10.35, 2);

    camera.update(
      pose({
        landed: true,
        landingImpact: 12,
      }),
      1 / 60,
    );

    expect(cameraRig.camera.position.y).toBeLessThan(10.67);
  });

  it("transitions FOV for sprint and crouch states", () => {
    const { camera, cameraRig } = makeCamera();

    for (let frame = 0; frame < 60; frame += 1) {
      camera.update(
        pose({ horizontalSpeed: 9.4, sprinting: true }),
        1 / 60,
      );
    }

    expect(cameraRig.camera.fov).toBeGreaterThan(103);

    for (let frame = 0; frame < 60; frame += 1) {
      camera.update(
        pose({ horizontalSpeed: 0, crouched: true }),
        1 / 60,
      );
    }

    expect(cameraRig.camera.fov).toBeLessThan(98.5);
  });
});
