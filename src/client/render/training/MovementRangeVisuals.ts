import * as THREE from "three";

import type {
  RampColliderSpec,
  StaticColliderSpec,
  StaticCourseLayout,
} from "@/game/data/maps/kit/colliders";
import type { ProceduralMaterialLibrary } from "@/client/render/materials/ProceduralMaterials";

const VOLT = 0xd8ff45;
const SIGNAL = 0xff5b34;

export interface MovementRangeVisuals {
  group: THREE.Group;
  dispose: () => void;
}

function pushTriangle(
  positions: number[],
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  c: readonly [number, number, number],
): void {
  positions.push(...a, ...b, ...c);
}

/** Matches the solid triangular prism used by the physics ramp collider. */
export function createRampGeometry(
  spec: Pick<RampColliderSpec, "width" | "length" | "height">,
): THREE.BufferGeometry {
  const halfWidth = spec.width * 0.5;
  const halfLength = spec.length * 0.5;
  const a: [number, number, number] = [-halfWidth, 0, -halfLength];
  const b: [number, number, number] = [halfWidth, 0, -halfLength];
  const c: [number, number, number] = [-halfWidth, 0, halfLength];
  const d: [number, number, number] = [halfWidth, 0, halfLength];
  const e: [number, number, number] = [-halfWidth, spec.height, halfLength];
  const f: [number, number, number] = [halfWidth, spec.height, halfLength];
  const positions: number[] = [];

  pushTriangle(positions, a, b, d);
  pushTriangle(positions, a, d, c);
  pushTriangle(positions, c, d, f);
  pushTriangle(positions, c, f, e);
  pushTriangle(positions, a, f, b);
  pushTriangle(positions, a, e, f);
  pushTriangle(positions, a, c, e);
  pushTriangle(positions, b, f, d);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.name = "ramp-wedge";

  return geometry;
}

function applyCommonTransform(
  mesh: THREE.Mesh,
  spec: StaticColliderSpec,
): void {
  mesh.position.set(
    spec.position.x,
    spec.position.y,
    spec.position.z,
  );
  mesh.rotation.y = spec.yaw ?? 0;
}

/**
 * Builds visible geometry from the same serializable collider specs that the
 * Rapier compiler consumes. No hand-authored parallel course is allowed.
 */
