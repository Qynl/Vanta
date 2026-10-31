import { describe, expect, it } from "vitest";

import {
  GameRenderer,
  isWebGL2Supported,
  RendererUnavailableError,
} from "@/client/render/GameRenderer";

describe("game renderer", () => {
  it("detects the jsdom environment as lacking WebGL2", () => {
    expect(isWebGL2Supported()).toBe(false);
  });

  it("throws a typed error instead of creating a broken renderer", () => {
    const canvas = document.createElement("canvas");

    expect(
      () =>
        new GameRenderer({
          canvas,
          quality: "high",
        }),
    ).toThrow(RendererUnavailableError);
  });
});
