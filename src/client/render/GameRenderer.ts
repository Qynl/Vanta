import * as THREE from "three";

import {
  attachCanvasContextRecovery,
  type CanvasContextRecovery,
} from "@/client/render/context/CanvasContextRecovery";
import type { ProceduralMaterialLibrary } from "@/client/render/materials/ProceduralMaterials";
import {
  getQualityProfile,
  resolveRenderPixelRatio,
  type QualityPreset,
} from "@/client/render/quality";
import {
  RendererPerformanceMonitor,
  type RendererFrameMetrics,
} from "@/client/perf/RendererPerformance";
import {
  createStagingScene,
  type ArenaScene,
} from "@/client/render/staging/StagingScene";

export class RendererUnavailableError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "RendererUnavailableError";
  }
}

export function isWebGL2Supported(): boolean {
  return typeof WebGL2RenderingContext !== "undefined";
}

export type RendererRuntimeState = "live" | "context-lost";

export interface RendererFrameController {
  update: (deltaSeconds: number, elapsedSeconds: number) => void;
  dispose: () => void;
}

interface GameRendererOptions {
  canvas: HTMLCanvasElement;
  quality: QualityPreset;
  reducedMotion?: boolean;
  fov?: number;
  materials?: ProceduralMaterialLibrary;
  onRuntimeStateChange?: (state: RendererRuntimeState) => void;
}

