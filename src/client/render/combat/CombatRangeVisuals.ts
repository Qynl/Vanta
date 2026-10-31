import * as THREE from "three";

import type {
  ProvingGroundsHazardDefinition,
  ProvingGroundsTargetDefinition,
} from "@/game/data/maps/provingGrounds/provingGrounds";
import type { CombatTargetSnapshot } from "@/game/sim/combat/LocalCombatSimulation";
import type { HitZone } from "@/game/sim/events/SimEventBus";
import type { ProceduralMaterialLibrary } from "@/client/render/materials/ProceduralMaterials";

const VOLT = 0xd8ff45;
const SIGNAL = 0xff5b34;
const CYAN = 0x79e6d2;
const DEAD = 0x3a2019;

interface TargetEntry {
  readonly definition: ProvingGroundsTargetDefinition;
  readonly group: THREE.Group;
  readonly body: THREE.Group;
  readonly bodyMaterial: THREE.MeshStandardMaterial;
  readonly coreMaterial: THREE.MeshBasicMaterial;
  readonly healthFill: THREE.Mesh;
  readonly shieldFill: THREE.Mesh;
  readonly bars: THREE.Group;
  readonly baseGlow: THREE.MeshBasicMaterial;
  flash: number;
  fallBlend: number;
  alive: boolean;
}

export interface CombatRangeVisuals {
  readonly group: THREE.Group;
  update: (
    targets: readonly CombatTargetSnapshot[],
    deltaSeconds: number,
    cameraPosition: { x: number; y: number; z: number },
  ) => void;
  applyHit: (targetId: string, zone: HitZone, lethal: boolean) => void;
  dispose: () => void;
}

function makeCapsule(
  radius: number,
  halfHeight: number,
): THREE.CapsuleGeometry {
  return new THREE.CapsuleGeometry(
    radius,
    Math.max(0, halfHeight * 2),
    6,
    12,
  );
}

/**
 * Visual mannequins are generated from the same head/torso/leg landmark values
 * used by the combat hitbox resolver. Their health bars and down state are read
 * directly from combat snapshots.
 */
