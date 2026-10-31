import * as THREE from "three";

import type { ColliderVector3 } from "@/game/data/maps/kit/colliders";
import type { ShotFiredEvent } from "@/game/sim/events/SimEventBus";

const MAX_TRACERS = 18;
const MAX_IMPACTS = 28;
const TRACER_SECONDS = 0.065;
const IMPACT_SECONDS = 0.18;
const FLASH_SECONDS = 0.055;

interface TracerParticle {
  readonly start: ColliderVector3;
  readonly end: ColliderVector3;
  remaining: number;
}

interface ImpactParticle {
  readonly point: ColliderVector3;
  readonly color: THREE.Color;
  remaining: number;
}

export interface RifleVisuals {
  readonly group: THREE.Group;
  applyShot: (shot: ShotFiredEvent) => void;
  update: (deltaSeconds: number) => void;
  dispose: () => void;
}

function offset(
  origin: ColliderVector3,
  direction: ColliderVector3,
  distance: number,
): ColliderVector3 {
  return {
    x: origin.x + direction.x * distance,
    y: origin.y + direction.y * distance,
    z: origin.z + direction.z * distance,
  };
}

/**
 * Lightweight rifle feedback for M5: pooled tracers, impact sparks and a short
 * muzzle flash. No viewmodel or audio system is implied before M7.
 */
