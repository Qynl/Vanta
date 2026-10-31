import type * as THREE from "three";

import type { PlayerFrameInput } from "@/client/input/InputController";
import { CombatTelemetry } from "@/client/player/CombatTelemetry";
import { PlayerTelemetry } from "@/client/player/PlayerTelemetry";
import type { CameraRig } from "@/client/render/camera/CameraRig";
import { FirstPersonCamera } from "@/client/render/camera/FirstPersonCamera";
import {
  createCombatRangeVisuals,
  type CombatRangeVisuals,
} from "@/client/render/combat/CombatRangeVisuals";
import {
  createRifleVisuals,
  type RifleVisuals,
} from "@/client/render/combat/RifleVisuals";
import type { ProceduralMaterialLibrary } from "@/client/render/materials/ProceduralMaterials";
import {
  createMovementRangeVisuals,
  type MovementRangeVisuals,
} from "@/client/render/training/MovementRangeVisuals";
import type {
  ColliderVector3,
  StaticCourseLayout,
} from "@/game/data/maps/kit/colliders";
import {
  PROVING_GROUNDS,
  PROVING_GROUNDS_FALL_Y,
  PROVING_GROUNDS_HAZARDS,
  PROVING_GROUNDS_SPAWN,
  PROVING_GROUNDS_TARGETS,
  PROVING_GROUNDS_YAW,
  type ProvingGroundsHazardDefinition,
  type ProvingGroundsTargetDefinition,
} from "@/game/data/maps/provingGrounds/provingGrounds";
import {
  LocalCombatSimulation,
  type CombatSnapshot,
} from "@/game/sim/combat/LocalCombatSimulation";
import type { SimEvent } from "@/game/sim/events/SimEventBus";
import { FixedStepClock } from "@/game/sim/physics/FixedStep";
import {
  LocalPlayerSimulation,
  type PlayerSimulationSnapshot,
} from "@/game/sim/player/LocalPlayerSimulation";
import {
  NEUTRAL_MOVEMENT_INPUT,
  type MovementInput,
  type MovementVector3,
} from "@/game/sim/player/Movement";

export interface PlayablePlayerInputSource {
  consumeFrame: () => PlayerFrameInput;
}

export interface PlayablePlayerSettings {
  sensitivity: number;
  invertY: boolean;
  reducedMotion: boolean;
}

export interface PlayablePlayerOptions {
  scene: THREE.Scene;
  cameraRig: CameraRig;
  materials: ProceduralMaterialLibrary;
  layout?: StaticCourseLayout;
  spawn?: ColliderVector3;
  yaw?: number;
  resetBelowY?: number;
  targets?: readonly ProvingGroundsTargetDefinition[];
  hazards?: readonly ProvingGroundsHazardDefinition[];
  reducedMotion?: boolean;
  sensitivity?: number;
  invertY?: boolean;
}

const FRAME_INPUT: PlayerFrameInput = {
  ...NEUTRAL_MOVEMENT_INPUT,
  lookX: 0,
  lookY: 0,
  fireHeld: false,
  reloadPressed: false,
};

function lerpPosition(
  previous: MovementVector3,
  current: MovementVector3,
  alpha: number,
): MovementVector3 {
  return {
    x: previous.x + (current.x - previous.x) * alpha,
    y: previous.y + (current.y - previous.y) * alpha,
    z: previous.z + (current.z - previous.z) * alpha,
  };
}

function copySnapshot(
  snapshot: PlayerSimulationSnapshot,
): PlayerSimulationSnapshot {
  return {
    ...snapshot,
    position: { ...snapshot.position },
    velocity: { ...snapshot.velocity },
  };
}

function aimDirection(yaw: number, pitch: number): MovementVector3 {
  const pitchCosine = Math.cos(pitch);

  return {
    x: -Math.sin(yaw) * pitchCosine,
    y: Math.sin(pitch),
    z: -Math.cos(yaw) * pitchCosine,
  };
}

/**
 * Bridges the deterministic player and combat simulations to the browser
 * renderer, camera and HUD. Input is sampled once per display frame; movement
 * and combat advance only on the fixed 60 Hz clock.
 */
export class PlayablePlayer {
  readonly telemetry: PlayerTelemetry;
  readonly combatTelemetry: CombatTelemetry;
  private readonly scene: THREE.Scene;
  private readonly cameraRig: CameraRig;
  private readonly simulation: LocalPlayerSimulation;
  private readonly combat: LocalCombatSimulation;
  private readonly visuals: MovementRangeVisuals;
  private readonly combatVisuals: CombatRangeVisuals;
  private readonly rifleVisuals: RifleVisuals;
  private readonly camera: FirstPersonCamera;
  private readonly clock = new FixedStepClock();
  private readonly settings: PlayablePlayerSettings;
  private inputSource: PlayablePlayerInputSource | null = null;
  private previousSnapshot: PlayerSimulationSnapshot;
  private currentSnapshot: PlayerSimulationSnapshot;
  private pendingJump = false;
  private paused = true;
  private disposed = false;

