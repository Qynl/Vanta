import * as THREE from "three";
import { afterEach, describe, expect, it } from "vitest";

import { ProceduralMaterialLibrary } from "@/client/render/materials/ProceduralMaterials";
import { createMovementRangeVisuals } from "@/client/render/training/MovementRangeVisuals";
import {
  MOVEMENT_RANGE,
  MOVEMENT_RANGE_ORIGIN,
} from "@/game/data/maps/kit/movementRange";

describe("movement range visuals", () => {
  let materials: ProceduralMaterialLibrary | null = null;
  let visuals: ReturnType<typeof createMovementRangeVisuals> | null = null;

  afterEach(() => {
    visuals?.dispose();
    visuals = null;
    materials?.dispose();
    materials = null;
  });

  it("uses the physics layout as its only geometry source", () => {
    materials = new ProceduralMaterialLibrary({ textureSize: 32 });
    visuals = createMovementRangeVisuals({
      layout: MOVEMENT_RANGE,
      materials,
    });

    const group = visuals.group;
    expect(group.name).toBe("movement-range");
    expect(group.position.toArray()).toEqual([
      MOVEMENT_RANGE_ORIGIN.x,
      MOVEMENT_RANGE_ORIGIN.y,
      MOVEMENT_RANGE_ORIGIN.z,
    ]);

    group.updateMatrixWorld(true);
    const ground = group.getObjectByName(
      "range-start-ground",
    ) as THREE.Mesh;
    const bounds = new THREE.Box3().setFromObject(ground);

    expect(bounds.min.x).toBeCloseTo(-31, 4);
    expect(bounds.max.x).toBeCloseTo(-25, 4);
    expect(bounds.min.y).toBeCloseTo(7, 4);
    expect(bounds.max.y).toBeCloseTo(8, 4);
    expect(bounds.min.z).toBeCloseTo(28, 4);
    expect(bounds.max.z).toBeCloseTo(44, 4);

    const stairs = group.getObjectByName("range-stairs");
    expect(stairs).toBeInstanceOf(THREE.Group);
    expect(stairs?.children).toHaveLength(5);

    const ramp = group.getObjectByName(
      "range-ramp",
    ) as THREE.Mesh<THREE.BufferGeometry>;
    ramp.geometry.computeBoundingBox();
    const rampSize = new THREE.Vector3();
    ramp.geometry.boundingBox?.getSize(rampSize);
    expect(rampSize.x).toBeCloseTo(5.4, 5);
    expect(rampSize.y).toBeCloseTo(1.2, 5);
    expect(rampSize.z).toBeCloseTo(4, 5);

    expect(group.getObjectByName("range-start-ring")).toBeDefined();
    expect(group.getObjectByName("range-finish-ring")).toBeDefined();
    expect(group.getObjectByName("range-start-light")).toBeDefined();
  });

  it("disposes range-only geometry without touching shared surfaces", () => {
    materials = new ProceduralMaterialLibrary({ textureSize: 32 });
    visuals = createMovementRangeVisuals({
      layout: MOVEMENT_RANGE,
      materials,
    });

    const range = visuals.group;
    const unitBox = (
      range.getObjectByName("range-start-ground") as THREE.Mesh
    ).geometry;
    visuals.dispose();
    visuals = null;

    expect(range.children).toHaveLength(0);
    expect(unitBox.attributes.position).toBeDefined();
    expect(materials.getStats().materials).toBeGreaterThan(0);
  });
});
