import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import type { PlayablePlayer } from "@/client/player/PlayablePlayer";
import {
  PLAYER_RESPAWN_TICKS,
  type CombatTargetSnapshot,
} from "@/game/sim/combat/LocalCombatSimulation";
import { useSettingsStore } from "@/client/state/settings";

interface CombatHudProps {
  player: PlayablePlayer;
  paused: boolean;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function useViewportHeight() {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const measure = () => {
      setHeight(element.getBoundingClientRect().height);
    };

    measure();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, height };
}

function SpreadCrosshair({
  spreadRadians,
  fovDegrees,
  viewportHeight,
}: {
  spreadRadians: number;
  fovDegrees: number;
  viewportHeight: number;
}) {
  const height = viewportHeight > 0 ? viewportHeight : 420;
  const verticalFovRadians = (clamp(fovDegrees, 60, 130) * Math.PI) / 180;
  const angularGap =
    (Math.tan(clamp(spreadRadians, 0, 0.1)) /
      Math.max(0.01, Math.tan(verticalFovRadians / 2))) *
    (height / 2);
  const gap = clamp(angularGap + 3.5, 5, 44);
  const length = 7;

  return (
    <div
      data-testid="combat-crosshair"
      data-spread-radians={spreadRadians.toFixed(5)}
      className="pointer-events-none absolute inset-0 z-10"
      aria-hidden="true"
    >
      <span
        className="absolute left-1/2 h-px w-px"
        style={{
          top: `calc(50% - ${gap + length}px)`,
          height: `${length}px`,
          transform: "translateX(-50%)",
          background: "rgba(242, 238, 227, 0.9)",
        }}
      />
      <span
        className="absolute left-1/2 h-px w-px"
        style={{
          top: `calc(50% + ${gap}px)`,
          height: `${length}px`,
          transform: "translateX(-50%)",
          background: "rgba(242, 238, 227, 0.9)",
        }}
      />
      <span
        className="absolute top-1/2 h-px"
        style={{
          left: `calc(50% - ${gap + length}px)`,
          width: `${length}px`,
          transform: "translateY(-50%)",
          background: "rgba(242, 238, 227, 0.9)",
        }}
      />
      <span
        className="absolute top-1/2 h-px"
        style={{
          left: `calc(50% + ${gap}px)`,
          width: `${length}px`,
          transform: "translateY(-50%)",
          background: "rgba(242, 238, 227, 0.9)",
        }}
      />
      <span
        className="absolute top-1/2 left-1/2 h-0.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-volt"
        aria-hidden="true"
      />
    </div>
  );
}

function HitMarker({
  id,
  lethal,
}: {
  id: number;
  lethal: boolean;
}) {
  return (
    <div
      key={id}
      className={`pointer-events-none absolute top-1/2 left-1/2 z-20 h-9 w-9 -translate-x-1/2 -translate-y-1/2 ${
        lethal ? "text-signal" : "text-bone"
      } vanta-hitmarker`}
      aria-hidden="true"
    >
      {[45, 135, 225, 315].map((rotation) => (
        <span
          key={rotation}
          className="absolute top-1/2 left-1/2 h-[2px] w-2 bg-current"
          style={{
            transform: `translate(-50%, -50%) rotate(${rotation}deg) translateX(13px)`,
          }}
        />
      ))}
    </div>
  );
}

function relativeBearing(
  player: { x: number; z: number },
  source: { x: number; z: number },
  yaw: number,
): number {
  const dx = source.x - player.x;
  const dz = source.z - player.z;

  if (Math.hypot(dx, dz) < 0.0001) {
    return 0;
  }

  const forward = {
    x: -Math.sin(yaw),
    z: -Math.cos(yaw),
  };
  const right = {
    x: Math.cos(yaw),
    z: -Math.sin(yaw),
  };

  return Math.atan2(
    dx * right.x + dz * right.z,
    dx * forward.x + dz * forward.z,
  );
}

