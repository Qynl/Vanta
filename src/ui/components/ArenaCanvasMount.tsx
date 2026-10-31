import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Crosshair, LockKeyhole, MousePointer2 } from "lucide-react";

import {
  InputController,
  type PointerLockStatus,
} from "@/client/input/InputController";
import type { PlayablePlayer } from "@/client/player/PlayablePlayer";
import {
  RendererUnavailableError,
  type GameRenderer,
} from "@/client/render/GameRenderer";
import {
  ArenaSimulationError,
  loadArenaRenderer,
  RendererLoadAbortedError,
  type RenderLoadProgress,
} from "@/client/render/loading/loadArenaRenderer";
import {
  getQualityProfile,
  QUALITY_PRESETS,
  resolveRenderPixelRatio,
} from "@/client/render/quality";
import { useSettingsStore } from "@/client/state/settings";
import { CombatHud } from "@/ui/hud/CombatHud";
import { PlayerHud } from "@/ui/components/PlayerHud";
import { RendererPerfOverlay } from "@/ui/components/RendererPerfOverlay";

type RendererState = "starting" | "online" | "context-lost" | "unavailable";

const STATUS_LABEL: Record<RendererState, string> = {
  starting: "Starting renderer",
  online: "Renderer online",
  "context-lost": "Context lost / recovering",
  unavailable: "Runtime unavailable",
};

function createRendererStatusStore() {
  let state: RendererState = "starting";
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    set: (nextState: RendererState) => {
      if (state === nextState) {
        return;
      }

      state = nextState;
      listeners.forEach((listener) => listener());
    },
  };
}

const INITIAL_POINTER_LOCK: PointerLockStatus = {
  locked: false,
  supported: true,
  error: null,
};

