import { afterEach, describe, expect, it, vi } from "vitest";

import {
  InputBindingMap,
  DEFAULT_KEY_BINDINGS,
} from "@/client/input/bindings";
import { InputController } from "@/client/input/InputController";

let lockTarget: Element | null = null;

function setPointerLockTarget(target: Element | null): void {
  lockTarget = target;
  Object.defineProperty(document, "pointerLockElement", {
    configurable: true,
    get: () => lockTarget,
  });
}

function createController(toggleSprint = true) {
  const canvas = document.createElement("canvas");
  const requestPointerLock = vi.fn(() => {
    setPointerLockTarget(canvas);
    document.dispatchEvent(new Event("pointerlockchange"));
  });
  Object.defineProperty(canvas, "requestPointerLock", {
    configurable: true,
    value: requestPointerLock,
  });
  document.body.append(canvas);

  const controller = new InputController({
    target: canvas,
    toggleSprint,
  });
  controller.requestPointerLock();

  return { canvas, controller, requestPointerLock };
}

function key(code: string, type: "keydown" | "keyup" = "keydown"): void {
  document.dispatchEvent(
    new KeyboardEvent(type, {
      code,
      bubbles: true,
      cancelable: true,
    }),
  );
}

afterEach(() => {
  setPointerLockTarget(null);
});

describe("input controller", () => {
  it("maps movement actions and consumes toggle sprint", () => {
    const { controller } = createController();

    try {
      key("KeyW");
      key("KeyD");
      key("ShiftLeft");

      const frame = controller.consumeFrame();

      expect(frame.forward).toBe(1);
      expect(frame.right).toBe(1);
      expect(frame.sprint).toBe(true);
      expect(frame.jumpPressed).toBe(false);
      expect(controller.pointerLock.locked).toBe(true);

      key("KeyD", "keyup");
      expect(controller.consumeFrame().right).toBe(0);
    } finally {
      controller.dispose();
    }
  });

  it("emits one jump edge and consumes raw look deltas exactly once", () => {
    const { controller } = createController();

    try {
      const mouseMove = new MouseEvent("mousemove", {
        bubbles: true,
        movementX: 12,
        movementY: -4,
      });
      document.dispatchEvent(mouseMove);
      key("Space");
      key("Space");
      key("Space");

      const first = controller.consumeFrame();
      const second = controller.consumeFrame();

      expect(first.lookX).toBe(12);
      expect(first.lookY).toBe(-4);
      expect(first.jumpHeld).toBe(true);
      expect(first.jumpPressed).toBe(true);
      expect(second.lookX).toBe(0);
      expect(second.jumpPressed).toBe(false);
      expect(second.jumpHeld).toBe(true);

      key("Space", "keyup");
      key("Space");
      expect(controller.consumeFrame().jumpPressed).toBe(true);
    } finally {
      controller.dispose();
    }
  });

  it("cancels toggle sprint on crouch and clears held input on unlock", () => {
    const { controller } = createController();

    try {
      key("ShiftLeft");
      expect(controller.consumeFrame().sprint).toBe(true);

      key("KeyC");
      expect(controller.consumeFrame().sprint).toBe(false);
      expect(controller.consumeFrame().crouch).toBe(true);

      setPointerLockTarget(null);
      document.dispatchEvent(new Event("pointerlockchange"));
      const unlocked = controller.consumeFrame();

      expect(controller.pointerLock.locked).toBe(false);
      expect(unlocked.forward).toBe(0);
      expect(unlocked.crouch).toBe(false);
      expect(controller.consumeFrame().lookX).toBe(0);
    } finally {
      controller.dispose();
    }
  });

  it("samples primary fire and a one-shot reload edge", () => {
    const { controller } = createController();

    try {
      document.dispatchEvent(
        new MouseEvent("mousedown", {
          button: 0,
          bubbles: true,
        }),
      );
      key("KeyR");

      const firing = controller.consumeFrame();
      const held = controller.consumeFrame();

      expect(firing.fireHeld).toBe(true);
      expect(firing.reloadPressed).toBe(true);
      expect(held.fireHeld).toBe(true);
      expect(held.reloadPressed).toBe(false);

      document.dispatchEvent(
        new MouseEvent("mouseup", {
          button: 0,
          bubbles: true,
        }),
      );
      expect(controller.consumeFrame().fireHeld).toBe(false);

      document.dispatchEvent(
        new MouseEvent("mousedown", {
          button: 2,
          bubbles: true,
        }),
      );
      expect(controller.consumeFrame().fireHeld).toBe(false);
    } finally {
      controller.dispose();
    }
  });

  it("supports hold-to-sprint and live binding replacement", () => {
    const bindings = new InputBindingMap({
      ...DEFAULT_KEY_BINDINGS,
      sprint: ["ShiftLeft"],
    });
    const canvas = document.createElement("canvas");
    Object.defineProperty(canvas, "requestPointerLock", {
      configurable: true,
      value: () => {
        setPointerLockTarget(canvas);
        document.dispatchEvent(new Event("pointerlockchange"));
      },
    });
    document.body.append(canvas);

    const controller = new InputController({
      target: canvas,
      bindings,
      toggleSprint: false,
    });
    controller.requestPointerLock();

    try {
      key("ShiftLeft");
      expect(controller.consumeFrame().sprint).toBe(true);
      key("ShiftLeft", "keyup");
      expect(controller.consumeFrame().sprint).toBe(false);

      bindings.rebind("jump", ["KeyE"]);
      key("KeyE");
      expect(controller.consumeFrame().jumpPressed).toBe(true);
    } finally {
      controller.dispose();
    }
  });

  it("ignores gameplay keys before pointer lock", () => {
    const canvas = document.createElement("canvas");
    Object.defineProperty(canvas, "requestPointerLock", {
      configurable: true,
      value: vi.fn(),
    });
    const controller = new InputController({ target: canvas });

    try {
      key("KeyW");
      key("Space");

      const frame = controller.consumeFrame();
      expect(frame.forward).toBe(0);
      expect(frame.jumpPressed).toBe(false);
      expect(controller.pointerLock.locked).toBe(false);
    } finally {
      controller.dispose();
    }
  });
});
