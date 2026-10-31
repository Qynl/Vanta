import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  DEFAULT_QUALITY,
  type QualityPreset,
} from "@/client/render/quality";

export interface VantaSettings {
  sensitivity: number;
  fov: number;
  masterVolume: number;
  invertY: boolean;
  toggleSprint: boolean;
  reducedMotion: boolean;
  quality: QualityPreset;
}

export interface SettingsStore extends VantaSettings {
  updateSetting: <K extends keyof VantaSettings>(
    key: K,
    value: VantaSettings[K],
  ) => void;
  resetSettings: () => void;
}

export const DEFAULT_SETTINGS: VantaSettings = {
  sensitivity: 0.85,
  fov: 100,
  masterVolume: 70,
  invertY: false,
  toggleSprint: true,
  reducedMotion: false,
  quality: DEFAULT_QUALITY,
};

export const SETTINGS_STORAGE_KEY = "vanta.settings.v1";

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      updateSetting: (key, value) =>
        set((state) => ({ ...state, [key]: value })),
      resetSettings: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
