import * as THREE from "three";

import type { QualityProfile } from "@/client/render/quality";

export const SURFACE_TEXTURE_KINDS = [
  "concrete",
  "metal",
  "panel",
  "floor",
  "hazard",
  "grate",
] as const;

export type SurfaceTextureKind = (typeof SURFACE_TEXTURE_KINDS)[number];

export const SURFACE_STYLE_IDS = [
  "concrete",
  "darkMetal",
  "bleachedPanel",
  "tower",
  "deck",
  "hazard",
  "grate",
] as const;

export type SurfaceStyleId = (typeof SURFACE_STYLE_IDS)[number];

interface SurfaceSpec {
  texture: SurfaceTextureKind;
  label: string;
  color: number;
  roughness: number;
  metalness: number;
  repeat: number;
  emissive?: number;
  emissiveIntensity?: number;
}

export const SURFACE_STYLES = {
  concrete: {
    texture: "concrete",
    label: "Weathered concrete",
    color: 0x555c4f,
    roughness: 0.94,
    metalness: 0.08,
    repeat: 2,
  },
  darkMetal: {
    texture: "metal",
    label: "Dark brushed metal",
    color: 0x4c5753,
    roughness: 0.46,
    metalness: 0.64,
    repeat: 3,
  },
  bleachedPanel: {
    texture: "panel",
    label: "Bleached service panel",
    color: 0x7b8273,
    roughness: 0.72,
    metalness: 0.24,
    repeat: 2,
  },
  tower: {
    texture: "panel",
    label: "Tower cladding",
    color: 0x3b433e,
    roughness: 0.82,
    metalness: 0.34,
    repeat: 4,
  },
  deck: {
    texture: "floor",
    label: "Deck plating",
    color: 0x5f6659,
    roughness: 0.9,
    metalness: 0.2,
    repeat: 10,
  },
  hazard: {
    texture: "hazard",
    label: "Hazard coating",
    color: 0xa59a6a,
    roughness: 0.74,
    metalness: 0.18,
    repeat: 2,
    emissive: 0x362707,
    emissiveIntensity: 0.08,
  },
  grate: {
    texture: "grate",
    label: "Drainage grate",
    color: 0x4b544f,
    roughness: 0.56,
    metalness: 0.58,
    repeat: 4,
  },
} as const satisfies Record<SurfaceStyleId, SurfaceSpec>;

export interface ProceduralTextureOptions {
  size?: number;
  repeat?: number;
  seed?: number;
  anisotropy?: number;
}

export interface ProceduralMaterialLibraryOptions {
  textureSize?: number;
  anisotropy?: number;
}

const MIN_TEXTURE_SIZE = 16;
const DEFAULT_TEXTURE_SIZE = 256;

function normalizedSize(value: number | undefined): number {
  if (!Number.isFinite(value) || !value) {
    return DEFAULT_TEXTURE_SIZE;
  }

  return Math.max(MIN_TEXTURE_SIZE, Math.round(value));
}

function hash2(x: number, y: number, seed: number): number {
  let hash =
    Math.imul(x, 374761393) +
    Math.imul(y, 668265263) +
    Math.imul(seed, 69069);
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  hash ^= hash >>> 16;

  return (hash >>> 0) / 4294967295;
}

function tint(
  data: Uint8Array,
  offset: number,
  red: number,
  green: number,
  blue: number,
): void {
  data[offset] = Math.max(0, Math.min(255, Math.round(red)));
  data[offset + 1] = Math.max(0, Math.min(255, Math.round(green)));
  data[offset + 2] = Math.max(0, Math.min(255, Math.round(blue)));
  data[offset + 3] = 255;
}

function concretePixel(x: number, y: number, seed: number) {
  const fine = hash2(x, y, seed);
  const coarse = hash2(x >> 3, y >> 3, seed + 17);
  const aggregate = hash2(x >> 1, y >> 1, seed + 41);
  let value = 160 + fine * 24 + coarse * 34 + aggregate * 14;

  if (fine > 0.982) {
    value -= 46;
  }

  if (coarse > 0.9) {
    value += 13;
  }

  return [value * 0.96, value, value * 0.91] as const;
}

function metalPixel(x: number, y: number, seed: number) {
  const streak = hash2(0, y, seed) * 25;
  const grain = hash2(x >> 1, y, seed + 9) * 12;
  const seam = y % 32 === 0 ? -34 : 0;
  const value = 159 + streak + grain + seam;

  return [value * 0.92, value, value * 0.96] as const;
}

function panelPixel(x: number, y: number, seed: number) {
  const noise = hash2(x, y, seed) * 13 + hash2(x >> 3, y >> 3, seed + 5) * 8;
  const border = x % 64 < 2 || y % 64 < 2;
  const inset = x % 64 === 3 || y % 64 === 3;
  const bolt =
    (x % 64 === 9 || x % 64 === 55) && (y % 64 === 9 || y % 64 === 55);
  let value = 174 + noise;

  if (border) {
    value -= 67;
  } else if (inset) {
    value += 24;
  }

  if (bolt) {
    value += 38;
  }

  return [value * 0.97, value, value * 0.91] as const;
}

function floorPixel(x: number, y: number, seed: number) {
  const noise = hash2(x, y, seed) * 18 + hash2(x >> 2, y >> 2, seed + 31) * 11;
  const seam = x % 64 < 2 || y % 64 < 2;
  const highlight = x % 64 === 2 || y % 64 === 2;
  const rivet =
    (x % 64 === 10 || x % 64 === 54) && (y % 64 === 10 || y % 64 === 54);
  let value = 145 + noise;

  if (seam) {
    value -= 54;
  } else if (highlight) {
    value += 22;
  }

  if (rivet) {
    value += 28;
  }

  return [value * 0.94, value, value * 0.87] as const;
}

