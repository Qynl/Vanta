import { describe, expect, it } from "vitest";

import {
  getQualityProfile,
  QUALITY_PRESETS,
  QUALITY_PROFILES,
  resolveRenderPixelRatio,
} from "@/client/render/quality";

describe("render quality presets", () => {
  it("defines four ordered, increasingly expensive presets", () => {
    expect(QUALITY_PRESETS).toHaveLength(4);
    expect(new Set(QUALITY_PRESETS).size).toBe(4);

    const profiles = QUALITY_PRESETS.map((preset) =>
      getQualityProfile(preset),
    );

    for (let index = 1; index < profiles.length; index += 1) {
      expect(profiles[index]!.pixelRatioCap).toBeGreaterThan(
        profiles[index - 1]!.pixelRatioCap,
      );
      expect(profiles[index]!.fogFar).toBeGreaterThan(
        profiles[index - 1]!.fogFar,
      );
    }

    expect(QUALITY_PROFILES.low.shadows).toBe(false);
    expect(QUALITY_PROFILES.ultra.shadows).toBe(true);
  });

  it("resolves a distinct effective DPR for each preset", () => {
    expect(resolveRenderPixelRatio("low", 1)).toBeCloseTo(0.75);
    expect(resolveRenderPixelRatio("medium", 1)).toBe(1);
    expect(resolveRenderPixelRatio("high", 1)).toBeCloseTo(1.15);
    expect(resolveRenderPixelRatio("ultra", 1)).toBeCloseTo(1.25);
    expect(resolveRenderPixelRatio("ultra", 2)).toBe(2);
  });

  it("caps high-density displays and normalizes invalid DPR", () => {
    expect(resolveRenderPixelRatio("low", 3)).toBe(1);
    expect(resolveRenderPixelRatio("medium", 3)).toBe(1.25);
    expect(resolveRenderPixelRatio("high", 3)).toBe(1.5);
    expect(resolveRenderPixelRatio("ultra", 3)).toBe(2);
    expect(resolveRenderPixelRatio("high", Number.NaN)).toBeCloseTo(1.15);
  });
});
