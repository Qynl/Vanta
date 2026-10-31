import { describe, expect, it, vi } from "vitest";

import { RendererUnavailableError } from "@/client/render/GameRenderer";
import { loadArenaRenderer } from "@/client/render/loading/loadArenaRenderer";

describe("arena renderer loader", () => {
  it("fails safely before generating assets when WebGL2 is unavailable", async () => {
    const onProgress = vi.fn();
    const canvas = document.createElement("canvas");

    await expect(
      loadArenaRenderer({
        canvas,
        quality: "high",
        onProgress,
      }),
    ).rejects.toBeInstanceOf(RendererUnavailableError);

    expect(onProgress).not.toHaveBeenCalled();
  });
});