  private constructor(
    scene: THREE.Scene,
    simulation: LocalPlayerSimulation,
    combat: LocalCombatSimulation,
    visuals: MovementRangeVisuals,
    combatVisuals: CombatRangeVisuals,
    rifleVisuals: RifleVisuals,
    cameraRig: CameraRig,
    settings: PlayablePlayerSettings,
  ) {
    this.scene = scene;
    this.cameraRig = cameraRig;
    this.simulation = simulation;
    this.combat = combat;
    this.visuals = visuals;
    this.combatVisuals = combatVisuals;
    this.rifleVisuals = rifleVisuals;
    this.camera = new FirstPersonCamera({
      cameraRig,
      yaw: simulation.snapshot.yaw,
    });
    this.settings = settings;
    this.telemetry = new PlayerTelemetry();
    this.combatTelemetry = new CombatTelemetry(combat.snapshot);
    this.previousSnapshot = copySnapshot(simulation.snapshot);
    this.currentSnapshot = copySnapshot(simulation.snapshot);
    this.syncCamera(0, this.currentSnapshot);
    this.telemetry.publish(this.currentSnapshot, true);
  }

  static async create({
    scene,
    cameraRig,
    materials,
    layout = PROVING_GROUNDS,
    spawn = PROVING_GROUNDS_SPAWN,
    yaw = PROVING_GROUNDS_YAW,
    resetBelowY = PROVING_GROUNDS_FALL_Y,
    targets = PROVING_GROUNDS_TARGETS,
    hazards = PROVING_GROUNDS_HAZARDS,
    reducedMotion = false,
    sensitivity = 0.85,
    invertY = false,
  }: PlayablePlayerOptions): Promise<PlayablePlayer> {
    const simulation = await LocalPlayerSimulation.create({
      layout,
      spawn,
      yaw,
      resetBelowY,
    });
    let combat: LocalCombatSimulation | null = null;
    let visuals: MovementRangeVisuals | null = null;
    let combatVisuals: CombatRangeVisuals | null = null;
    let rifleVisuals: RifleVisuals | null = null;

    try {
      combat = new LocalCombatSimulation({
        physics: simulation.physics,
        targets,
        hazards,
        initialPlayerPosition: simulation.snapshot.position,
      });
      visuals = createMovementRangeVisuals({
        layout,
        materials,
        origin: layout.origin,
      });
      combatVisuals = createCombatRangeVisuals({
        targets,
        hazards,
        materials,
      });
      rifleVisuals = createRifleVisuals();
      scene.add(visuals.group);
      scene.add(combatVisuals.group);
      scene.add(rifleVisuals.group);

      return new PlayablePlayer(
        scene,
        simulation,
        combat,
        visuals,
        combatVisuals,
        rifleVisuals,
        cameraRig,
        { reducedMotion, sensitivity, invertY },
      );
    } catch (error) {
      if (visuals) {
        scene.remove(visuals.group);
      }

      if (combatVisuals) {
        scene.remove(combatVisuals.group);
      }

      if (rifleVisuals) {
        scene.remove(rifleVisuals.group);
      }

      visuals?.dispose();
      combatVisuals?.dispose();
      rifleVisuals?.dispose();
      combat?.dispose();
      simulation.dispose();
      throw error;
    }
  }

  get isPaused(): boolean {
    return this.paused;
  }

  get snapshot(): PlayerSimulationSnapshot {
    return copySnapshot(this.currentSnapshot);
  }

  get lookYaw(): number {
    return this.camera.lookYaw;
  }

  get lookPitch(): number {
    return this.camera.lookPitch;
  }

  setInputSource(source: PlayablePlayerInputSource | null): void {
    this.inputSource = source;
    this.pendingJump = false;
  }

  setPaused(paused: boolean): void {
    if (this.paused === paused) {
      return;
    }

    this.paused = paused;
    this.clock.reset();
    this.pendingJump = false;

    if (paused) {
      this.telemetry.flush();
      this.combatTelemetry.flush();
    }
  }

  setSettings(settings: Partial<PlayablePlayerSettings>): void {
    if (Number.isFinite(settings.sensitivity)) {
      this.settings.sensitivity = Math.max(
        0.05,
        Math.min(4, settings.sensitivity as number),
      );
    }

    if (typeof settings.invertY === "boolean") {
      this.settings.invertY = settings.invertY;
    }

    if (typeof settings.reducedMotion === "boolean") {
      this.settings.reducedMotion = settings.reducedMotion;
    }
  }