export function ArenaCanvasMount() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const playerRef = useRef<PlayablePlayer | null>(null);
  const inputRef = useRef<InputController | null>(null);
  const [statusStore] = useState(createRendererStatusStore);
  const [renderer, setRenderer] = useState<GameRenderer | null>(null);
  const [player, setPlayer] = useState<PlayablePlayer | null>(null);
  const [pointerLock, setPointerLock] = useState<PointerLockStatus>(
    INITIAL_POINTER_LOCK,
  );
  const [startupError, setStartupError] = useState<string | null>(null);
  const [showPerf, setShowPerf] = useState(true);
  const [loadProgress, setLoadProgress] = useState<RenderLoadProgress>({
    percent: 0,
    label: "Preparing viewport",
  });
  const rendererState = useSyncExternalStore(
    statusStore.subscribe,
    statusStore.getSnapshot,
    statusStore.getSnapshot,
  );

  const quality = useSettingsStore((state) => state.quality);
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);
  const fov = useSettingsStore((state) => state.fov);
  const sensitivity = useSettingsStore((state) => state.sensitivity);
  const invertY = useSettingsStore((state) => state.invertY);
  const toggleSprint = useSettingsStore((state) => state.toggleSprint);
  const updateSetting = useSettingsStore((state) => state.updateSetting);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key !== "F3" ||
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      ) {
        return;
      }

      event.preventDefault();
      setShowPerf((visible) => !visible);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    let mounted = true;
    const abortController = new AbortController();

    void (async () => {
      try {
        const currentSettings = useSettingsStore.getState();
        const loaded = await loadArenaRenderer({
          canvas,
          quality: currentSettings.quality,
          reducedMotion: currentSettings.reducedMotion,
          fov: currentSettings.fov,
          signal: abortController.signal,
          onProgress: (progress) => {
            if (mounted) {
              setLoadProgress(progress);
            }
          },
          onRuntimeStateChange: (runtimeState) => {
            if (!mounted) {
              return;
            }

            statusStore.set(
              runtimeState === "live" ? "online" : "context-lost",
            );
          },
        });

        if (!mounted || abortController.signal.aborted) {
          loaded.renderer.dispose();
          return;
        }

        const latestSettings = useSettingsStore.getState();
        loaded.renderer.setQuality(latestSettings.quality);
        loaded.renderer.setFov(latestSettings.fov);
        loaded.renderer.setReducedMotion(latestSettings.reducedMotion);
        rendererRef.current = loaded.renderer;
        playerRef.current = loaded.player;

        const input = new InputController({
          target: canvas,
          toggleSprint: latestSettings.toggleSprint,
          onPointerLockChange: (status) => {
            if (mounted) {
              setPointerLock(status);
            }
          },
        });
        loaded.player.setInputSource(input);
        loaded.player.setSettings({
          sensitivity: latestSettings.sensitivity,
          invertY: latestSettings.invertY,
          reducedMotion: latestSettings.reducedMotion,
        });
        loaded.player.setPaused(true);

        inputRef.current = input;
        setPointerLock(input.pointerLock);
        setRenderer(loaded.renderer);
        setPlayer(loaded.player);
        loaded.renderer.start();
        statusStore.set("online");
      } catch (error) {
        if (
          !mounted ||
          abortController.signal.aborted ||
          error instanceof RendererLoadAbortedError
        ) {
          return;
        }

        if (!(error instanceof RendererUnavailableError)) {
          console.error("VANTA renderer failed to start", error);
        }

        setStartupError(
          error instanceof ArenaSimulationError ? error.message : null,
        );
        inputRef.current?.dispose();
        inputRef.current = null;
        rendererRef.current?.dispose();
        rendererRef.current = null;
        playerRef.current = null;
        statusStore.set("unavailable");
      }
    })();

    return () => {
      mounted = false;
      abortController.abort();
      inputRef.current?.dispose();
      inputRef.current = null;
      playerRef.current = null;
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, [statusStore]);

  useEffect(() => {
    rendererRef.current?.setQuality(quality);
  }, [quality]);

  useEffect(() => {
    rendererRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  useEffect(() => {
    rendererRef.current?.setFov(fov);
  }, [fov]);

  useEffect(() => {
    playerRef.current?.setSettings({
      sensitivity,
      invertY,
      reducedMotion,
    });
    inputRef.current?.setToggleSprint(toggleSprint);
  }, [sensitivity, invertY, reducedMotion, toggleSprint]);

  useEffect(() => {
    playerRef.current?.setPaused(!pointerLock.locked);
  }, [pointerLock.locked, player]);

  const engage = () => {
    inputRef.current?.requestPointerLock();
  };

  const profile = getQualityProfile(quality);
  const effectivePixelRatio = resolveRenderPixelRatio(
    quality,
    typeof window === "undefined" ? 1 : window.devicePixelRatio,
  );
  const statusColor =
    rendererState === "online"
      ? "bg-volt"
      : rendererState === "unavailable" || rendererState === "context-lost"
        ? "bg-signal"
        : "bg-muted";

  return (
    <div className="hud-panel relative overflow-hidden bg-void">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <Crosshair aria-hidden="true" className="h-3.5 w-3.5 text-volt" />
          <span className="font-mono text-[8px] tracking-[0.2em] text-bone uppercase">
            Viewport / 01
          </span>
        </div>
        <span
          aria-live="polite"
          className="flex items-center gap-2 font-mono text-[7px] tracking-[0.16em] text-muted uppercase"
        >
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 ${statusColor} ${
              rendererState === "starting" ? "status-pulse" : ""
            }`}
          />
          {STATUS_LABEL[rendererState]}
        </span>
      </div>

      <div className="relative aspect-[16/10] overflow-hidden bg-[#050805] sm:aspect-[16/9]">
        <canvas
          ref={canvasRef}
          id="game-viewport"
          data-renderer-state={rendererState}
          data-quality={quality}
          data-player-state={
            pointerLock.locked ? "live" : "paused"
          }
          role="img"
          aria-label={
            rendererState === "online"
              ? pointerLock.locked
                ? "Live VANTA proving grounds combat range"
                : "VANTA proving grounds, awaiting pointer lock"
              : rendererState === "context-lost"
                ? "VANTA viewport waiting for render context recovery"
                : rendererState === "unavailable"
                  ? "VANTA runtime unavailable"
                  : "VANTA gameplay viewport"
          }
          className="absolute inset-0 block h-full w-full"
        />

        <div
          aria-hidden="true"
          className="render-vignette pointer-events-none absolute inset-0"
        />
        <div
          aria-hidden="true"
          className="scanline-overlay pointer-events-none absolute inset-0 opacity-15"
        />

        <div className="pointer-events-none absolute top-4 left-4 border border-volt/20 bg-void/70 px-2 py-1 font-mono text-[7px] tracking-[0.16em] text-volt uppercase">
          Sector 09 / proving grounds
        </div>
        <div className="pointer-events-none absolute top-4 right-4 hidden text-right font-mono text-[7px] tracking-[0.16em] text-bone/50 uppercase sm:block">
          <p>{profile.label} / {effectivePixelRatio.toFixed(2)}×</p>
          <p className="mt-1 text-bone/30">WebGL2 / ACES</p>
        </div>

        {rendererState === "online" && renderer && showPerf && (
          <RendererPerfOverlay renderer={renderer} />
        )}

        {rendererState === "online" && player && (
          <PlayerHud player={player} paused={!pointerLock.locked} />
        )}

        {rendererState === "online" && player && (
          <CombatHud
            player={player}
            paused={!pointerLock.locked}
          />
        )}

        {rendererState === "online" && player && !pointerLock.locked && (
          <div className="absolute inset-0 z-20 flex items-start justify-center overflow-y-auto bg-void/55 px-5 py-6 backdrop-blur-[2px] sm:items-center">
            <div className="w-full max-w-md border border-line bg-carbon/90 p-5 text-center shadow-2xl sm:p-6">
              <div className="mx-auto flex h-11 w-11 items-center justify-center border border-volt/30 bg-volt/5">
                <LockKeyhole
                  aria-hidden="true"
                  className="h-4 w-4 text-volt"
                />
              </div>
              <p className="mt-4 font-mono text-[7px] tracking-[0.22em] text-volt uppercase">
                Proving grounds / combat 01
              </p>
              <h3 className="mt-2 font-display text-4xl leading-none tracking-[0.04em] text-bone uppercase">
                Enter the range
              </h3>
              <p className="mx-auto mt-3 max-w-xs text-xs leading-5 text-muted">
                Three live target dummies ahead, a damage-calibration pad to the
                right and a movement wing west. Pointer lock is required.
              </p>

              <button
                type="button"
                onClick={engage}
                disabled={!pointerLock.supported}
                className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 bg-volt px-5 font-mono text-[9px] tracking-[0.18em] text-void uppercase transition-colors hover:bg-bone disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
              >
                <MousePointer2 aria-hidden="true" className="h-3.5 w-3.5" />
                {pointerLock.supported
                  ? "Engage pointer lock"
                  : "Pointer lock unavailable"}
              </button>

              {!pointerLock.supported && (
                <p className="mt-3 font-mono text-[7px] leading-4 tracking-[0.12em] text-signal uppercase">
                  Use a desktop browser with keyboard and mouse.
                </p>
              )}

              {pointerLock.error && (
                <p
                  role="alert"
                  className="mt-3 border border-signal/30 bg-signal/5 px-3 py-2 font-mono text-[7px] leading-4 tracking-[0.12em] text-signal uppercase"
                >
                  {pointerLock.error}
                </p>
              )}

              <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line pt-4 text-left">
                <div>
                  <dt className="font-mono text-[6px] tracking-[0.14em] text-muted uppercase">
                    Move
                  </dt>
                  <dd className="mt-0.5 font-mono text-[8px] tracking-[0.1em] text-bone uppercase">
                    WASD
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[6px] tracking-[0.14em] text-muted uppercase">
                    Jump
                  </dt>
                  <dd className="mt-0.5 font-mono text-[8px] tracking-[0.1em] text-bone uppercase">
                    Space
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[6px] tracking-[0.14em] text-muted uppercase">
                    Sprint
                  </dt>
                  <dd className="mt-0.5 font-mono text-[8px] tracking-[0.1em] text-bone uppercase">
                    Shift
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[6px] tracking-[0.14em] text-muted uppercase">
                    Crouch
                  </dt>
                  <dd className="mt-0.5 font-mono text-[8px] tracking-[0.1em] text-bone uppercase">
                    C
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[6px] tracking-[0.14em] text-muted uppercase">
                    Fire
                  </dt>
                  <dd className="mt-0.5 font-mono text-[8px] tracking-[0.1em] text-bone uppercase">
                    Mouse 1
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[6px] tracking-[0.14em] text-muted uppercase">
                    Reload
                  </dt>
                  <dd className="mt-0.5 font-mono text-[8px] tracking-[0.1em] text-bone uppercase">
                    R
                  </dd>
                </div>
              </dl>

              <p className="mt-4 font-mono text-[7px] leading-4 tracking-[0.12em] text-bone/35 uppercase">
                Red-light pad inflicts real damage and tests death/respawn.
                Esc releases the mouse and pauses simulation.
              </p>
            </div>
          </div>
        )}

        {rendererState === "starting" && (
          <div
            role="status"
            className="absolute inset-0 flex items-center justify-center bg-void/40 px-6 text-center"
          >
            <div className="w-full max-w-sm">
              <div className="mx-auto h-12 w-12 animate-pulse rounded-full border border-volt/20" />
              <p className="mt-5 font-mono text-[8px] tracking-[0.22em] text-volt uppercase">
                Initializing render core
              </p>
              <p className="mt-2 font-mono text-[7px] tracking-[0.14em] text-muted uppercase">
                WebGL2 / {profile.label}
              </p>
              <div
                role="progressbar"
                aria-label="Renderer startup progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={loadProgress.percent}
                className="mt-6 h-0.5 overflow-hidden bg-line"
              >
                <div
                  className="h-full bg-volt transition-[width] duration-200"
                  style={{ width: `${loadProgress.percent}%` }}
                />
              </div>
              <div className="mt-2 flex items-start justify-between gap-4 text-left font-mono text-[7px] tracking-[0.14em] uppercase">
                <span className="text-bone/55">{loadProgress.label}</span>
                <span className="shrink-0 text-volt">
                  {loadProgress.percent.toString().padStart(3, "0")}%
                </span>
              </div>
            </div>
          </div>
        )}

        {rendererState === "context-lost" && (
          <div
            role="status"
            aria-live="polite"
            className="absolute inset-0 z-20 flex items-center justify-center bg-void/75 px-6 text-center backdrop-blur-[2px]"
          >
            <div className="max-w-sm">
              <div
                aria-hidden="true"
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-signal/25"
              >
                <span className="h-1.5 w-1.5 animate-pulse bg-signal" />
              </div>
              <p className="mt-5 font-mono text-[8px] tracking-[0.22em] text-signal uppercase">
                Render context interrupted
              </p>
              <p className="mt-2 font-display text-3xl tracking-[0.05em] text-bone/80 uppercase">
                Rebuilding GPU state
              </p>
              <p className="mt-3 text-xs leading-5 text-muted">
                The frame loop is paused. When the browser restores the GPU
                context, VANTA rebuilds shadows and render targets automatically
                — no reload required.
              </p>
              <p className="mt-4 font-mono text-[7px] tracking-[0.16em] text-bone/35 uppercase">
                Scene retained / automatic recovery armed
              </p>
            </div>
          </div>
        )}

        {rendererState === "unavailable" && (
          <div
            role="status"
            className="absolute inset-0 flex items-center justify-center bg-void/70 px-6 text-center backdrop-blur-[2px]"
          >
            <div className="max-w-sm">
              <div
                aria-hidden="true"
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-signal/25"
              >
                <span className="h-1.5 w-1.5 bg-signal" />
              </div>
              <p className="mt-5 font-mono text-[8px] tracking-[0.22em] text-signal uppercase">
                {startupError
                  ? "Simulation unavailable"
                  : "WebGL2 unavailable"}
              </p>
              <p className="mt-2 font-display text-3xl tracking-[0.05em] text-bone/80 uppercase">
                {startupError ? "No physics runtime" : "No render context"}
              </p>
              <p className="mt-3 text-xs leading-5 text-muted">
                {startupError ??
                  "This browser or environment does not expose WebGL2. The interface and calibration settings remain available."}
              </p>
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute right-4 bottom-4 left-4 flex flex-wrap items-center justify-between gap-2 border-t border-bone/10 pt-3 font-mono text-[7px] tracking-[0.16em] text-bone/35 uppercase">
          <span>Canvas / #game-viewport</span>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline">
              {pointerLock.locked
                ? "Proving grounds / simulation live"
                : "Proving grounds / simulation paused"}
            </span>
            <button
              type="button"
              aria-pressed={showPerf}
              aria-label="Toggle renderer performance overlay"
              onClick={() => setShowPerf((visible) => !visible)}
              className="pointer-events-auto border border-line/80 px-2 py-1 font-mono text-[7px] tracking-[0.14em] text-bone/50 uppercase transition-colors hover:border-volt/40 hover:text-volt"
            >
              Perf {showPerf ? "on" : "off"} / F3
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-line bg-void/70 px-3 py-3 sm:px-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-[7px] tracking-[0.18em] text-muted uppercase">
            Render quality
          </span>
          <div
            role="group"
            aria-label="Render quality"
            className="flex border border-line"
          >
            {QUALITY_PRESETS.map((preset) => {
              const presetProfile = getQualityProfile(preset);
              const selected = quality === preset;

              return (
                <button
                  key={preset}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`${presetProfile.name} quality`}
                  onClick={() => updateSetting("quality", preset)}
                  className={`h-7 border-r border-line px-2.5 font-mono text-[8px] tracking-[0.12em] uppercase transition-colors last:border-r-0 ${
                    selected
                      ? "bg-volt text-void"
                      : "text-muted hover:bg-line/50 hover:text-bone"
                  }`}
                >
                  {presetProfile.label}
                </button>
              );
            })}
          </div>
          <span className="ml-auto font-mono text-[7px] tracking-[0.14em] text-muted uppercase">
            DPR {effectivePixelRatio.toFixed(2)}×
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
          <p className="max-w-lg text-[11px] leading-4 text-muted">
            {profile.description}
          </p>
          <p className="font-mono text-[7px] tracking-[0.14em] text-bone/35 uppercase">
            {profile.shadows
              ? `${profile.shadowMapSize}px sun shadow`
              : "Shadows off"}
          </p>
        </div>
      </div>
    </div>
  );
}
