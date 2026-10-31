import {
  GameRenderer,
  isWebGL2Supported,
  RendererUnavailableError,
  type RendererRuntimeState,
} from "@/client/render/GameRenderer";
import {
  ProceduralMaterialLibrary,
  SURFACE_STYLE_IDS,
  type SurfaceStyleId,
} from "@/client/render/materials/ProceduralMaterials";
import { PlayablePlayer } from "@/client/player/PlayablePlayer";
import {
  getQualityProfile,
  type QualityPreset,
} from "@/client/render/quality";

export interface RenderLoadProgress {
  percent: number;
  label: string;
}

export interface LoadArenaRendererOptions {
  canvas: HTMLCanvasElement;
  quality: QualityPreset;
  reducedMotion?: boolean;
  fov?: number;
  signal?: AbortSignal;
  onProgress?: (progress: RenderLoadProgress) => void;
  onRuntimeStateChange?: (state: RendererRuntimeState) => void;
}

export interface LoadedArenaRenderer {
  renderer: GameRenderer;
  player: PlayablePlayer;
}

export class RendererLoadAbortedError extends Error {
  constructor() {
    super("Renderer startup was cancelled.");
    this.name = "RendererLoadAbortedError";
  }
}

export class ArenaSimulationError extends Error {
  constructor(cause?: unknown) {
    super(
      "The movement simulation could not initialize. WebAssembly or a required runtime asset is unavailable.",
      { cause },
    );
    this.name = "ArenaSimulationError";
  }
}

const SURFACE_STAGE_LABELS: Record<SurfaceStyleId, string> = {
  concrete: "Casting concrete aggregate",
  darkMetal: "Brushing structural metal",
  bleachedPanel: "Printing service panels",
  tower: "Cladding distant towers",
  deck: "Laying deck plating",
  hazard: "Painting hazard boundaries",
  grate: "Cutting drainage grates",
};

function ensureActive(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new RendererLoadAbortedError();
  }
}

function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const finish = () => {
      if (settled) {
        return;
      }

      settled = true;

      if (timer !== null) {
        clearTimeout(timer);
      }

      resolve();
    };

    timer = setTimeout(finish, 80);

    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(finish);
    } else {
      finish();
    }
  });
}

/**
 * Builds the procedural staging assets in visible stages, then creates the
 * renderer. Progress is driven by completed work, not a timer: every surface
 * tick corresponds to a generated texture/material.
 */
export async function loadArenaRenderer({
  canvas,
  quality,
  reducedMotion = false,
  fov = 100,
  signal,
  onProgress,
  onRuntimeStateChange,
}: LoadArenaRendererOptions): Promise<LoadedArenaRenderer> {
  if (!isWebGL2Supported()) {
    throw new RendererUnavailableError(
      "This environment does not expose a WebGL2 rendering context.",
    );
  }

  let percent = 0;
  const report = (nextPercent: number, label: string) => {
    ensureActive(signal);
    percent = Math.max(percent, Math.min(100, Math.round(nextPercent)));
    onProgress?.({ percent, label });
  };

  const profile = getQualityProfile(quality);
  const materials = new ProceduralMaterialLibrary({
    anisotropy: profile.anisotropy,
  });
  let renderer: GameRenderer | null = null;

  try {
    report(4, "Verifying WebGL2 pipeline");
    await nextPaint();

    const total = SURFACE_STYLE_IDS.length;

    for (const [index, styleId] of SURFACE_STYLE_IDS.entries()) {
      report(
        10 + (index / total) * 42,
        `${SURFACE_STAGE_LABELS[styleId]} · ${index + 1}/${total}`,
      );
      await nextPaint();
      ensureActive(signal);
      materials.getSurface(styleId);
    }

    report(56, "Assembling staging district");
    await nextPaint();

    renderer = new GameRenderer({
      canvas,
      quality,
      reducedMotion,
      fov,
      materials,
      onRuntimeStateChange,
    });

    report(68, "Linking atmosphere and shadows");
    await nextPaint();
    ensureActive(signal);

    report(78, "Initializing player simulation");
    let player: PlayablePlayer;

    try {
      player = await PlayablePlayer.create({
        scene: renderer.scene,
        cameraRig: renderer.cameraRig,
        materials,
        reducedMotion,
      });
    } catch (cause) {
      throw new ArenaSimulationError(cause);
    }

    renderer.attachFrameController(player);
    ensureActive(signal);

    report(88, "Compiling proving grounds");
    await nextPaint();
    ensureActive(signal);
    renderer.prewarm();

    report(96, "Arming pointer lock");
    await nextPaint();
    ensureActive(signal);

    report(100, "Combat range online");
    return { renderer, player };
  } catch (error) {
    if (renderer) {
      renderer.dispose();
    } else {
      materials.dispose();
    }

    throw error;
  }
}