export function createMovementRangeVisuals({
  layout,
  materials,
  origin = layout.origin ?? { x: 0, y: 0, z: 0 },
}: {
  layout: StaticCourseLayout;
  materials: ProceduralMaterialLibrary;
  origin?: { x: number; y: number; z: number };
}): MovementRangeVisuals {
  const group = new THREE.Group();
  group.name = "movement-range";
  group.position.set(origin.x, origin.y, origin.z);

  const floor = materials.getSurface("deck");
  const concrete = materials.getSurface("concrete");
  const metal = materials.getSurface("darkMetal");
  const panels = materials.getSurface("bleachedPanel");
  const hazard = materials.getSurface("hazard");
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const lineMaterial = new THREE.LineBasicMaterial({
    color: VOLT,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  });
  const startMaterial = new THREE.MeshBasicMaterial({
    color: VOLT,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const finishMaterial = new THREE.MeshBasicMaterial({
    color: SIGNAL,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const localMaterials = new Set<THREE.Material>([
    lineMaterial,
    startMaterial,
    finishMaterial,
  ]);

  const addBox = (
    name: string,
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    depth: number,
    material: THREE.Material,
    rotationY = 0,
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(unitBox, material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotationY;
    mesh.scale.set(width, height, depth);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    return mesh;
  };

  for (const spec of layout.colliders) {
    if (spec.kind === "box") {
      const isFloor =
        spec.id.includes("ground") ||
        spec.id.includes("deck") ||
        spec.id.includes("landing");
      addBox(
        `range-${spec.id}`,
        spec.position.x,
        spec.position.y,
        spec.position.z,
        spec.size.x,
        spec.size.y,
        spec.size.z,
        isFloor ? floor : spec.id.includes("catch") ? metal : concrete,
        spec.yaw ?? 0,
      );
      continue;
    }

    if (spec.kind === "ramp") {
      const mesh = new THREE.Mesh(createRampGeometry(spec), hazard);
      mesh.name = `range-${spec.id}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      applyCommonTransform(mesh, spec);
      group.add(mesh);

      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(mesh.geometry, 20),
        lineMaterial,
      );
      edges.name = `range-${spec.id}-edges`;
      edges.position.copy(mesh.position);
      edges.rotation.copy(mesh.rotation);
      group.add(edges);
      continue;
    }

    if (spec.kind === "cylinder") {
      const geometry = new THREE.CylinderGeometry(
        spec.radius,
        spec.radius,
        spec.height,
        24,
      );
      const mesh = new THREE.Mesh(geometry, panels);
      mesh.name = `range-${spec.id}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      applyCommonTransform(mesh, spec);
      group.add(mesh);
      continue;
    }

    const stairs = new THREE.Group();
    stairs.name = `range-${spec.id}`;
    const yaw = spec.yaw ?? 0;
    const totalDepth = spec.steps * spec.run;

    for (let index = 0; index < spec.steps; index += 1) {
      const stepHeight = spec.rise * (index + 1);
      const localZ = -totalDepth * 0.5 + spec.run * (index + 0.5);
      const x = spec.position.x + Math.sin(yaw) * localZ;
      const z = spec.position.z + Math.cos(yaw) * localZ;
      const step = addBox(
        `range-${spec.id}-step-${index + 1}`,
        x,
        spec.position.y + stepHeight * 0.5,
        z,
        spec.width,
        stepHeight,
        spec.run,
        metal,
        yaw,
      );
      stairs.add(step);
    }

    group.add(stairs);
  }

  const startGround = layout.colliders.find(
    (spec) => spec.id === "start-ground",
  );
  const highDeck = layout.colliders.find(
    (spec) => spec.id === "high-deck",
  );

  if (startGround?.kind === "box") {
    const top = startGround.position.y + startGround.size.y * 0.5;
    const startRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.25, 0.035, 6, 48),
      startMaterial,
    );
    startRing.name = "range-start-ring";
    startRing.rotation.x = Math.PI / 2;
    startRing.position.set(
      startGround.position.x,
      top + 0.035,
      startGround.position.z + startGround.size.z * 0.28,
    );
    group.add(startRing);

    addBox(
      "range-start-line",
      startGround.position.x,
      top + 0.006,
      startGround.position.z - startGround.size.z * 0.18,
      startGround.size.x * 0.72,
      0.012,
      0.3,
      hazard,
    );
  }

  if (highDeck?.kind === "box") {
    const top = highDeck.position.y + highDeck.size.y * 0.5;
    const finishRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.05, 0.03, 6, 40),
      finishMaterial,
    );
    finishRing.name = "range-finish-ring";
    finishRing.rotation.x = Math.PI / 2;
    finishRing.position.set(
      highDeck.position.x,
      top + 0.04,
      highDeck.position.z,
    );
    group.add(finishRing);
  }

  const startLight = new THREE.PointLight(VOLT, 24, 22, 2);
  startLight.name = "range-start-light";
  startLight.position.set(0, 4.2, -9);
  group.add(startLight);

  const finishLight = new THREE.PointLight(SIGNAL, 32, 24, 2);
  finishLight.name = "range-finish-light";
  finishLight.position.set(0, 4.5, 18);
  group.add(finishLight);

  let disposed = false;

  return {
    group,
    dispose: () => {
      if (disposed) {
        return;
      }

      disposed = true;
      group.removeFromParent();
      const geometries = new Set<THREE.BufferGeometry>();

      group.traverse((object) => {
        const renderable = object as unknown as {
          geometry?: THREE.BufferGeometry;
        };

        if (renderable.geometry) {
          geometries.add(renderable.geometry);
        }
      });

      geometries.forEach((geometry) => geometry.dispose());
      localMaterials.forEach((material) => material.dispose());
      group.clear();
    },
  };
}