export class GameRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly arena: ArenaScene;
  private quality: QualityPreset;
  private reducedMotion: boolean;
  private frameHandle: number | null = null;
  private lastFrameAt = 0;
  private elapsedSeconds = 0;
  private disposed = false;
  private resizeObserver: ResizeObserver | null = null;
  private handlesWindowResize = false;
  private contextRecovery: CanvasContextRecovery | null = null;
  private contextRecoveries = 0;
  private runtimeState: RendererRuntimeState = "live";
  private frameController: RendererFrameController | null = null;
  private readonly onRuntimeStateChange:
    | ((state: RendererRuntimeState) => void)
    | undefined;
  readonly performance = new RendererPerformanceMonitor();

  constructor({
    canvas,
    quality,
    reducedMotion = false,
    fov = 100,
    materials,
    onRuntimeStateChange,
  }: GameRendererOptions) {
    if (!isWebGL2Supported()) {
      throw new RendererUnavailableError(
        "This environment does not expose a WebGL2 rendering context.",
      );
    }

    this.canvas = canvas;
    this.quality = quality;
    this.reducedMotion = reducedMotion;
    this.onRuntimeStateChange = onRuntimeStateChange;

    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        stencil: false,
        powerPreference: "high-performance",
      });
    } catch (cause) {
      throw new RendererUnavailableError(
        "The WebGL2 renderer could not be created.",
        cause,
      );
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x070b08, 1);
    this.renderer = renderer;

    try {
      this.arena = createStagingScene({ fov, materials });
    } catch (cause) {
      renderer.dispose();
      materials?.dispose();
      throw cause;
    }

    this.applyQuality(this.quality);
    this.resize();

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(this.handleResize);
      this.resizeObserver.observe(this.canvas);
    } else {
      window.addEventListener("resize", this.handleResize);
      this.handlesWindowResize = true;
    }

    this.contextRecovery = attachCanvasContextRecovery(canvas, {
      onLost: this.handleContextLost,
      onRestored: this.handleContextRestored,
    });
  }

  get runtime(): RendererRuntimeState {
    return this.runtimeState;
  }

  get scene(): THREE.Scene {
    return this.arena.scene;
  }

  get cameraRig() {
    return this.arena.cameraRig;
  }

  attachFrameController(controller: RendererFrameController): void {
    if (this.disposed) {
      throw new Error("Cannot attach a controller to a disposed renderer.");
    }

    if (this.frameController === controller) {
      return;
    }

    this.frameController?.dispose();
    this.frameController = controller;
    this.arena.setCinematicCameraEnabled(false);
  }

  start(): void {
    if (
      this.disposed ||
      this.runtimeState === "context-lost" ||
      this.frameHandle !== null
    ) {
      return;
    }

    this.lastFrameAt = performance.now();
    this.frameHandle = requestAnimationFrame(this.tick);
  }

  stop(): void {
    if (this.frameHandle === null) {
      return;
    }

    cancelAnimationFrame(this.frameHandle);
    this.frameHandle = null;
  }

  setQuality(quality: QualityPreset): void {
    if (this.disposed || this.quality === quality) {
      return;
    }

    this.quality = quality;
    this.applyQuality(quality);
  }

  setFov(fov: number): void {
    if (this.disposed) {
      return;
    }

    this.arena.setFov(fov);
  }

  setReducedMotion(reducedMotion: boolean): void {
    this.reducedMotion = reducedMotion;
  }

  prewarm(): void {
    if (this.disposed || this.runtimeState === "context-lost") {
      return;
    }

    this.arena.update(this.elapsedSeconds, 0, this.reducedMotion);
    this.renderer.compile(this.arena.scene, this.arena.camera);
    this.renderer.render(this.arena.scene, this.arena.camera);
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.stop();
    this.frameController?.dispose();
    this.frameController = null;
    this.contextRecovery?.detach();
    this.contextRecovery = null;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    if (this.handlesWindowResize) {
      window.removeEventListener("resize", this.handleResize);
      this.handlesWindowResize = false;
    }

    this.arena.dispose();
    this.renderer.dispose();
  }

  private applyQuality(quality: QualityPreset): void {
    const profile = getQualityProfile(quality);

    this.renderer.shadowMap.enabled = profile.shadows;
    this.arena.setQuality(profile);
    this.resize();
  }

  private readonly handleResize = (): void => {
    if (this.disposed) {
      return;
    }

    this.resize();
  };

  private readonly handleContextLost = (): void => {
    if (this.disposed || this.runtimeState === "context-lost") {
      return;
    }

    this.runtimeState = "context-lost";
    this.stop();
    this.performance.reset();
    this.onRuntimeStateChange?.(this.runtimeState);
  };

  private readonly handleContextRestored = (recoveryCount: number): void => {
    if (this.disposed) {
      return;
    }

    this.contextRecoveries = recoveryCount;
    this.runtimeState = "live";
    this.performance.reset();

    try {
      // Three reinitializes its GL objects on restore. Resize the new drawing
      // buffer, rebuild shadow targets, then prime programs before going live.
      this.resize();
      this.renderer.shadowMap.needsUpdate = true;
      this.prewarm();
    } catch (error) {
      this.runtimeState = "context-lost";
      this.onRuntimeStateChange?.(this.runtimeState);
      console.error("VANTA renderer failed to recover its WebGL context", error);
      return;
    }

    this.lastFrameAt = performance.now();
    this.start();
    this.onRuntimeStateChange?.(this.runtimeState);
  };

  private resize(): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    if (width <= 0 || height <= 0) {
      return;
    }

    const pixelRatio = resolveRenderPixelRatio(
      this.quality,
      window.devicePixelRatio || 1,
    );

    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.arena.setSize(width / height);
  }

  private readonly tick = (now: number): void => {
    if (this.disposed || this.runtimeState === "context-lost") {
      return;
    }

    const delta = Math.min(
      Math.max((now - this.lastFrameAt) / 1000, 0),
      0.05,
    );

    this.lastFrameAt = now;
    this.elapsedSeconds += delta;

    this.frameController?.update(delta, this.elapsedSeconds);
    this.arena.update(this.elapsedSeconds, delta, this.reducedMotion);
    this.renderer.render(this.arena.scene, this.arena.camera);
    this.performance.recordFrame(now, this.readFrameMetrics());

    this.frameHandle = requestAnimationFrame(this.tick);
  };

  private readFrameMetrics(): RendererFrameMetrics {
    const info = this.renderer.info;

    return {
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      lines: info.render.lines,
      points: info.render.points,
      textures: info.memory.textures,
      geometries: info.memory.geometries,
      programs: info.programs?.length ?? 0,
      width: this.canvas.width,
      height: this.canvas.height,
      pixelRatio: this.renderer.getPixelRatio(),
      quality: this.quality,
      contextRecoveries: this.contextRecoveries,
    };
  }
}
