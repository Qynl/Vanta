import { describe, expect, it } from "vitest";

import { SimEventBus } from "@/game/sim/events/SimEventBus";

function respawn(tick: number) {
  return {
    type: "respawn" as const,
    tick,
    entityId: "target-1",
  };
}

describe("simulation event bus", () => {
  it("drains typed events in order and clears the queue", () => {
    const bus = new SimEventBus();

    bus.emit(respawn(1));
    bus.emit(respawn(2));

    expect(bus.pendingCount).toBe(2);
    expect(bus.drain()).toEqual([respawn(1), respawn(2)]);
    expect(bus.pendingCount).toBe(0);
    expect(bus.drain()).toEqual([]);
  });

  it("bounds a stalled consumer and counts dropped events", () => {
    const bus = new SimEventBus(3);

    for (let tick = 0; tick < 5; tick += 1) {
      bus.emit(respawn(tick));
    }

    expect(bus.pendingCount).toBe(3);
    expect(bus.droppedCount).toBe(2);
    expect(bus.drain()).toEqual([
      respawn(2),
      respawn(3),
      respawn(4),
    ]);
  });

  it("rejects invalid capacities", () => {
    expect(() => new SimEventBus(0)).toThrow();
    expect(() => new SimEventBus(1.5)).toThrow();
  });
});
