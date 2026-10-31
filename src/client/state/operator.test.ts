import { beforeEach, describe, expect, it } from "vitest";

import {
  normalizeCallsign,
  OPERATOR_STORAGE_KEY,
  useOperatorStore,
  validateCallsign,
} from "@/client/state/operator";

describe("operator profile", () => {
  beforeEach(() => {
    localStorage.clear();
    useOperatorStore.setState({ callsign: null, joinedAt: null });
  });

  it("normalizes callsigns to trimmed uppercase", () => {
    expect(normalizeCallsign("  vanta_09 ")).toBe("VANTA_09");
  });

  it("rejects short, overlong, and unsupported callsigns", () => {
    expect(validateCallsign("V")).toMatch(/at least 2/);
    expect(validateCallsign("THIS-CALLSIGN-IS-TOO-LONG")).toMatch(/16/);
    expect(validateCallsign("BAD CALL")).toMatch(/letters, numbers/);
    expect(validateCallsign("VANTA_09")).toBeNull();
  });

  it("saves a valid local operator and preserves the join date", () => {
    useOperatorStore.getState().setCallsign("vanta_09");
    const joinedAt = useOperatorStore.getState().joinedAt;

    expect(useOperatorStore.getState().callsign).toBe("VANTA_09");
    expect(joinedAt).not.toBeNull();

    useOperatorStore.getState().setCallsign("second");
    expect(useOperatorStore.getState().joinedAt).toBe(joinedAt);

    expect(localStorage.getItem(OPERATOR_STORAGE_KEY)).not.toBeNull();
  });
});