export function createCombatRangeVisuals({
  targets,
  hazards,
  materials,
}: {
  targets: readonly ProvingGroundsTargetDefinition[];
  hazards: readonly ProvingGroundsHazardDefinition[];
  materials: ProceduralMaterialLibrary;
}): CombatRangeVisuals {
  const group = new THREE.Group();
  group.name = "proving-grounds-combat";
  const localGeometries = new Set<THREE.BufferGeometry>();
  const localMaterials = new Set<THREE.Material>();
  const entries = new Map<string, TargetEntry>();

  const trackGeometry = <T extends THREE.BufferGeometry>(geometry: T): T => {
    localGeometries.add(geometry);
    return geometry;
  };
  const trackMaterial = <T extends THREE.Material>(material: T): T => {
    localMaterials.add(material);
    return material;
  };

  const headGeometry = trackGeometry(
    new THREE.SphereGeometry(0.21, 20, 14),
  );
  const torsoGeometry = trackGeometry(makeCapsule(0.28, 0.24));
  const legGeometry = trackGeometry(makeCapsule(0.1, 0.23));
  const baseGeometry = trackGeometry(
    new THREE.CylinderGeometry(0.58, 0.68, 0.1, 24),
  );
  const shoulderGeometry = trackGeometry(
    new THREE.BoxGeometry(0.86, 0.12, 0.22),
  );
  const coreGeometry = trackGeometry(
    new THREE.TorusGeometry(0.13, 0.025, 8, 24),
  );
  const barGeometry = trackGeometry(new THREE.PlaneGeometry(1, 1));
  const sharedMetal = materials.getSurface("darkMetal");
  const sharedPanel = materials.getSurface("bleachedPanel");

  const addBar = (
    parent: THREE.Group,
    y: number,
    color: number,
    width: number,
  ): { fill: THREE.Mesh; material: THREE.MeshBasicMaterial } => {
    const backgroundMaterial = trackMaterial(
      new THREE.MeshBasicMaterial({
        color: 0x07100a,
        transparent: true,
        opacity: 0.82,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    const background = new THREE.Mesh(barGeometry, backgroundMaterial);
    background.name = `target-bar-background-${y}`;
    background.position.set(0, y, 0.02);
    background.scale.set(width + 0.035, 0.065, 1);
    parent.add(background);

    const fillMaterial = trackMaterial(
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    const fill = new THREE.Mesh(barGeometry, fillMaterial);
    fill.position.set(0, y, 0.03);
    fill.scale.set(width, 0.04, 1);
    parent.add(fill);

    return { fill, material: fillMaterial };
  };

  for (const definition of targets) {
    const targetGroup = new THREE.Group();
    targetGroup.name = `target-dummy-${definition.id}`;
    targetGroup.position.set(
      definition.position.x,
      definition.position.y,
      definition.position.z,
    );
    targetGroup.rotation.y = definition.yaw;

    const body = new THREE.Group();
    body.name = `target-body-${definition.id}`;
    targetGroup.add(body);

    const bodyMaterial = trackMaterial(
      sharedPanel.clone() as THREE.MeshStandardMaterial,
    );
    bodyMaterial.color.set(0xcfc4ae);
    bodyMaterial.emissive.set(SIGNAL);
    bodyMaterial.emissiveIntensity = 0;
    const coreMaterial = trackMaterial(
      new THREE.MeshBasicMaterial({ color: SIGNAL }),
    );

    const base = new THREE.Mesh(baseGeometry, sharedMetal);
    base.name = `target-base-${definition.id}`;
    base.position.y = 0.05;
    base.castShadow = true;
    base.receiveShadow = true;
    targetGroup.add(base);

    const baseGlowMaterial = trackMaterial(
      new THREE.MeshBasicMaterial({
        color: SIGNAL,
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    const baseGlow = new THREE.Mesh(
      trackGeometry(new THREE.TorusGeometry(0.59, 0.018, 6, 32)),
      baseGlowMaterial,
    );
    baseGlow.rotation.x = Math.PI / 2;
    baseGlow.position.y = 0.112;
    targetGroup.add(baseGlow);

    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(legGeometry, bodyMaterial);
      leg.name = `target-leg-${definition.id}-${side}`;
      leg.position.set(0.16 * side, 0.45, 0);
      leg.castShadow = true;
      body.add(leg);
    }

    const torso = new THREE.Mesh(torsoGeometry, bodyMaterial);
    torso.name = `target-torso-${definition.id}`;
    torso.position.y = 1.1;
    torso.castShadow = true;
    body.add(torso);

    const shoulders = new THREE.Mesh(shoulderGeometry, sharedMetal);
    shoulders.name = `target-shoulders-${definition.id}`;
    shoulders.position.y = 1.36;
    shoulders.castShadow = true;
    body.add(shoulders);

    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    head.name = `target-head-${definition.id}`;
    head.position.y = 1.7;
    head.castShadow = true;
    body.add(head);

    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.name = `target-core-${definition.id}`;
    core.position.set(0, 1.13, 0.29);
    body.add(core);

    const bars = new THREE.Group();
    bars.name = `target-bars-${definition.id}`;
    bars.position.y = 2.14;
    targetGroup.add(bars);
    const shield = addBar(bars, 0.09, CYAN, 0.82);
    const health = addBar(bars, 0, VOLT, 0.82);

    group.add(targetGroup);
    entries.set(definition.id, {
      definition,
      group: targetGroup,
      body,
      bodyMaterial,
      coreMaterial,
      healthFill: health.fill,
      shieldFill: shield.fill,
      bars,
      baseGlow: baseGlowMaterial,
      flash: 0,
      fallBlend: 0,
      alive: true,
    });
  }

  const hazardGroup = new THREE.Group();
  hazardGroup.name = "proving-grounds-hazards";
  const hazardMaterials: THREE.MeshBasicMaterial[] = [];
  const hazardLightMaterial = trackMaterial(
    new THREE.MeshBasicMaterial({
      color: SIGNAL,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  hazardMaterials.push(hazardLightMaterial);

  for (const hazard of hazards) {
    const ringMaterial = trackMaterial(
      new THREE.MeshBasicMaterial({
        color: SIGNAL,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    hazardMaterials.push(ringMaterial);
    const ring = new THREE.Mesh(
      trackGeometry(
        new THREE.RingGeometry(hazard.radius - 0.08, hazard.radius, 48),
      ),
      ringMaterial,
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(
      hazard.position.x,
      hazard.position.y + 0.025,
      hazard.position.z,
    );
    hazardGroup.add(ring);

    const core = new THREE.Mesh(
      trackGeometry(
        new THREE.CircleGeometry(hazard.radius - 0.12, 48),
      ),
      hazardLightMaterial,
    );
    core.rotation.x = -Math.PI / 2;
    core.position.set(
      hazard.position.x,
      hazard.position.y + 0.02,
      hazard.position.z,
    );
    hazardGroup.add(core);

    const column = new THREE.Mesh(
      trackGeometry(
        new THREE.CylinderGeometry(
          hazard.radius * 0.82,
          hazard.radius,
          hazard.height,
          32,
          1,
          true,
        ),
      ),
      hazardLightMaterial,
    );
    column.position.set(
      hazard.position.x,
      hazard.position.y + hazard.height * 0.5,
      hazard.position.z,
    );
    hazardGroup.add(column);
  }

  group.add(hazardGroup);
  let elapsed = 0;
  let disposed = false;

  return {
    group,
    update: (snapshots, deltaSeconds, cameraPosition) => {
      elapsed += Number.isFinite(deltaSeconds)
        ? Math.max(0, Math.min(deltaSeconds, 0.1))
        : 0;
      const byId = new Map(
        snapshots.map((snapshot) => [snapshot.id, snapshot]),
      );

      for (const [id, entry] of entries) {
        const snapshot = byId.get(id);

        if (!snapshot) {
          continue;
        }

        entry.flash = Math.max(0, entry.flash - deltaSeconds * 6.5);
        entry.alive = snapshot.alive;
        entry.fallBlend +=
          ((snapshot.alive ? 0 : 1) - entry.fallBlend) *
          (1 - Math.exp(-9 * Math.max(0, deltaSeconds)));
        entry.body.rotation.x = -1.18 * entry.fallBlend;
        entry.body.position.y = -0.02 * entry.fallBlend;
        entry.bodyMaterial.emissiveIntensity = snapshot.alive
          ? entry.flash * 2.4
          : 0.02;
        entry.coreMaterial.color.set(
          snapshot.alive ? SIGNAL : DEAD,
        );
        entry.baseGlow.opacity = snapshot.alive
          ? 0.32 + entry.flash * 0.35
          : 0.08;
        entry.bars.visible = snapshot.alive;
        entry.healthFill.scale.x =
          0.82 *
          Math.max(0, Math.min(1, snapshot.health / snapshot.maxHealth));
        entry.shieldFill.scale.x =
          0.82 *
          Math.max(
            0,
            Math.min(
              1,
              snapshot.maxShield > 0
                ? snapshot.shield / snapshot.maxShield
                : 0,
            ),
          );
        entry.healthFill.position.x =
          -0.41 + entry.healthFill.scale.x * 0.5;
        entry.shieldFill.position.x =
          -0.41 + entry.shieldFill.scale.x * 0.5;

        if (snapshot.alive) {
          entry.bars.lookAt(
            cameraPosition.x,
            cameraPosition.y + 0.2,
            cameraPosition.z,
          );
        }
      }

      hazardMaterials.forEach((material, index) => {
        if (index > 0) {
          material.opacity =
            0.58 + Math.sin(elapsed * 4.2 + index) * 0.13;
        }
      });
    },
    applyHit: (targetId, _zone, lethal) => {
      const entry = entries.get(targetId);

      if (!entry) {
        return;
      }

      entry.flash = lethal ? 1.8 : 1;
    },
    dispose: () => {
      if (disposed) {
        return;
      }

      disposed = true;
      group.removeFromParent();
      group.clear();
      localGeometries.forEach((geometry) => geometry.dispose());
      localMaterials.forEach((material) => material.dispose());
      entries.clear();
    },
  };
}