function hazardPixel(x: number, y: number, seed: number) {
  const stripe = Math.floor((x + y) / 18) % 2 === 0;
  const noise = hash2(x, y, seed) * 18;
  const wear = hash2(x >> 4, y >> 4, seed + 21) > 0.86 ? -32 : 0;

  if (stripe) {
    return [202 + noise + wear, 168 + noise * 0.7 + wear, 55 + wear] as const;
  }

  return [43 + noise * 0.5, 47 + noise * 0.5, 38 + noise * 0.5] as const;
}

function gratePixel(x: number, y: number, seed: number) {
  const noise = hash2(x, y, seed) * 18;
  const bar = x % 16 < 3 || y % 16 < 3;
  const hole = x % 16 >= 5 && y % 16 >= 5;
  const value = bar ? 154 + noise : hole ? 22 + noise * 0.4 : 91 + noise;

  return [value * 0.92, value, value * 0.9] as const;
}

/**
 * Generates a deterministic surface map into a DataTexture. No canvas or DOM
 * is required, which keeps asset generation testable and Web Worker friendly.
 */
export function createSurfaceTexture(
  kind: SurfaceTextureKind,
  {
    size: requestedSize,
    repeat = 1,
    seed = 0,
    anisotropy = 4,
  }: ProceduralTextureOptions = {},
): THREE.DataTexture {
  const size = normalizedSize(requestedSize);
  const normalizedRepeat = Number.isFinite(repeat)
    ? Math.max(0.25, Math.min(repeat, 32))
    : 1;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let color: readonly [number, number, number];

      switch (kind) {
        case "concrete":
          color = concretePixel(x, y, seed);
          break;
        case "metal":
          color = metalPixel(x, y, seed);
          break;
        case "panel":
          color = panelPixel(x, y, seed);
          break;
        case "floor":
          color = floorPixel(x, y, seed);
          break;
        case "hazard":
          color = hazardPixel(x, y, seed);
          break;
        case "grate":
          color = gratePixel(x, y, seed);
          break;
      }

      tint(data, (y * size + x) * 4, color[0], color[1], color[2]);
    }
  }

  const texture = new THREE.DataTexture(
    data,
    size,
    size,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  texture.name = `vanta-surface-${kind}`;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(normalizedRepeat, normalizedRepeat);
  texture.anisotropy = Math.max(1, Math.min(16, Math.round(anisotropy)));
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;

  return texture;
}

/**
 * Shared cache for the procedural surface maps and their standard materials.
 * Textures are keyed by their repeat so every material samples at the intended
 * scale instead of mutating one shared texture.
 */
export class ProceduralMaterialLibrary {
  private readonly textureSize: number;
  private readonly textures = new Map<string, THREE.DataTexture>();
  private readonly materials = new Map<SurfaceStyleId, THREE.MeshStandardMaterial>();
  private anisotropy: number;

  constructor({
    textureSize,
    anisotropy = 4,
  }: ProceduralMaterialLibraryOptions = {}) {
    this.textureSize = normalizedSize(textureSize);
    this.anisotropy = Math.max(1, Math.min(16, Math.round(anisotropy)));
  }

  getSurface(styleId: SurfaceStyleId): THREE.MeshStandardMaterial {
    const cached = this.materials.get(styleId);

    if (cached) {
      return cached;
    }

    const style: SurfaceSpec = SURFACE_STYLES[styleId];
    const textureKey = `${style.texture}:${style.repeat}`;
    let texture = this.textures.get(textureKey);

    if (!texture) {
      texture = createSurfaceTexture(style.texture, {
        size: this.textureSize,
        repeat: style.repeat,
        seed: SURFACE_TEXTURE_KINDS.indexOf(style.texture) * 97 + 13,
        anisotropy: this.anisotropy,
      });
      this.textures.set(textureKey, texture);
    }

    const material = new THREE.MeshStandardMaterial({
      name: `vanta-${styleId}`,
      map: texture,
      color: style.color,
      roughness: style.roughness,
      metalness: style.metalness,
      emissive: style.emissive ?? 0x000000,
      emissiveIntensity: style.emissiveIntensity ?? 0,
      dithering: true,
    });
    material.userData.vantaSurfaceStyle = styleId;
    this.materials.set(styleId, material);

    return material;
  }

  setAnisotropy(anisotropy: number): void {
    const next = Math.max(1, Math.min(16, Math.round(anisotropy)));

    if (next === this.anisotropy) {
      return;
    }

    this.anisotropy = next;

    this.textures.forEach((texture) => {
      if (texture.anisotropy === next) {
        return;
      }

      texture.anisotropy = next;
      texture.needsUpdate = true;
    });
  }

  setQuality(profile: QualityProfile): void {
    this.setAnisotropy(profile.anisotropy);
  }

  getStats(): { textures: number; materials: number; pixels: number } {
    let pixels = 0;

    this.textures.forEach((texture) => {
      const image = texture.image as { width?: number; height?: number };
      pixels += (image.width ?? 0) * (image.height ?? 0);
    });

    return {
      textures: this.textures.size,
      materials: this.materials.size,
      pixels,
    };
  }

  dispose(): void {
    this.materials.forEach((material) => material.dispose());
    this.textures.forEach((texture) => texture.dispose());
    this.materials.clear();
    this.textures.clear();
  }
}