export function createRifleVisuals(): RifleVisuals {
  const group = new THREE.Group();
  group.name = "rifle-feedback";
  const tracers: TracerParticle[] = [];
  const impacts: ImpactParticle[] = [];
  let flashRemaining = 0;

  const tracerPositions = new Float32Array(MAX_TRACERS * 6);
  const tracerGeometry = new THREE.BufferGeometry();
  const tracerAttribute = new THREE.BufferAttribute(
    tracerPositions,
    3,
  );
  tracerAttribute.setUsage(THREE.DynamicDrawUsage);
  tracerGeometry.setAttribute("position", tracerAttribute);
  tracerGeometry.setDrawRange(0, 0);
  const tracerMaterial = new THREE.LineBasicMaterial({
    color: 0xffe0a3,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const tracerLines = new THREE.LineSegments(
    tracerGeometry,
    tracerMaterial,
  );
  tracerLines.name = "rifle-tracers";
  tracerLines.frustumCulled = false;
  group.add(tracerLines);

  const impactPositions = new Float32Array(MAX_IMPACTS * 3);
  const impactColors = new Float32Array(MAX_IMPACTS * 3);
  const impactGeometry = new THREE.BufferGeometry();
  const impactPositionAttribute = new THREE.BufferAttribute(
    impactPositions,
    3,
  );
  const impactColorAttribute = new THREE.BufferAttribute(
    impactColors,
    3,
  );
  impactPositionAttribute.setUsage(THREE.DynamicDrawUsage);
  impactColorAttribute.setUsage(THREE.DynamicDrawUsage);
  impactGeometry.setAttribute("position", impactPositionAttribute);
  impactGeometry.setAttribute("color", impactColorAttribute);
  impactGeometry.setDrawRange(0, 0);
  const impactMaterial = new THREE.PointsMaterial({
    size: 0.09,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const impactPoints = new THREE.Points(impactGeometry, impactMaterial);
  impactPoints.name = "rifle-impact-sparks";
  impactPoints.frustumCulled = false;
  group.add(impactPoints);

  const flashMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd078,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const flashGeometry = new THREE.OctahedronGeometry(0.11, 0);
  const flash = new THREE.Mesh(flashGeometry, flashMaterial);
  flash.name = "rifle-muzzle-flash";
  flash.visible = false;
  group.add(flash);

  const flashLight = new THREE.PointLight(0xffb95c, 0, 4.5, 2);
  flashLight.name = "rifle-muzzle-light";
  group.add(flashLight);
  const lowColor = new THREE.Color(0xff9b62);
  const targetColor = new THREE.Color(0xff4e32);
  let disposed = false;

  const rebuildTracers = (): void => {
    tracerPositions.fill(0);
    let index = 0;

    for (const tracer of tracers) {
      tracerPositions[index] = tracer.start.x;
      tracerPositions[index + 1] = tracer.start.y;
      tracerPositions[index + 2] = tracer.start.z;
      tracerPositions[index + 3] = tracer.end.x;
      tracerPositions[index + 4] = tracer.end.y;
      tracerPositions[index + 5] = tracer.end.z;
      index += 6;
    }

    tracerGeometry.setDrawRange(0, tracers.length * 2);
    tracerAttribute.needsUpdate = true;
  };

  const rebuildImpacts = (): void => {
    impactPositions.fill(0);
    impactColors.fill(0);

    impacts.forEach((impact, index) => {
      const positionIndex = index * 3;
      impactPositions[positionIndex] = impact.point.x;
      impactPositions[positionIndex + 1] = impact.point.y;
      impactPositions[positionIndex + 2] = impact.point.z;
      impactColors[positionIndex] = impact.color.r;
      impactColors[positionIndex + 1] = impact.color.g;
      impactColors[positionIndex + 2] = impact.color.b;
    });

    impactGeometry.setDrawRange(0, impacts.length);
    impactPositionAttribute.needsUpdate = true;
    impactColorAttribute.needsUpdate = true;
  };

  return {
    group,
    applyShot: (shot) => {
      tracers.push({
        start: offset(shot.origin, shot.direction, 0.36),
        end: { ...shot.endPoint },
        remaining: TRACER_SECONDS,
      });

      if (tracers.length > MAX_TRACERS) {
        tracers.shift();
      }

      rebuildTracers();
      flash.position.set(
        shot.origin.x + shot.direction.x * 0.46,
        shot.origin.y + shot.direction.y * 0.46,
        shot.origin.z + shot.direction.z * 0.46,
      );
      flashRemaining = FLASH_SECONDS;
      flash.visible = true;

      if (shot.result !== "miss") {
        impacts.push({
          point: { ...shot.endPoint },
          color:
            shot.result === "target" ? targetColor : lowColor,
          remaining: IMPACT_SECONDS,
        });

        if (impacts.length > MAX_IMPACTS) {
          impacts.shift();
        }

        rebuildImpacts();
      }
    },
    update: (deltaSeconds) => {
      const delta = Number.isFinite(deltaSeconds)
        ? Math.max(0, Math.min(deltaSeconds, 0.1))
        : 0;

      for (let index = tracers.length - 1; index >= 0; index -= 1) {
        const tracer = tracers[index];

        if (!tracer) {
          continue;
        }

        tracer.remaining -= delta;

        if (tracer.remaining <= 0) {
          tracers.splice(index, 1);
        }
      }

      for (let index = impacts.length - 1; index >= 0; index -= 1) {
        const impact = impacts[index];

        if (!impact) {
          continue;
        }

        impact.remaining -= delta;

        if (impact.remaining <= 0) {
          impacts.splice(index, 1);
        }
      }

      rebuildTracers();
      rebuildImpacts();
      flashRemaining = Math.max(0, flashRemaining - delta);
      const flashRatio = flashRemaining / FLASH_SECONDS;
      flash.visible = flashRatio > 0;
      flash.scale.setScalar(0.7 + flashRatio * 0.7);
      flash.rotation.x += delta * 42;
      flash.rotation.y += delta * 27;
      flashMaterial.opacity = flashRatio * 0.85;
      flashLight.intensity = flashRatio * 7;
      flashLight.position.copy(flash.position);
    },
    dispose: () => {
      if (disposed) {
        return;
      }

      disposed = true;
      group.removeFromParent();
      group.clear();
      tracerGeometry.dispose();
      tracerMaterial.dispose();
      impactGeometry.dispose();
      impactMaterial.dispose();
      flashGeometry.dispose();
      flashMaterial.dispose();
    },
  };
}