function TargetRow({ target }: { target: CombatTargetSnapshot }) {
  const shieldRatio =
    target.maxShield > 0 ? target.shield / target.maxShield : 0;
  const healthRatio =
    target.maxHealth > 0 ? target.health / target.maxHealth : 0;

  return (
    <div className="mt-2 first:mt-0">
      <div className="flex items-center justify-between gap-2 font-mono text-[6px] tracking-[0.1em] uppercase">
        <span className={target.alive ? "text-bone/70" : "text-muted/50"}>
          {target.name}
        </span>
        <span className="text-muted/60 tabular-nums">
          {target.alive
            ? `${Math.round(target.distanceMetres)}m`
            : "RESET"}
        </span>
      </div>
      <div className="mt-1 flex gap-0.5">
        <span className="h-0.5 flex-1 bg-line/70">
          <span
            className="block h-full bg-cyan transition-[width] duration-150"
            style={{ width: `${clamp(shieldRatio * 100, 0, 100)}%` }}
          />
        </span>
        <span className="h-0.5 flex-[2] bg-line/70">
          <span
            className="block h-full bg-volt transition-[width] duration-150"
            style={{ width: `${clamp(healthRatio * 100, 0, 100)}%` }}
          />
        </span>
      </div>
      <div className="mt-1 flex justify-between font-mono text-[6px] tracking-[0.08em] text-muted/45 uppercase tabular-nums">
        <span>S {Math.ceil(target.shield)}</span>
        <span>H {Math.ceil(target.health)}</span>
      </div>
    </div>
  );
}

