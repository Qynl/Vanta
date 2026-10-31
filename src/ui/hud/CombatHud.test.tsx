import * as THREE from "three";
import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PlayablePlayer } from "@/client/player/PlayablePlayer";
import { CameraRig } from "@/client/render/camera/CameraRig";
import { ProceduralMaterialLibrary } from "@/client/render/materials/ProceduralMaterials";
import { useSettingsStore, DEFAULT_SETTINGS } from "@/client/state/settings";
import { CombatHud } from "@/ui/hud/CombatHud";

describe("combat HUD", () => {
  let player: PlayablePlayer | null = null;
  let materials: ProceduralMaterialLibrary | null = null;

  afterEach(() => {
    player?.dispose();
    player = null;
    materials?.dispose();
    materials = null;
  });

  it("renders live vitals, ammo, crosshair and all range targets", async () => {
    useSettingsStore.setState(DEFAULT_SETTINGS);
    const scene = new THREE.Scene();
    const cameraRig = new CameraRig({ fov: 100 });
    materials = new ProceduralMaterialLibrary({ textureSize: 32 });
    player = await PlayablePlayer.create({
      scene,
      cameraRig,
      materials,
    });

    render(<CombatHud player={player} paused={false} />);

    const vitals = screen.getByRole("region", {
      name: /player vitals/i,
    });
    const weapon = screen.getByRole("region", {
      name: /weapon and ammunition/i,
    });

    expect(within(vitals).getByText("HP")).toBeInTheDocument();
    expect(within(vitals).getByText("Shield")).toBeInTheDocument();
    expect(within(vitals).getAllByText("100")).toHaveLength(2);
    expect(within(weapon).getByText(/30/)).toBeInTheDocument();
    expect(screen.getByTestId("combat-crosshair")).toBeInTheDocument();
    expect(screen.getByText("T-01 / CQC")).toBeInTheDocument();
    expect(screen.getByText("T-02 / MID")).toBeInTheDocument();
    expect(screen.getByText("T-03 / LONG")).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: /range target telemetry/i }),
    ).toBeInTheDocument();
  });
});
