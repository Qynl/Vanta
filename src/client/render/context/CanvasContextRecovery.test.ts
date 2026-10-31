import { describe, expect, it, vi } from "vitest";

import { attachCanvasContextRecovery } from "@/client/render/context/CanvasContextRecovery";

describe("canvas context recovery", () => {
  it("cancels loss, suspends once and counts browser restores", () => {
    const canvas = document.createElement("canvas");
    const onLost = vi.fn();
    const onRestored = vi.fn();
    const recovery = attachCanvasContextRecovery(canvas, {
      onLost,
      onRestored,
    });

    const firstLoss = new Event("webglcontextlost", { cancelable: true });
    canvas.dispatchEvent(firstLoss);
    canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));

    expect(firstLoss.defaultPrevented).toBe(true);
    expect(onLost).toHaveBeenCalledOnce();

    canvas.dispatchEvent(new Event("webglcontextrestored"));

    expect(onRestored).toHaveBeenCalledOnce();
    expect(onRestored).toHaveBeenCalledWith(1);
    expect(recovery.recoveryCount).toBe(1);
  });

  it("ignores unsolicited restores and removes listeners on detach", () => {
    const canvas = document.createElement("canvas");
    const onLost = vi.fn();
    const onRestored = vi.fn();
    const recovery = attachCanvasContextRecovery(canvas, {
      onLost,
      onRestored,
    });

    canvas.dispatchEvent(new Event("webglcontextrestored"));
    expect(onRestored).not.toHaveBeenCalled();

    recovery.detach();
    canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));

    expect(onLost).not.toHaveBeenCalled();
    expect(recovery.recoveryCount).toBe(0);
  });
});
