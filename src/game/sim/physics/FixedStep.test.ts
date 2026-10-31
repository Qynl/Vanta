import { describe, expect, it } from "vitest";

import {
  FixedStepClock,
  PHYSICS_STEP_SECONDS,
} from "@/game/sim/physics/FixedStep";

describe("fixed step clock", () => {
  it("produces exactly 60 simulation steps from 60 render frames", () => {
    const clock = new FixedStepClock();
    let steps = 0;
    let lastAlpha = 1;

    for (let frame = 0; frame < 60; frame += 1) {
      const result = clock.advance(PHYSICS_STEP_SECONDS);
      steps += result.steps;
      lastAlpha = result.alpha;
    }

    expect(steps).toBe(60);
    expect(lastAlpha).toBeLessThanOrEqual(1e-6);
  });

  it("runs a deterministic step count for identical input", () => {
    const deltas = [
      0.016,
      0.021,
      0.004,
      0.033,
      0.017,
      0.05,
      0.008,
      0.019,
    ];
    const first = new FixedStepClock();
    const second = new FixedStepClock();
    const firstResults = deltas.map((delta) => first.advance(delta));
    const secondResults = deltas.map((delta) => second.advance(delta));

    expect(firstResults).toEqual(secondResults);
    expect(firstResults.reduce((total, result) => total + result.steps, 0)).toBe(
      secondResults.reduce((total, result) => total + result.steps, 0),
    );
  });

  it("caps catch-up and discards a suspended-tab backlog", () => {
    const clock = new FixedStepClock({
      maxSubSteps: 5,
      maxFrameSeconds: 0.25,
    });
    const result = clock.advance(10);

    expect(result.steps).toBe(5);
    expect(result.alpha).toBe(0);
    expect(result.droppedSeconds).toBeGreaterThan(0);

    const next = clock.advance(PHYSICS_STEP_SECONDS);
    expect(next.steps).toBe(1);
    expect(next.droppedSeconds).toBe(0);
  });

  it("ignores non-positive frame deltas and resets cleanly", () => {
    const clock = new FixedStepClock();

    expect(clock.advance(0).steps).toBe(0);
    expect(clock.advance(-1).steps).toBe(0);
    expect(clock.advance(Number.NaN).steps).toBe(0);

    clock.advance(0.12);
    clock.reset();

    expect(clock.advance(PHYSICS_STEP_SECONDS / 2).steps).toBe(0);
    expect(clock.advance(PHYSICS_STEP_SECONDS / 2).steps).toBe(1);
  });

  it("rejects invalid configuration", () => {
    expect(() => new FixedStepClock({ stepSeconds: 0 })).toThrow();
    expect(() => new FixedStepClock({ maxSubSteps: 0 })).toThrow();
    expect(() => new FixedStepClock({ maxFrameSeconds: 0 })).toThrow();
  });
});
