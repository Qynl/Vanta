import { useSyncExternalStore } from "react";

import type { PlayablePlayer } from "@/client/player/PlayablePlayer";

interface PlayerHudProps {
  player: PlayablePlayer;
  paused: boolean;
}

export function PlayerHud({ player, paused }: PlayerHudProps) {
  const telemetry = player.telemetry;
  const snapshot = useSyncExternalStore(
    telemetry.subscribe,
    telemetry.getSnapshot,
    telemetry.getSnapshot,
  );
  const phase = paused ? "paused" : snapshot.phase;

  return (
    <div
      role="group"
      aria-label="Player movement telemetry"
      className="pointer-events-none absolute top-12 right-4 z-10 hidden min-w-[11rem] border border-line/80 bg-void/80 px-3 py-2 backdrop-blur-[3px] sm:block"
    >
      <div className="flex items-center justify-between gap-4 border-b border-line/70 pb-1.5 font-mono text-[6px] tracking-[0.16em] text-bone/45 uppercase">
        <span>Player / 01</span>
        <span className={paused ? "text-signal" : "text-volt"}>
          {paused ? "Sim hold" : "Live"}
        </span>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
        <div>
          <dt className="font-mono text-[6px] tracking-[0.14em] text-muted uppercase">
            Speed
          </dt>
          <dd className="font-mono text-[10px] leading-none text-bone tabular-nums">
            {snapshot.horizontalSpeed.toFixed(2)}
            <span className="ml-0.5 text-[6px] text-muted">m/s</span>
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[6px] tracking-[0.14em] text-muted uppercase">
            State
          </dt>
          <dd className="font-mono text-[10px] leading-none text-volt uppercase">
            {phase}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[6px] tracking-[0.14em] text-muted uppercase">
            Tick
          </dt>
          <dd className="font-mono text-[10px] leading-none text-bone tabular-nums">
            {snapshot.tick.toString().padStart(6, "0")}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[6px] tracking-[0.14em] text-muted uppercase">
            Contact
          </dt>
          <dd className="font-mono text-[10px] leading-none text-bone uppercase">
            {snapshot.grounded ? "Ground" : "Air"}
          </dd>
        </div>
      </dl>
      <div className="mt-2 flex items-center justify-between border-t border-line/70 pt-1.5 font-mono text-[6px] tracking-[0.12em] text-bone/30 uppercase">
        <span>{snapshot.respawns} resets</span>
        <span>{snapshot.crouched ? "Crouched" : "Standing"}</span>
      </div>
    </div>
  );
}
