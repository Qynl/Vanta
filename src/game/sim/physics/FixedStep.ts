export const PHYSICS_STEP_SECONDS = 1 / 60;

const STEP_EPSILON = 1e-9;

export interface FixedStepOptions {
  stepSeconds?: number;
  maxSubSteps?: number;
  maxFrameSeconds?: number;
}

export interface FixedStepResult {
  steps: number;
  alpha: number;
  droppedSeconds: number;
}

/**
 * A bounded fixed-step accumulator. Rendering may run at any cadence, but the
 * simulation only advances in deterministic physics ticks. Excess backlog is
 * discarded after `maxSubSteps` so a suspended tab cannot spiral.
 */
export class FixedStepClock {
  readonly stepSeconds: number;
  readonly maxSubSteps: number;
  readonly maxFrameSeconds: number;
  private accumulator = 0;

  constructor({
    stepSeconds = PHYSICS_STEP_SECONDS,
    maxSubSteps = 5,
    maxFrameSeconds = 0.25,
  }: FixedStepOptions = {}) {
    if (!Number.isFinite(stepSeconds) || stepSeconds <= 0) {
      throw new Error("Fixed step must be a positive number of seconds.");
    }

    if (!Number.isInteger(maxSubSteps) || maxSubSteps < 1) {
      throw new Error("Fixed-step catch-up limit must be at least one.");
    }

    if (!Number.isFinite(maxFrameSeconds) || maxFrameSeconds <= 0) {
      throw new Error("Maximum frame delta must be a positive number.");
    }

    this.stepSeconds = stepSeconds;
    this.maxSubSteps = maxSubSteps;
    this.maxFrameSeconds = maxFrameSeconds;
  }

  advance(frameSeconds: number): FixedStepResult {
    const acceptedFrame =
      Number.isFinite(frameSeconds) && frameSeconds > 0
        ? Math.min(frameSeconds, this.maxFrameSeconds)
        : 0;

    this.accumulator += acceptedFrame;

    let steps = 0;

    while (
      this.accumulator + STEP_EPSILON >= this.stepSeconds &&
      steps < this.maxSubSteps
    ) {
      this.accumulator = Math.max(
        0,
        this.accumulator - this.stepSeconds,
      );
      steps += 1;
    }

    let droppedSeconds = 0;

    if (
      steps === this.maxSubSteps &&
      this.accumulator + STEP_EPSILON >= this.stepSeconds
    ) {
      droppedSeconds = this.accumulator;
      this.accumulator = 0;
    }

    return {
      steps,
      alpha: Math.min(1, this.accumulator / this.stepSeconds),
      droppedSeconds,
    };
  }

  reset(): void {
    this.accumulator = 0;
  }
}
