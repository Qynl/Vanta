import { beforeEach, describe, expect, it } from "vitest";

import {
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  useSettingsStore,
} from "@/client/state/settings";

describe("settings store", () => {
  beforeEach(() => {
    localStorage.clear();
    useSettingsStore.setState(DEFAULT_SETTINGS);
  });

  it("updates a single preference without changing the rest", () => {
    useSettingsStore.getState().updateSetting("fov", 112);

    expect(useSettingsStore.getState().fov).toBe(112);
    expect(useSettingsStore.getState().sensitivity).toBe(
      DEFAULT_SETTINGS.sensitivity,
    );
  });

  it("persists changes to local storage", () => {
    useSettingsStore.getState().updateSetting("reducedMotion", true);

    const persisted = localStorage.getItem(SETTINGS_STORAGE_KEY);
    expect(persisted).not.toBeNull();
    expect(JSON.parse(persisted ?? "{}")).toMatchObject({
      state: { reducedMotion: true },
    });
  });

  it("restores all defaults on reset", () => {
    useSettingsStore.getState().updateSetting("masterVolume", 12);
    useSettingsStore.getState().updateSetting("invertY", true);
    useSettingsStore.getState().resetSettings();

    const state = useSettingsStore.getState();
    expect(state.masterVolume).toBe(DEFAULT_SETTINGS.masterVolume);
    expect(state.invertY).toBe(DEFAULT_SETTINGS.invertY);
  });
});
