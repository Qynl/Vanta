import { describe, expect, it, vi } from "vitest";

import {
  createEmptyPerformanceSnapshot,
  RendererPerformanceMonitor,
  type RendererFrameMetrics,
} from "@/client/perf/RendererPerformance";

function metrics(
  overrides: Partial<RendererFrameMetrics> = {},
): RendererFrameMetrics {
  return {
    drawCalls: 72,
    triangles: 18420,
    lines: 0,
    points: 0,
    textures: 9,
    geometries: 28,
    programs: 4,
    width: 1920,
    height: 1080,
    pixelRatio: 1.15,
    quality: "high",
    contextRecoveries: 0,
    ...overrides,
  };
}

describe("renderer performance monitor", () => {
  it("publishes real counters before a frame window is available", () => {
    const monitor = new RendererPerformanceMonitor();
    const listener = vi.fn();
    monitor.subscribe(listener);

    monitor.recordFrame(1000, metrics({ quality: "ultra" }));

    expect(listener).toHaveBeenCalledOnce();
    expect(monitor.getSnapshot()).toMatchObject({
      quality: "ultra",
      drawCalls: 72,
      triangles: 18420,
      width: 1920,
      height: 1080,
      fps: 0,
      sampledFrames: 0,
      updatedAt: 1000,
    });
  });

  it("does not wake subscribers for every rendered frame", () => {
    const monitor = new RendererPerformanceMonitor({ publishIntervalMs: 250 });
    const listener = vi.fn();

    monitor.recordFrame(0, metrics());
    monitor.subscribe(listener);

    for (let frame = 1; frame <= 10; frame += 1) {
      monitor.recordFrame(frame * (1000 / 60), metrics());
    }

    expect(listener).not.toHaveBeenCalled();
  });

  it("computes rolling FPS, frame time and p95 at a bounded cadence", () => {
    const monitor = new RendererPerformanceMonitor({
      publishIntervalMs: 250,
      windowMs: 2000,
    });
    const listener = vi.fn();
    monitor.subscribe(listener);

    monitor.recordFrame(0, metrics());
    for (let frame = 1; frame <= 61; frame += 1) {
      monitor.recordFrame(frame * (1000 / 60), metrics());
    }

    const snapshot = monitor.getSnapshot();
    expect(snapshot.fps).toBeCloseTo(60, 4);
    expect(snapshot.frameMs).toBeCloseTo(1000 / 60, 4);
    expect(snapshot.p95FrameMs).toBeCloseTo(1000 / 60, 4);
    expect(snapshot.worstFrameMs).toBeCloseTo(1000 / 60, 4);
    expect(snapshot.sampledFrames).toBe(61);
    expect(listener.mock.calls.length).toBeLessThanOrEqual(6);
  });

  it("keeps the frame window bounded during a long session", () => {
    const monitor = new RendererPerformanceMonitor({
      windowMs: 2000,
      publishIntervalMs: 250,
    });

    monitor.recordFrame(0, metrics());
    for (let frame = 1; frame <= 60 * 600; frame += 1) {
      monitor.recordFrame(frame * (1000 / 60), metrics());
    }

    const snapshot = monitor.getSnapshot();
    expect(snapshot.fps).toBeCloseTo(60, 3);
    expect(snapshot.sampledFrames).toBeGreaterThanOrEqual(119);
    expect(snapshot.sampledFrames).toBeLessThanOrEqual(125);
  });

  it("drops suspended-tab gaps instead of reporting a false frame spike", () => {
    const monitor = new RendererPerformanceMonitor({ maxFrameGapMs: 500 });

    monitor.recordFrame(0, metrics());
    monitor.recordFrame(16.7, metrics());
    monitor.recordFrame(5000, metrics({ contextRecoveries: 1 }));

    expect(monitor.getSnapshot()).toMatchObject({
      fps: 0,
      sampledFrames: 0,
      contextRecoveries: 1,
    });
  });

  it("resets stale numbers when the render context is interrupted", () => {
    const monitor = new RendererPerformanceMonitor();
    const listener = vi.fn();

    monitor.recordFrame(0, metrics());
    monitor.recordFrame(16.7, metrics());
    monitor.subscribe(listener);
    monitor.reset();

    expect(monitor.getSnapshot()).toEqual(createEmptyPerformanceSnapshot());
    expect(listener).toHaveBeenCalledOnce();
  });
});
