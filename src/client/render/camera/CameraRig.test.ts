import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { CameraRig } from "@/client/render/camera/CameraRig";

describe("camera rig", () => {
  it("updates aspect and clamps field of view", () => {
    const rig = new CameraRig({ fov: 100 });

    rig.setViewport(21 / 9);
    expect(rig.camera.aspect).toBeCloseTo(21 / 9);
    expect(rig.camera).toBeInstanceOf(THREE.PerspectiveCamera);

    rig.setFov(500);
    expect(rig.camera.fov).toBe(130);

    rig.setFov(10);
    expect(rig.camera.fov).toBe(60);

    rig.setFov(120);
    rig.setFovKick(12);
    expect(rig.camera.fov).toBe(130);
  });

  it("applies staged poses and cosmetic shake, disabled by reduced motion", () => {
    const rig = new CameraRig({ fov: 100, reducedMotion: false });
    const pose = { x: 4, y: 6, z: 9 };
    const target = { x: 0, y: 2, z: 0 };
    rig.setPose(pose, target);
    rig.update(0);

    expect(rig.camera.position.x).toBeCloseTo(pose.x);
    expect(rig.camera.position.y).toBeCloseTo(pose.y);
    expect(rig.camera.position.z).toBeCloseTo(pose.z);

    rig.addShake(0.8);
    rig.update(1 / 60);
    const shakenDistance = rig.camera.position.distanceTo(
      new THREE.Vector3(pose.x, pose.y, pose.z),
    );
    expect(shakenDistance).toBeGreaterThan(0);

    rig.setReducedMotion(true);
    expect(rig.camera.position.x).toBeCloseTo(pose.x);
    expect(rig.camera.position.y).toBeCloseTo(pose.y);
    expect(rig.camera.position.z).toBeCloseTo(pose.z);

    rig.addShake(1);
    rig.update(1 / 60);
    expect(rig.camera.position.x).toBeCloseTo(pose.x);
  });

  it("ignores invalid viewport and projection values", () => {
    const rig = new CameraRig({ fov: Number.NaN });
    const initialFov = rig.camera.fov;
    const initialAspect = rig.camera.aspect;

    rig.setViewport(Number.NaN);
    rig.setViewport(0);
    rig.setFov(Number.NaN);

    expect(rig.camera.aspect).toBe(initialAspect);
    expect(rig.camera.fov).toBe(initialFov);
  });
});
