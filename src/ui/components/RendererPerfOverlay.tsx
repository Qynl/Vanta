import { useSyncExternalStore } from "react";

import type { GameRenderer } from "@/client/render/GameRenderer";

interface RendererPerfOverlayProps {
  renderer: GameRenderer;
}

function compact(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}m`;
  }

  if (value >= 10_000) {
    return `${Math.round(value / 1000)}k`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }

  return value.toString();
}

function Metric({
  label,
  value,
  tone = "text-bone",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div>
      <dt className="font-mono text-[6px] tracking-[0.16em] text-muted uppercase">
        {label}
      </dt>
      <dd
        aria-label={`${label}: ${value}`}
        className={`mt-0.5 font-mono text-[10px] leading-none tabular-nums ${tone}`}
      >
        {value}
      </dd>
    </div>
  );
}

export function RendererPerfOverlay({ renderer }: RendererPerfOverlayProps) {
  const monitor = renderer.performance;
  const snapshot = useSyncExternalStore(
    monitor.subscribe,
    monitor.getSnapshot,
    monitor.getSnapshot,
  );

  const calibrating = snapshot.sampledFrames === 0;
  const fpsTone = calibrating
    ? "text-bone/45"
    : snapshot.fps >= 55
      ? "text-volt"
      : "text-signal";
  const resolution =
    snapshot.width > 0
      ? `${snapshot.width}×${snapshot.height}`
      : "awaiting buffer";

  return (
    <div
      role="group"
      aria-label="Live renderer performance"
      data-perf-samples={snapshot.sampledFrames}
      className="pointer-events-none absolute top-12 left-4 z-10 w-[13.5rem] border border-line/80 bg-void/85 p-3 backdrop-blur-[3px]"
    >
      <div className="flex items-center justify-between border-b border-line pb-2">
        <span className="flex items-center gap-1.5 font-mono text-[7px] tracking-[0.2em] text-bone/70 uppercase">
          <span aria-hidden="true" className="h-1 w-1 bg-volt" />
          Perf feed
        </span>
        <span
          className={`font-mono text-[6px] tracking-[0.16em] uppercase ${fpsTone}`}
        >
          {calibrating ? "Calibrating" : "Live"}
        </span>
      </div>

      <dl className="mt-2 grid grid-cols-3 gap-x-3 gap-y-2">
        <Metric
          label="FPS"
          value={calibrating ? "—" : Math.round(snapshot.fps).toString()}
          tone={fpsTone}
        />
        <Metric
          label="Frame"
          value={calibrating ? "—" : snapshot.frameMs.toFixed(1)}
          tone={fpsTone}
        />
        <Metric
          label="P95"
          value={calibrating ? "—" : snapshot.p95FrameMs.toFixed(1)}
        />
        <Metric label="Calls" value={compact(snapshot.drawCalls)} />
        <Metric label="Tris" value={compact(snapshot.triangles)} />
        <Metric label="Textures" value={compact(snapshot.textures)} />
      </dl>

      <div className="mt-2 border-t border-line/70 pt-2">
        <div className="flex items-center justify-between gap-2 font-mono text-[6px] tracking-[0.12em] text-bone/35 uppercase">
          <span>
            {resolution} / DPR {snapshot.pixelRatio.toFixed(2)}×
          </span>
          <span>{snapshot.quality}</span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2 font-mono text-[6px] tracking-[0.12em] text-bone/25 uppercase">
          <span>
            GEO {compact(snapshot.geometries)} / PROG {compact(snapshot.programs)}
          </span>
          <span>F3 toggle</span>
        </div>
      </div>

      {snapshot.contextRecoveries > 0 && (
        <p className="mt-2 border-t border-line/70 pt-2 font-mono text-[6px] tracking-[0.14em] text-signal uppercase">
          Context restored ×{snapshot.contextRecoveries}
        </p>
      )}
    </div>
  );
}
