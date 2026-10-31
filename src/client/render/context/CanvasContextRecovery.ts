export interface CanvasContextRecoveryHandlers {
  onLost: () => void;
  onRestored: (recoveryCount: number) => void;
}

export interface CanvasContextRecovery {
  detach: () => void;
  readonly recoveryCount: number;
}

/**
 * Owns the WebGL context lifecycle listeners for a canvas. Three.js registers
 * its own listeners first and reinitializes its GL state on restore; these
 * listeners only coordinate game-loop suspension, UI state and recovery count.
 */
export function attachCanvasContextRecovery(
  canvas: HTMLCanvasElement,
  handlers: CanvasContextRecoveryHandlers,
): CanvasContextRecovery {
  let lost = false;
  let detached = false;
  let recoveryCount = 0;

  const handleLost = (event: Event) => {
    event.preventDefault();

    if (detached || lost) {
      return;
    }

    lost = true;
    handlers.onLost();
  };

  const handleRestored = () => {
    if (detached || !lost) {
      return;
    }

    lost = false;
    recoveryCount += 1;
    handlers.onRestored(recoveryCount);
  };

  canvas.addEventListener("webglcontextlost", handleLost);
  canvas.addEventListener("webglcontextrestored", handleRestored);

  return {
    detach: () => {
      if (detached) {
        return;
      }

      detached = true;
      canvas.removeEventListener("webglcontextlost", handleLost);
      canvas.removeEventListener("webglcontextrestored", handleRestored);
    },
    get recoveryCount() {
      return recoveryCount;
    },
  };
}
