import * as THREE from "three";

import {
  CameraRig,
  type Vector3Like,
} from "@/client/render/camera/CameraRig";
import { PLAYER_STANCE } from "@/game/sim/player/stance";

export const LOOK_RADIANS_PER_COUNT = 0.0022;
export const MAX_LOOK_PITCH = THREE.MathUtils.degToRad(89);

const SPRINT_FOV_KICK = 4;
const CROUCH_FOV_KICK = -2.4;
const MAX_LANDING_DIP = 0.13;
const LANDING_IMPACT_THRESHOLD = 2.2;

export interface FirstPersonCameraPose {
  position: Vector3Like;
  horizontalSpeed: number;
  grounded: boolean;
  sprinting: boolean;
  crouched: boolean;
  landed: boolean;
  landingImpact: number;
  reducedMotion: boolean;
}

export interface FirstPersonCameraOptions {
  cameraRig: CameraRig;
  yaw?: number;
  pitch?: number;
}

function damp(
  current: number,
  target: number,
  rate: number,
  deltaSeconds: number,
): number {
  const amount = 1 - Math.exp(-rate * Math.max(0, deltaSeconds));
  return current + (target - current) * amount;
}

/**
 * Owns look angles and cosmetic first-person camera layers. Simulation-owned
 * position is interpolated by the caller; this class only turns body/eye state
 * into a shake/lean/FOV-aware CameraRig pose.
 */
export class FirstPersonCamera {
  private readonly cameraRig: CameraRig;
  private yaw: number;
  private pitch: number;
  private bobPhase = 0;
  private bobVertical = 0;
  private bobLateral = 0;
  private crouchBlend = 0;
  private landingDip = 0;
  private fovKick = 0;

  constructor({
    cameraRig,
    yaw = 0,
    pitch = 0,
  }: FirstPersonCameraOptions) {
    this.cameraRig = cameraRig;
    this.yaw = Number.isFinite(yaw) ? yaw : 0;
    this.pitch = Number.isFinite(pitch)
      ? THREE.MathUtils.clamp(pitch, -MAX_LOOK_PITCH, MAX_LOOK_PITCH)
      : 0;
  }

  get lookYaw(): number {
    return this.yaw;
  }

  get lookPitch(): number {
    return this.pitch;
  }

  get crouchAmount(): number {
    return this.crouchBlend;
  }

  look(
    deltaX: number,
    deltaY: number,
    sensitivity: number,
    invertY: boolean,
  ): void {
    const safeSensitivity = Number.isFinite(sensitivity)
      ? THREE.MathUtils.clamp(sensitivity, 0.05, 4)
      : 1;
    const scale = LOOK_RADIANS_PER_COUNT * safeSensitivity;
    const mouseX = Number.isFinite(deltaX) ? deltaX : 0;
    const mouseY = Number.isFinite(deltaY) ? deltaY : 0;

    this.yaw = Math.atan2(
      Math.sin(this.yaw - mouseX * scale),
      Math.cos(this.yaw - mouseX * scale),
    );
    this.pitch = THREE.MathUtils.clamp(
      this.pitch - mouseY * scale * (invertY ? -1 : 1),
      -MAX_LOOK_PITCH,
      MAX_LOOK_PITCH,
    );
  }

  reset(yaw = 0): void {
    this.yaw = Number.isFinite(yaw) ? yaw : 0;
    this.pitch = 0;
    this.bobPhase = 0;
    this.bobVertical = 0;
    this.bobLateral = 0;
    this.crouchBlend = 0;
    this.landingDip = 0;
    this.fovKick = 0;
  }

  update(
    pose: FirstPersonCameraPose,
    deltaSeconds: number,
  ): void {
    const delta = Number.isFinite(deltaSeconds)
      ? Math.max(0, Math.min(deltaSeconds, 0.1))
      : 0;
    const moving =
      pose.grounded && pose.horizontalSpeed > 0.25;
    const bobAllowed =
      moving && !pose.reducedMotion && !pose.crouched;

    this.crouchBlend = damp(
      this.crouchBlend,
      pose.crouched ? 1 : 0,
      14,
      delta,
    );

    if (bobAllowed) {
      this.bobPhase +=
        delta * (4.6 + Math.min(pose.horizontalSpeed, 9.4) * 0.85);
      const speedScale = THREE.MathUtils.clamp(
        pose.horizontalSpeed / 9.4,
        0,
        1,
      );
      const amplitude = 0.012 + speedScale * 0.027;

      this.bobVertical = Math.sin(this.bobPhase * 2) * amplitude;
      this.bobLateral = Math.cos(this.bobPhase) * amplitude * 0.38;
    } else {
      this.bobVertical = damp(
        this.bobVertical,
        0,
        12,
        delta,
      );
      this.bobLateral = damp(
        this.bobLateral,
        0,
        12,
        delta,
      );
    }

    if (
      pose.landed &&
      pose.landingImpact > LANDING_IMPACT_THRESHOLD &&
      !pose.reducedMotion
    ) {
      const strength = THREE.MathUtils.clamp(
        (pose.landingImpact - LANDING_IMPACT_THRESHOLD) / 11,
        0,
        1,
      );
      this.landingDip = Math.max(
        this.landingDip,
        MAX_LANDING_DIP * strength,
      );
    }

    this.landingDip = damp(this.landingDip, 0, 10, delta);

    if (pose.reducedMotion) {
      this.landingDip = 0;
    }

    const fovTarget = pose.reducedMotion
      ? 0
      : pose.sprinting && pose.horizontalSpeed > 6.4
        ? SPRINT_FOV_KICK
        : pose.crouched
          ? CROUCH_FOV_KICK
          : 0;

    this.fovKick = damp(this.fovKick, fovTarget, 8, delta);

    const standingEye = PLAYER_STANCE.standingEyeOffset;
    const crouchedEye = PLAYER_STANCE.crouchedEyeOffset;
    const eyeOffset =
      standingEye + (crouchedEye - standingEye) * this.crouchBlend;
    const lateralX = Math.cos(this.yaw);
    const lateralZ = -Math.sin(this.yaw);
    const position = {
      x:
        pose.position.x +
        lateralX * this.bobLateral,
      y:
        pose.position.y +
        eyeOffset +
        this.bobVertical -
        this.landingDip,
      z:
        pose.position.z +
        lateralZ * this.bobLateral,
    };

    this.cameraRig.setLookPose(position, this.yaw, this.pitch);
    this.cameraRig.setLean(this.bobLateral * 0.32);
    this.cameraRig.setFovKick(this.fovKick);
  }
}
