export const QUALITY_PRESETS = ["low", "medium", "high", "ultra"] as const;

export type QualityPreset = (typeof QUALITY_PRESETS)[number];

export interface QualityProfile {
  id: QualityPreset;
  label: string;
  name: string;
  description: string;
  pixelRatioCap: number;
  resolutionScale: number;
  shadows: boolean;
  shadowMapSize: number;
  fogNear: number;
  fogFar: number;
  anisotropy: number;
}

export const QUALITY_PROFILES = {
  low: {
    id: "low",
    label: "LOW",
    name: "Performance",
    description:
      "Reduced pixel density, no dynamic shadows and short visible distance.",
    pixelRatioCap: 1,
    resolutionScale: 0.75,
    shadows: false,
    shadowMapSize: 0,
    fogNear: 40,
    fogFar: 150,
    anisotropy: 1,
  },
  medium: {
    id: "medium",
    label: "MED",
    name: "Balanced",
    description:
      "Native pixels on standard displays, light sun shadows and moderate fog.",
    pixelRatioCap: 1.25,
    resolutionScale: 1,
    shadows: true,
    shadowMapSize: 1024,
    fogNear: 50,
    fogFar: 190,
    anisotropy: 2,
  },
  high: {
    id: "high",
    label: "HIGH",
    name: "Default",
    description:
      "Supersampled pixels on standard displays, 2K sun shadows and extended visibility.",
    pixelRatioCap: 1.5,
    resolutionScale: 1.15,
    shadows: true,
    shadowMapSize: 2048,
    fogNear: 60,
    fogFar: 230,
    anisotropy: 4,
  },
  ultra: {
    id: "ultra",
    label: "ULTRA",
    name: "Maximum",
    description:
      "Full 2× display density, 4K sun shadows and the longest visible distance.",
    pixelRatioCap: 2,
    resolutionScale: 1.25,
    shadows: true,
    shadowMapSize: 4096,
    fogNear: 70,
    fogFar: 280,
    anisotropy: 8,
  },
} as const satisfies Record<QualityPreset, QualityProfile>;

export const DEFAULT_QUALITY: QualityPreset = "high";

export function getQualityProfile(quality: QualityPreset): QualityProfile {
  return QUALITY_PROFILES[quality];
}

export function resolveRenderPixelRatio(
  quality: QualityPreset,
  devicePixelRatio: number,
): number {
  const profile = getQualityProfile(quality);
  const normalizedDpr =
    Number.isFinite(devicePixelRatio) && devicePixelRatio > 0
      ? devicePixelRatio
      : 1;

  return Math.min(
    normalizedDpr * profile.resolutionScale,
    profile.pixelRatioCap,
  );
}
