import type { QualityPreset } from "@/client/render/quality";

export interface RendererFrameMetrics {
  drawCalls: number;
  triangles: number;
  lines: number;
  points: number;
  textures: number;
  geometries: number;
  programs: number;
  width: number;
  height: number;
  pixelRatio: number;
  quality: QualityPreset;
  contextRecoveries: number;
}

export interface RendererPerformanceSnapshot extends RendererFrameMetrics {
  fps: number;
  frameMs: number;
  p95FrameMs: number;
  worstFrameMs: number;
  sampledFrames: number;
  updatedAt: number;
}

export interface RendererPerformanceOptions {
  /** How often subscribers receive a new snapshot. */
  publishIntervalMs?: number;
  /** Length of the rolling frame-time window. */
  windowMs?: number;
  /** Gaps longer than this are treated as a stall, not as a render frame. */
  maxFrameGapMs?: number;
}

const DEFAULT_METRICS: RendererFrameMetrics = {
  drawCalls: 0,
  triangles: 0,
  lines: 0,
  points: 0,
  textures: 0,
  geometries: 0,
  programs: 0,
  width: 0,
  height: 0,
  pixelRatio: 1,
  quality: "high",
  contextRecoveries: 0,
};

export function createEmptyPerformanceSnapshot(): RendererPerformanceSnapshot {
  return {
    ...DEFAULT_METRICS,
    fps: 0,
    frameMs: 0,
    p95FrameMs: 0,
    worstFrameMs: 0,
    sampledFrames: 0,
    updatedAt: 0,
  };
}

interface FrameSample {
  at: number;
  deltaMs: number;
}

/**
 * Coalesces per-frame renderer counters into a low-frequency snapshot. The
 * render loop can call recordFrame at display refresh without causing React
 * updates; subscribers only hear from the monitor at the publish cadence.
 */
export class RendererPerformanceMonitor {
  private readonly publishIntervalMs: number;
  private readonly windowMs: number;
  private readonly maxFrameGapMs: number;
  private readonly listeners = new Set<() => void>();
  private samples: FrameSample[] = [];
  private latestMetrics: RendererFrameMetrics = DEFAULT_METRICS;
  private lastFrameAt: number | null = null;
  private lastPublishAt = 0;
  private snapshot: RendererPerformanceSnapshot =
    createEmptyPerformanceSnapshot();

  constructor({
    publishIntervalMs = 250,
    windowMs = 2000,
    maxFrameGapMs = 500,
  }: RendererPerformanceOptions = {}) {
    this.publishIntervalMs = Math.max(50, publishIntervalMs);
    this.windowMs = Math.max(this.publishIntervalMs, windowMs);
    this.maxFrameGapMs = Math.max(100, maxFrameGapMs);
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = (): RendererPerformanceSnapshot => this.snapshot;

  recordFrame(at: number, metrics: RendererFrameMetrics): void {
    if (!Number.isFinite(at)) {
      return;
    }

    this.latestMetrics = metrics;

    if (this.lastFrameAt === null) {
      this.lastFrameAt = at;
      this.lastPublishAt = at - this.publishIntervalMs;
      this.publish(at);
      return;
    }

    const deltaMs = at - this.lastFrameAt;

    if (deltaMs <= 0) {
      return;
    }

    if (deltaMs > this.maxFrameGapMs) {
      // A hidden tab or suspended process is not a slow render frame. Drop the
      // stale window and restart calibration from the current timestamp.
      this.samples = [];
      this.lastFrameAt = at;
      this.lastPublishAt = at;
      this.publish(at);
      return;
    }

    this.samples.push({ at, deltaMs });
    this.lastFrameAt = at;

    while (
      this.samples.length > 0 &&
      at - this.samples[0]!.at > this.windowMs
    ) {
      this.samples.shift();
    }

    const maxSamples = Math.ceil(this.windowMs / 16);
    if (this.samples.length > maxSamples) {
      this.samples.splice(0, this.samples.length - maxSamples);
    }

    if (at - this.lastPublishAt >= this.publishIntervalMs) {
      this.publish(at);
    }
  }

  reset(): void {
    this.samples = [];
    this.latestMetrics = DEFAULT_METRICS;
    this.lastFrameAt = null;
    this.lastPublishAt = 0;
    this.snapshot = createEmptyPerformanceSnapshot();
    this.notify();
  }

  private publish(at: number): void {
    const count = this.samples.length;
    let frameMs = 0;
    let p95FrameMs = 0;
    let worstFrameMs = 0;
    let fps = 0;

    if (count > 0) {
      let totalMs = 0;
      const deltas = new Array<number>(count);

      for (let index = 0; index < count; index += 1) {
        const delta = this.samples[index]!.deltaMs;
        deltas[index] = delta;
        totalMs += delta;
        worstFrameMs = Math.max(worstFrameMs, delta);
      }

      frameMs = totalMs / count;
      fps = frameMs > 0 ? 1000 / frameMs : 0;

      deltas.sort((left, right) => left - right);
      const p95Index = Math.max(0, Math.ceil(count * 0.95) - 1);
      p95FrameMs = deltas[p95Index] ?? 0;
    }

    this.lastPublishAt = at;
    this.snapshot = {
      ...this.latestMetrics,
      fps,
      frameMs,
      p95FrameMs,
      worstFrameMs,
      sampledFrames: count,
      updatedAt: at,
    };
    this.notify();
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}
