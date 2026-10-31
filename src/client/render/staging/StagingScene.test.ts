import * as THREE from "three";
import { afterEach, describe, expect, it } from "vitest";

import { ProceduralMaterialLibrary } from "@/client/render/materials/ProceduralMaterials";
import { getQualityProfile } from "@/client/render/quality";
import {
  createStagingScene,
  type ArenaScene,
} from "@/client/render/staging/StagingScene";

describe("staging scene", () => {
  let arena: ArenaScene | null = null;
  let materials: ProceduralMaterialLibrary | null = null;

  const createArena = () => {
    materials = new ProceduralMaterialLibrary({ textureSize: 32 });
    arena = createStagingScene({ materials, fov: 96 });
    return { arena, materials };
  };

  afterEach(() => {
    arena?.dispose();
    arena = null;
    materials = null;
  });

  it("builds a textured staging world with sky, landmarks and fog", () => {
    const created = createArena();

    expect(created.arena.scene.name).toBe("VANTA staging scene");
    expect(created.arena.scene.children.length).toBeGreaterThan(5);
    expect(created.arena.scene.fog).toBeInstanceOf(THREE.Fog);
    expect(created.arena.camera).toBeInstanceOf(THREE.PerspectiveCamera);
    expect(created.arena.camera.fov).toBe(96);
    expect(created.arena.scene.getObjectByName("staging-platform")).toBeDefined();
    expect(created.arena.scene.getObjectByName("beacon")).toBeDefined();
    expect(created.arena.scene.getObjectByName("sky-dome")).toBeDefined();
    expect(created.arena.scene.getObjectByName("distant-skyline")).toBeDefined();
    expect(created.arena.scene.getObjectByName("hazard-ring")).toBeDefined();

    const ground = created.arena.scene.getObjectByName(
      "ground",
    ) as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
    expect(ground.material.map).toBeInstanceOf(THREE.Texture);
    expect(created.materials.getStats().materials).toBeGreaterThan(0);
  });

  it("includes the full greybox zones used for the baseline", () => {
    const created = createArena();
    const { scene } = created.arena;

    expect(scene.getObjectByName("elevated-catwalk")).toBeDefined();
    expect(scene.getObjectByName("catwalk-deck")).toBeDefined();
    expect(scene.getObjectByName("catwalk-stairs")).toBeDefined();
    expect(scene.getObjectByName("catwalk-rail-posts")).toBeDefined();
    expect(scene.getObjectByName("cargo-bank")).toBeDefined();
    expect(scene.getObjectByName("cargo-container-4")).toBeDefined();
    expect(scene.getObjectByName("floodlight-masts")).toBeDefined();
    expect(scene.getObjectByName("service-pipe-run")).toBeDefined();
    expect(scene.getObjectByName("perimeter-cover-4")).toBeDefined();

    const stairs = scene.getObjectByName(
      "catwalk-stairs",
    ) as THREE.InstancedMesh;
    expect(stairs.count).toBe(13);

    let triangles = 0;
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) {
        return;
      }

      const geometry = object.geometry;
      const triangleCount =
        (geometry.index?.count ?? geometry.attributes.position?.count ?? 0) / 3;
      const instances =
        object instanceof THREE.InstancedMesh ? object.count : 1;
      triangles += triangleCount * instances;
    });

    expect(triangles).toBeGreaterThan(2000);
    expect(triangles).toBeLessThan(25_000);
  });

  it("updates projection from viewport and FOV settings", () => {
    const created = createArena();
    created.arena.setSize(16 / 9);
    created.arena.setFov(112);

    expect(created.arena.camera.aspect).toBeCloseTo(16 / 9);
    expect(created.arena.camera.fov).toBe(112);
    expect(created.arena.camera.projectionMatrix.elements.length).toBe(16);
  });

  it("applies quality settings to fog, shadows, anisotropy and resolution", () => {
    const created = createArena();
    const sun = created.arena.scene.getObjectByName(
      "key-light",
    ) as THREE.DirectionalLight;
    const concrete = created.materials.getSurface("concrete");
    const concreteMap = concrete.map as THREE.Texture;

    created.arena.setQuality(getQualityProfile("low"));
    expect((created.arena.scene.fog as THREE.Fog).near).toBe(40);
    expect((created.arena.scene.fog as THREE.Fog).far).toBe(150);
    expect(sun.castShadow).toBe(false);
    expect(concreteMap.anisotropy).toBe(1);

    created.arena.setQuality(getQualityProfile("ultra"));
    expect((created.arena.scene.fog as THREE.Fog).far).toBe(280);
    expect(sun.castShadow).toBe(true);
    expect(sun.shadow.mapSize.x).toBe(4096);
    expect(concreteMap.anisotropy).toBe(8);
  });

  it("runs motion updates and releases scene, textures and materials", () => {
    const created = createArena();
    const scene = created.arena.scene;

    expect(() => created.arena.update(12, 1 / 60, false)).not.toThrow();
    expect(() => created.arena.update(12, 1 / 60, true)).not.toThrow();

    created.arena.dispose();
    arena = null;

    expect(scene.children).toHaveLength(0);
    expect(created.materials.getStats()).toEqual({
      textures: 0,
      materials: 0,
      pixels: 0,
    });
  });
});
