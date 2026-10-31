import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const OPERATOR_STORAGE_KEY = "vanta.operator.v1";
export const CALLSIGN_PATTERN = /^[A-Z0-9][A-Z0-9_-]{1,15}$/;

export interface OperatorProfile {
  callsign: string | null;
  joinedAt: string | null;
}

export interface OperatorStore extends OperatorProfile {
  setCallsign: (callsign: string) => void;
  clearProfile: () => void;
}

export function normalizeCallsign(value: string): string {
  return value.trim().toUpperCase();
}

export function validateCallsign(value: string): string | null {
  const normalized = normalizeCallsign(value);

  if (normalized.length < 2) {
    return "Callsign must be at least 2 characters.";
  }

  if (normalized.length > 16) {
    return "Callsign must be 16 characters or fewer.";
  }

  if (!CALLSIGN_PATTERN.test(normalized)) {
    return "Use letters, numbers, underscores or hyphens.";
  }

  return null;
}

export const useOperatorStore = create<OperatorStore>()(
  persist(
    (set, get) => ({
      callsign: null,
      joinedAt: null,
      setCallsign: (callsign) => {
        const normalized = normalizeCallsign(callsign);

        if (validateCallsign(normalized)) {
          return;
        }

        set({
          callsign: normalized,
          joinedAt: get().joinedAt ?? new Date().toISOString(),
        });
      },
      clearProfile: () => set({ callsign: null, joinedAt: null }),
    }),
    {
      name: OPERATOR_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
