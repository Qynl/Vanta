import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  createSurfaceTexture,
  ProceduralMaterialLibrary,
  SURFACE_STYLE_IDS,
  SURFACE_TEXTURE_KINDS,
} from "@/client/render/materials/ProceduralMaterials";

function textureData(texture: THREE.DataTexture): Uint8Array {
  const image = texture.image as { data: Uint8Array };
  return image.data;
}

function checksum(texture: THREE.DataTexture): number {
  return textureData(texture).reduce(
    (total, value, index) => (total + value * (index + 3)) % 1000000007,
    0,
  );
}

describe("procedural surface materials", () => {
  it("creates deterministic, distinct seamless surface maps without canvas", () => {
    for (const kind of SURFACE_TEXTURE_KINDS) {
      const first = createSurfaceTexture(kind, {
        size: 32,
        repeat: 3,
        seed: 17,
      });
      const second = createSurfaceTexture(kind, {
        size: 32,
        repeat: 3,
        seed: 17,
      });

      expect(checksum(first)).toBe(checksum(second));
      expect(first.colorSpace).toBe(THREE.SRGBColorSpace);
      expect(first.wrapS).toBe(THREE.RepeatWrapping);
      expect(first.repeat.x).toBe(3);
      expect(textureData(first)).toHaveLength(32 * 32 * 4);

      first.dispose();
      second.dispose();
    }

    const concrete = createSurfaceTexture("concrete", { size: 32, seed: 2 });
    const metal = createSurfaceTexture("metal", { size: 32, seed: 2 });
    expect(checksum(concrete)).not.toBe(checksum(metal));
    concrete.dispose();
    metal.dispose();
  });

  it("shares materials and textures through the cache", () => {
    const library = new ProceduralMaterialLibrary({
      textureSize: 32,
      anisotropy: 2,
    });
    const concrete = library.getSurface("concrete");
    const duplicate = library.getSurface("concrete");
    const metal = library.getSurface("darkMetal");

    expect(duplicate).toBe(concrete);
    expect(metal).not.toBe(concrete);
    expect(concrete.map).toBeInstanceOf(THREE.Texture);
    expect(metal.map).not.toBe(concrete.map);

    const stats = library.getStats();
    expect(stats).toEqual({
      textures: 2,
      materials: 2,
      pixels: 32 * 32 * 2,
    });

    library.setAnisotropy(8);
    expect((concrete.map as THREE.Texture).anisotropy).toBe(8);

    library.dispose();
    expect(library.getStats()).toEqual({ textures: 0, materials: 0, pixels: 0 });
  });

  it("provides a complete surface style catalogue", () => {
    const library = new ProceduralMaterialLibrary({ textureSize: 16 });

    for (const styleId of SURFACE_STYLE_IDS) {
      const material = library.getSurface(styleId);
      expect(material.map).toBeInstanceOf(THREE.Texture);
      expect(material.name).toBe(`vanta-${styleId}`);
      expect(material.userData.vantaSurfaceStyle).toBe(styleId);
    }

    expect(library.getStats().materials).toBe(SURFACE_STYLE_IDS.length);
    library.dispose();
  });
});