export function CombatHud({ player, paused }: CombatHudProps) {
  const telemetry = player.combatTelemetry;
  const snapshot = useSyncExternalStore(
    telemetry.subscribe,
    telemetry.getSnapshot,
    telemetry.getSnapshot,
  );
  const fov = useSettingsStore((state) => state.fov);
  const { ref, height } = useViewportHeight();
  const state = snapshot.state;
  const alive = state.player.alive;
  const hitVisible =
    snapshot.lastHit &&
    state.tick - snapshot.lastHit.tick < 60 &&
    !paused &&
    alive;
  const hitAge =
    snapshot.lastHit && state.tick - snapshot.lastHit.tick;
  const damageVisible =
    snapshot.lastDamage &&
    state.tick - snapshot.lastDamage.tick < 150 &&
    alive;
  const respawnSeconds = Math.max(
    0,
    state.player.respawnTicksRemaining / 60,
  );
  const visibleFeed = snapshot.killfeed.filter(
    (entry) => state.tick - entry.tick < 420,
  );
  const livingTargets = state.targets.filter(
    (target) => target.alive,
  ).length;
  const lastPlayerDeath = snapshot.killfeed.find(
    (entry) => entry.victimId === "player",
  );
  const lowHealth = state.player.health <= 30;

  return (
    <div
      ref={ref}
      role="group"
      className="pointer-events-none absolute inset-0 z-10"
      aria-label="Combat HUD"
    >
      {!paused && alive && (
        <SpreadCrosshair
          spreadRadians={state.weapon.spreadRadians}
          fovDegrees={fov}
          viewportHeight={height}
        />
      )}

      {!paused && alive && hitAge !== null && hitAge < 60 && (
        <HitMarker
          id={snapshot.lastHit?.id ?? 0}
          lethal={snapshot.lastHit?.lethal ?? false}
        />
      )}

      {hitVisible && snapshot.lastHit && (
        <div
          role="status"
          aria-live="polite"
          className="absolute top-[calc(50%_+_3.25rem)] left-1/2 z-10 -translate-x-1/2 border border-line/80 bg-void/75 px-2.5 py-1 text-center backdrop-blur-[2px]"
        >
          <p
            className={`font-mono text-[7px] tracking-[0.16em] uppercase ${
              snapshot.lastHit.lethal
                ? "text-signal"
                : snapshot.lastHit.zone === "head"
                  ? "text-volt"
                  : "text-bone"
            }`}
          >
            {snapshot.lastHit.lethal
              ? "Eliminated"
              : snapshot.lastHit.zone === "head"
                ? "Headshot"
                : snapshot.lastHit.zone}
            <span className="ml-2 text-bone/60">
              {Math.round(snapshot.lastHit.amount)}
            </span>
          </p>
          <p className="mt-0.5 font-mono text-[5px] tracking-[0.12em] text-muted/60 uppercase">
            {snapshot.lastHit.targetName} /{" "}
            {snapshot.lastHit.shieldDamage > 0 &&
            snapshot.lastHit.healthDamage > 0
              ? "Shield → health"
              : snapshot.lastHit.shieldDamage > 0
                ? "Shield"
                : "Health"}
          </p>
        </div>
      )}

      {damageVisible && snapshot.lastDamage && (
        <div
          aria-label="Damage direction"
          className="absolute top-1/2 left-1/2 z-10 h-40 w-40"
          style={{
            transform: `translate(-50%, -50%) rotate(${relativeBearing(
              state.playerPosition,
              snapshot.lastDamage.sourcePosition,
              state.viewYaw,
            )}rad)`,
          }}
        >
          <span className="absolute top-0 left-1/2 h-7 w-0.5 -translate-x-1/2 bg-signal shadow-[0_0_10px_rgba(255,91,52,0.8)]" />
          <span className="absolute top-0 left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-signal/60" />
        </div>
      )}

      {!paused && !alive && (
        <div
          role="status"
          aria-live="assertive"
          className="absolute inset-0 z-20 flex items-center justify-center bg-void/50 px-6 text-center backdrop-blur-[2px]"
        >
          <div className="w-full max-w-sm border border-signal/30 bg-carbon/90 p-6">
            <p className="font-mono text-[7px] tracking-[0.22em] text-signal uppercase">
              Operator down / training respawn
            </p>
            <h3 className="mt-2 font-display text-5xl leading-none tracking-[0.04em] text-bone uppercase">
              Eliminated
            </h3>
            <p className="mt-3 font-mono text-[8px] tracking-[0.14em] text-muted uppercase">
              {lastPlayerDeath
                ? `${lastPlayerDeath.killerName} / ${lastPlayerDeath.cause}`
                : "Training hazard"}
            </p>
            <div className="mt-5 h-0.5 overflow-hidden bg-line">
              <div
                className="h-full bg-signal transition-[width] duration-100"
                style={{
                  width: `${clamp(
                    (state.player.respawnTicksRemaining /
                      PLAYER_RESPAWN_TICKS) *
                      100,
                    0,
                    100,
                  )}%`,
                }}
              />
            </div>
            <p className="mt-3 font-mono text-[10px] tracking-[0.16em] text-bone tabular-nums">
              Redeploy in {respawnSeconds.toFixed(1)}s
            </p>
          </div>
        </div>
      )}

      {visibleFeed.length > 0 && (
        <ol
          aria-label="Combat killfeed"
          aria-live="polite"
          className="absolute top-4 left-1/2 z-10 w-[min(24rem,calc(100%_-_8rem))] -translate-x-1/2 space-y-1"
        >
          {visibleFeed.slice(0, 4).map((entry) => (
            <li
              key={entry.id}
              className={`flex items-center justify-center gap-2 border border-line/60 bg-void/65 px-2.5 py-1 text-center font-mono text-[6px] tracking-[0.12em] uppercase backdrop-blur-[2px] ${
                entry.victimId === "player"
                  ? "text-signal"
                  : "text-bone/70"
              }`}
            >
              <span>{entry.killerName}</span>
              <span className="text-muted/40">▸</span>
              <span>{entry.victimName}</span>
              {entry.headshot && (
                <span className="border border-volt/30 px-1 text-volt">
                  HS
                </span>
              )}
              {entry.cause !== "rifle" && (
                <span className="text-signal/70">{entry.cause}</span>
              )}
            </li>
          ))}
        </ol>
      )}

      <section
        aria-label="Player vitals"
        className="absolute bottom-12 left-4 z-10 w-[calc(50%_-_1.5rem)] border border-line/80 bg-void/80 p-3 backdrop-blur-[3px] sm:w-[15rem]"
      >
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[6px] tracking-[0.16em] text-muted uppercase">
              Operator / 01
            </p>
            <p
              className={`mt-0.5 font-display text-4xl leading-none tracking-[0.03em] tabular-nums ${
                lowHealth ? "text-signal" : "text-bone"
              }`}
            >
              {Math.ceil(state.player.health)}
              <span className="ml-1 font-mono text-[8px] tracking-[0.08em] text-muted">
                HP
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[6px] tracking-[0.16em] text-cyan/70 uppercase">
              Shield
            </p>
            <p className="font-mono text-lg leading-none text-cyan tabular-nums">
              {Math.ceil(state.player.shield)}
            </p>
          </div>
        </div>
        <div className="mt-2 flex gap-0.5">
          <span className="h-0.5 flex-1 bg-line/60">
            <span
              className="block h-full bg-cyan transition-[width] duration-150"
              style={{
                width: `${clamp(
                  (state.player.shield / state.player.maxShield) * 100,
                  0,
                  100,
                )}%`,
              }}
            />
          </span>
          <span className="h-0.5 flex-[2] bg-line/60">
            <span
              className={`block h-full transition-[width] duration-150 ${
                lowHealth ? "bg-signal" : "bg-volt"
              }`}
              style={{
                width: `${clamp(
                  (state.player.health / state.player.maxHealth) * 100,
                  0,
                  100,
                )}%`,
              }}
            />
          </span>
        </div>
        <div className="mt-2 flex justify-between font-mono text-[6px] tracking-[0.1em] text-muted/55 uppercase">
          <span className={alive ? "text-volt/80" : "text-signal"}>
            {alive ? "Live" : "Down"}
          </span>
          <span>
            {state.match.eliminations} K / {state.match.deaths} D
          </span>
          <span>{Math.round(state.match.accuracy * 100)}% ACC</span>
        </div>
      </section>

      <section
        aria-label="Weapon and ammunition"
        className="absolute right-4 bottom-12 z-10 w-[calc(50%_-_1.5rem)] border border-line/80 bg-void/80 p-3 text-right backdrop-blur-[3px] sm:w-[15rem]"
      >
        <div className="flex items-start justify-between gap-3">
          <span className="hidden border border-line px-1.5 py-0.5 font-mono text-[6px] tracking-[0.14em] text-muted uppercase sm:inline-block">
            Hitscan
          </span>
          <div>
            <p className="font-mono text-[6px] tracking-[0.16em] text-muted uppercase">
              Primary / prototype
            </p>
            <p className="mt-0.5 font-display text-lg leading-none tracking-[0.04em] text-bone uppercase">
              {state.weapon.name}
            </p>
          </div>
        </div>
        <p className="mt-2 font-display text-4xl leading-none text-bone tabular-nums">
          {state.weapon.ammo.toString().padStart(2, "0")}
          <span className="mx-1 text-lg text-muted/50">/</span>
          <span className="text-lg text-muted tabular-nums">
            {state.weapon.reserve}
          </span>
        </p>
        <div className="mt-2 flex items-center justify-between font-mono text-[6px] tracking-[0.1em] uppercase">
          <span
            className={
              state.weapon.reloading ? "text-volt" : "text-muted/50"
            }
          >
            {state.weapon.reloading
              ? `Reloading ${Math.round(
                  state.weapon.reloadProgress * 100,
                )}%`
              : "Ready"}
          </span>
          <span className="hidden text-muted/40 sm:inline">
            LMB / Fire &nbsp; R / Reload
          </span>
        </div>
        <div className="mt-1.5 h-px overflow-hidden bg-line/70">
          <div
            className="h-full bg-volt transition-[width] duration-100"
            style={{
              width: `${
                state.weapon.reloading
                  ? clamp(state.weapon.reloadProgress * 100, 0, 100)
                  : (state.weapon.ammo / state.weapon.magazineSize) * 100
              }%`,
            }}
          />
        </div>
      </section>

      <section
        aria-label="Range target telemetry"
        className="absolute top-[11rem] right-4 z-10 hidden w-[11rem] border border-line/80 bg-void/80 p-3 backdrop-blur-[3px] lg:block"
      >
        <div className="flex items-center justify-between border-b border-line/70 pb-1.5 font-mono text-[6px] tracking-[0.14em] text-bone/45 uppercase">
          <span>Range targets</span>
          <span className="text-volt/75">
            {livingTargets}/{state.targets.length}
          </span>
        </div>
        {state.targets.map((target) => (
          <TargetRow key={target.id} target={target} />
        ))}
        <p className="mt-2 border-t border-line/60 pt-1.5 font-mono text-[5px] tracking-[0.1em] text-muted/35 uppercase">
          Head 2.0× / Legs 0.8× / Damage simulation
        </p>
      </section>
    </div>
  );
}
