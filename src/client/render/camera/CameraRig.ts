import * as THREE from "three";

const DEFAULT_FOV = 100;
const MIN_FOV = 60;
const MAX_FOV = 130;
const MAX_FOV_KICK = 12;
const MAX_LEAN = THREE.MathUtils.degToRad(8);

export interface CameraRigOptions {
  fov?: number;
  near?: number;
  far?: number;
  reducedMotion?: boolean;
}

export interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

function clampFov(fov: number): number {
  if (!Number.isFinite(fov)) {
    return DEFAULT_FOV;
  }

  return THREE.MathUtils.clamp(fov, MIN_FOV, MAX_FOV);
}

/**
 * Owns the gameplay camera's projection and cosmetic layers.
 *
 * The base pose is supplied by the active controller/staging director. Shake,
 * lean and FOV kick are additive so gameplay code never has to reconstruct the
 * camera orientation when an effect decays.
 */
export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;

  private readonly basePosition = new THREE.Vector3();
  private readonly baseQuaternion = new THREE.Quaternion();
  private readonly lookTarget = new THREE.Vector3();
  private readonly lookEuler = new THREE.Euler(0, 0, 0, "YXZ");
  private readonly shakeOffset = new THREE.Vector3();
  private baseFov: number;
  private fovKick = 0;
  private lean = 0;
  private shakeAmplitude = 0;
  private shakePhase = 0;
  private appliedFov = 0;
  private reducedMotion: boolean;

  constructor({
    fov = DEFAULT_FOV,
    near = 0.1,
    far = 420,
    reducedMotion = false,
  }: CameraRigOptions = {}) {
    this.baseFov = clampFov(fov);
    this.reducedMotion = reducedMotion;
    this.camera = new THREE.PerspectiveCamera(this.baseFov, 1, near, far);
    this.camera.rotation.order = "YXZ";
    this.camera.position.set(0, 0, 0);
    this.camera.lookAt(0, 0, -1);
    this.baseQuaternion.copy(this.camera.quaternion);
    this.appliedFov = this.camera.fov;
  }

  setViewport(aspect: number): void {
    if (!Number.isFinite(aspect) || aspect <= 0) {
      return;
    }

    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  setFov(fov: number): void {
    this.baseFov = clampFov(fov);
    this.applyProjection();
  }

  setFovKick(degrees: number): void {
    this.fovKick = Number.isFinite(degrees)
      ? THREE.MathUtils.clamp(degrees, -MAX_FOV_KICK, MAX_FOV_KICK)
      : 0;
    this.applyProjection();
  }

  setLean(radians: number): void {
    this.lean = Number.isFinite(radians)
      ? THREE.MathUtils.clamp(radians, -MAX_LEAN, MAX_LEAN)
      : 0;
  }

  setReducedMotion(reducedMotion: boolean): void {
    this.reducedMotion = reducedMotion;

    if (reducedMotion) {
      this.shakeAmplitude = 0;
      this.shakeOffset.set(0, 0, 0);
    }

    this.applyPose();
  }

  addShake(amplitude: number): void {
    if (this.reducedMotion || !Number.isFinite(amplitude) || amplitude <= 0) {
      return;
    }

    this.shakeAmplitude = Math.min(this.shakeAmplitude + amplitude, 1);
  }

  setPose(position: Vector3Like, target: Vector3Like): void {
    this.basePosition.set(position.x, position.y, position.z);
    this.lookTarget.set(target.x, target.y, target.z);
    this.camera.position.copy(this.basePosition);
    this.camera.lookAt(this.lookTarget);
    this.baseQuaternion.copy(this.camera.quaternion);
    this.applyPose();
  }

  /** First-person pose using YXZ yaw/pitch, without allocating a look target. */
  setLookPose(
    position: Vector3Like,
    yaw: number,
    pitch: number,
  ): void {
    if (
      !Number.isFinite(yaw) ||
      !Number.isFinite(pitch) ||
      !Number.isFinite(position.x) ||
      !Number.isFinite(position.y) ||
      !Number.isFinite(position.z)
    ) {
      return;
    }

    this.basePosition.set(position.x, position.y, position.z);
    this.lookEuler.set(pitch, yaw, 0, "YXZ");
    this.baseQuaternion.setFromEuler(this.lookEuler);
    this.applyPose();
  }

  update(deltaSeconds: number): void {
    const delta = Number.isFinite(deltaSeconds)
      ? Math.max(0, Math.min(deltaSeconds, 0.1))
      : 0;

    if (!this.reducedMotion && this.shakeAmplitude > 0.0001) {
      this.shakePhase += delta;
      const envelope = this.shakeAmplitude;
      this.shakeOffset.set(
        Math.sin(this.shakePhase * 73.1) * 0.014 * envelope,
        Math.sin(this.shakePhase * 91.7 + 1.3) * 0.01 * envelope,
        0,
      );
      this.shakeAmplitude = Math.max(0, this.shakeAmplitude - delta * 2.6);
    } else {
      this.shakeOffset.set(0, 0, 0);
      this.shakeAmplitude = 0;
    }

    this.applyPose();
  }

  private applyPose(): void {
    this.camera.position.copy(this.basePosition);
    this.camera.quaternion.copy(this.baseQuaternion);

    if (!this.reducedMotion) {
      this.camera.translateX(this.shakeOffset.x);
      this.camera.translateY(this.shakeOffset.y);
      this.camera.rotateZ(this.lean);
    }
  }

  private applyProjection(): void {
    const nextFov = clampFov(this.baseFov + this.fovKick);

    if (Math.abs(nextFov - this.appliedFov) < 0.001) {
      return;
    }

    this.appliedFov = nextFov;
    this.camera.fov = nextFov;
    this.camera.updateProjectionMatrix();
  }
}