  update(deltaSeconds: number): void {
    if (this.disposed || this.paused) {
      return;
    }

    const input = this.inputSource?.consumeFrame() ?? FRAME_INPUT;
    this.camera.look(
      input.lookX,
      input.lookY,
      this.settings.sensitivity,
      this.settings.invertY,
    );
    this.pendingJump = this.pendingJump || input.jumpPressed;

    const fixed = this.clock.advance(deltaSeconds);
    const events: SimEvent[] = [];
    let landed = false;
    let landingImpact = 0;
    let respawned = false;

    for (let index = 0; index < fixed.steps; index += 1) {
      const alive = this.combat.isPlayerAlive;
      const tickInput: MovementInput = alive
        ? {
            forward: input.forward,
            right: input.right,
            sprint: input.sprint,
            crouch: input.crouch,
            jumpHeld: input.jumpHeld,
            jumpPressed: index === 0 ? this.pendingJump : false,
          }
        : NEUTRAL_MOVEMENT_INPUT;

      if (!alive) {
        this.pendingJump = false;
      } else if (index === 0) {
        this.pendingJump = false;
      }

      if (alive) {
        this.previousSnapshot = this.currentSnapshot;
        const step = this.simulation.step(tickInput);
        this.currentSnapshot = copySnapshot(step.snapshot);
        landed = landed || step.snapshot.landed;
        landingImpact = Math.max(
          landingImpact,
          step.snapshot.impactSpeed,
        );

        if (step.respawned) {
          respawned = true;
          this.previousSnapshot = copySnapshot(step.snapshot);
          this.camera.reset(step.snapshot.yaw);
        }
      } else {
        this.previousSnapshot = this.currentSnapshot;
      }

      const origin = {
        x: this.currentSnapshot.position.x,
        y:
          this.currentSnapshot.position.y +
          this.currentSnapshot.eyeOffset,
        z: this.currentSnapshot.position.z,
      };
      const direction = aimDirection(
        this.camera.lookYaw,
        this.camera.lookPitch,
      );
      const combatStep = this.combat.step({
        playerPosition: this.currentSnapshot.position,
        aimOrigin: origin,
        aimDirection: direction,
        viewYaw: this.camera.lookYaw,
        fireHeld: alive ? input.fireHeld : false,
        reloadPressed: alive && index === 0
          ? input.reloadPressed
          : false,
        horizontalSpeed: alive
          ? this.currentSnapshot.horizontalSpeed
          : 0,
        grounded: alive ? this.currentSnapshot.grounded : false,
        crouched: alive ? this.currentSnapshot.crouched : false,
      });

      for (const event of combatStep.events) {
        events.push(event);

        if (event.type === "shot") {
          this.rifleVisuals.applyShot(event);
        } else if (
          event.type === "damage" &&
          event.targetId !== "player" &&
          event.zone
        ) {
          this.combatVisuals.applyHit(
            event.targetId,
            event.zone,
            event.lethal,
          );
        }
      }

      if (combatStep.playerRespawned) {
        this.simulation.respawn();
        this.currentSnapshot = copySnapshot(this.simulation.snapshot);
        this.previousSnapshot = copySnapshot(this.currentSnapshot);
        this.camera.reset(this.currentSnapshot.yaw);
        this.pendingJump = false;
      }
    }

    const interpolated =
      fixed.steps > 0 && !respawned
        ? lerpPosition(
            this.previousSnapshot.position,
            this.currentSnapshot.position,
            fixed.alpha,
          )
        : this.currentSnapshot.position;

    this.syncCamera(deltaSeconds, this.currentSnapshot, {
      position: interpolated,
      landed,
      landingImpact,
    });

    const combatSnapshot: CombatSnapshot = this.combat.snapshot;
    this.combatVisuals.update(
      combatSnapshot.targets,
      deltaSeconds,
      this.cameraRig.camera.position,
    );
    this.rifleVisuals.update(deltaSeconds);
    this.telemetry.publish(this.currentSnapshot);
    this.combatTelemetry.publish(
      combatSnapshot,
      events,
      performance.now(),
    );
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.scene.remove(this.visuals.group);
    this.scene.remove(this.combatVisuals.group);
    this.scene.remove(this.rifleVisuals.group);
    this.visuals.dispose();
    this.combatVisuals.dispose();
    this.rifleVisuals.dispose();
    this.combat.dispose();
    this.simulation.dispose();
    this.telemetry.dispose();
    this.combatTelemetry.dispose();
  }

  private syncCamera(
    deltaSeconds: number,
    snapshot: PlayerSimulationSnapshot,
    override?: {
      position: MovementVector3;
      landed: boolean;
      landingImpact: number;
    },
  ): void {
    this.camera.update(
      {
        position: override?.position ?? snapshot.position,
        horizontalSpeed: snapshot.horizontalSpeed,
        grounded: snapshot.grounded,
        sprinting: snapshot.sprinting,
        crouched: snapshot.crouched,
        landed: override?.landed ?? snapshot.landed,
        landingImpact:
          override?.landingImpact ?? snapshot.impactSpeed,
        reducedMotion: this.settings.reducedMotion,
      },
      deltaSeconds,
    );
  }
}
