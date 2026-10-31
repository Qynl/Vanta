import {
  InputBindingMap,
  type InputAction,
} from "@/client/input/bindings";
import type { MovementInput } from "@/game/sim/player/Movement";

export interface PlayerFrameInput extends MovementInput {
  lookX: number;
  lookY: number;
  /** Primary mouse button, sampled once per frame. */
  fireHeld: boolean;
  /** One-shot edge from the reload binding or a future reload button. */
  reloadPressed: boolean;
}

export interface PointerLockStatus {
  locked: boolean;
  supported: boolean;
  error: string | null;
}

export interface InputControllerOptions {
  target: HTMLElement;
  bindings?: InputBindingMap;
  toggleSprint?: boolean;
  onPointerLockChange?: (status: PointerLockStatus) => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

function neutralFrameInput(): PlayerFrameInput {
  return {
    forward: 0,
    right: 0,
    sprint: false,
    crouch: false,
    jumpHeld: false,
    jumpPressed: false,
    lookX: 0,
    lookY: 0,
    fireHeld: false,
    reloadPressed: false,
  };
}

/**
 * Converts physical keyboard/mouse events into one frame input sample. Look
 * deltas and jump presses are consumed exactly once, even if the renderer runs
 * above the 60 Hz simulation cadence.
 */
export class InputController {
  readonly bindings: InputBindingMap;

  private readonly target: HTMLElement;
  private readonly document: Document;
  private readonly onPointerLockChange:
    | ((status: PointerLockStatus) => void)
    | undefined;
  private readonly pressedCodes = new Set<string>();
  private toggleSprint: boolean;
  private sprintToggled = false;
  private jumpQueued = false;
  private fireHeld = false;
  private reloadQueued = false;
  private lookX = 0;
  private lookY = 0;
  private status: PointerLockStatus;
  private disposed = false;

  constructor({
    target,
    bindings = new InputBindingMap(),
    toggleSprint = true,
    onPointerLockChange,
  }: InputControllerOptions) {
    this.target = target;
    this.bindings = bindings;
    this.toggleSprint = toggleSprint;
    this.onPointerLockChange = onPointerLockChange;
    this.document = target.ownerDocument;
    this.status = {
      locked: false,
      supported: typeof target.requestPointerLock === "function",
      error: null,
    };

    this.document.addEventListener("keydown", this.handleKeyDown, true);
    this.document.addEventListener("keyup", this.handleKeyUp, true);
    this.document.addEventListener(
      "pointerlockchange",
      this.handlePointerLockChange,
    );
    this.document.addEventListener(
      "pointerlockerror",
      this.handlePointerLockError,
    );
    this.document.addEventListener("mousemove", this.handleMouseMove);
    this.document.addEventListener("mousedown", this.handleMouseDown);
    this.document.addEventListener("mouseup", this.handleMouseUp);
    this.document.addEventListener("visibilitychange", this.handleVisibility);
    window.addEventListener("blur", this.handleBlur);
  }

  get pointerLock(): PointerLockStatus {
    return this.status;
  }

  setToggleSprint(toggleSprint: boolean): void {
    if (this.toggleSprint === toggleSprint) {
      return;
    }

    this.toggleSprint = toggleSprint;
    this.sprintToggled = false;
  }

  requestPointerLock(): void {
    if (this.disposed || this.status.locked) {
      return;
    }

    if (!this.status.supported) {
      this.setStatus({
        ...this.status,
        error: "Pointer lock is not available in this browser.",
      });
      return;
    }

    this.setStatus({ ...this.status, error: null });

    try {
      const result = this.target.requestPointerLock() as
        | Promise<void>
        | undefined;

      if (result && typeof result.catch === "function") {
        void result.catch((error: unknown) => {
          this.setStatus({
            locked: false,
            supported: true,
            error:
              error instanceof Error
                ? error.message
                : "Pointer lock was refused.",
          });
        });
      }
    } catch (error) {
      this.setStatus({
        locked: false,
        supported: true,
        error:
          error instanceof Error
            ? error.message
            : "Pointer lock was refused.",
      });
    }
  }

  consumeFrame(): PlayerFrameInput {
    if (!this.status.locked) {
      this.lookX = 0;
      this.lookY = 0;
      this.jumpQueued = false;
      this.reloadQueued = false;
      return neutralFrameInput();
    }

    const frame: PlayerFrameInput = {
      forward:
        Number(this.isDown("forward")) - Number(this.isDown("back")),
      right: Number(this.isDown("right")) - Number(this.isDown("left")),
      sprint: this.toggleSprint
        ? this.sprintToggled
        : this.isDown("sprint"),
      crouch: this.isDown("crouch"),
      jumpHeld: this.isDown("jump"),
      jumpPressed: this.jumpQueued,
      lookX: this.lookX,
      lookY: this.lookY,
      fireHeld: this.fireHeld,
      reloadPressed: this.reloadQueued,
    };

    this.lookX = 0;
    this.lookY = 0;
    this.jumpQueued = false;
    this.reloadQueued = false;

    return frame;
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.document.removeEventListener("keydown", this.handleKeyDown, true);
    this.document.removeEventListener("keyup", this.handleKeyUp, true);
    this.document.removeEventListener(
      "pointerlockchange",
      this.handlePointerLockChange,
    );
    this.document.removeEventListener(
      "pointerlockerror",
      this.handlePointerLockError,
    );
    this.document.removeEventListener("mousemove", this.handleMouseMove);
    this.document.removeEventListener("mousedown", this.handleMouseDown);
    this.document.removeEventListener("mouseup", this.handleMouseUp);
    this.document.removeEventListener(
      "visibilitychange",
      this.handleVisibility,
    );
    window.removeEventListener("blur", this.handleBlur);
    this.clearHeldInput();

    if (
      this.document.pointerLockElement === this.target &&
      typeof this.document.exitPointerLock === "function"
    ) {
      this.document.exitPointerLock();
    }
  }

  private isDown(action: InputAction): boolean {
    for (const code of this.bindings.get(action)) {
      if (this.pressedCodes.has(code)) {
        return true;
      }
    }

    return false;
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.status.locked || isTypingTarget(event.target)) {
      return;
    }

    const action = this.bindings.resolve(event.code);

    if (!action) {
      return;
    }

    if (action !== "pause") {
      event.preventDefault();
    }

    const freshPress =
      !event.repeat && !this.pressedCodes.has(event.code);

    if (action === "jump" && freshPress) {
      this.jumpQueued = true;
    }

    if (action === "crouch" && freshPress) {
      this.sprintToggled = false;
    }

    if (action === "reload" && freshPress) {
      this.reloadQueued = true;
    }

    if (
      action === "sprint" &&
      this.toggleSprint &&
      freshPress
    ) {
      this.sprintToggled = !this.sprintToggled;
    }

    this.pressedCodes.add(event.code);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.pressedCodes.delete(event.code);
  };

  private readonly handleMouseMove = (event: MouseEvent): void => {
    if (!this.status.locked) {
      return;
    }

    if (Number.isFinite(event.movementX)) {
      this.lookX += event.movementX;
    }

    if (Number.isFinite(event.movementY)) {
      this.lookY += event.movementY;
    }
  };

  private readonly handleMouseDown = (event: MouseEvent): void => {
    if (!this.status.locked || event.button !== 0) {
      return;
    }

    this.fireHeld = true;
  };

  private readonly handleMouseUp = (event: MouseEvent): void => {
    if (event.button === 0) {
      this.fireHeld = false;
    }
  };

  private readonly handlePointerLockChange = (): void => {
    const locked = this.document.pointerLockElement === this.target;

    if (locked === this.status.locked) {
      return;
    }

    if (!locked) {
      this.clearHeldInput();
    }

    this.setStatus({ ...this.status, locked, error: null });
  };

  private readonly handlePointerLockError = (): void => {
    this.clearHeldInput();
    this.setStatus({
      locked: false,
      supported: this.status.supported,
      error: "Pointer lock was refused by the browser.",
    });
  };

  private readonly handleVisibility = (): void => {
    if (this.document.visibilityState === "hidden") {
      this.clearHeldInput();
    }
  };

  private readonly handleBlur = (): void => {
    this.clearHeldInput();
  };

  private clearHeldInput(): void {
    this.pressedCodes.clear();
    this.sprintToggled = false;
    this.jumpQueued = false;
    this.fireHeld = false;
    this.reloadQueued = false;
    this.lookX = 0;
    this.lookY = 0;
  }

  private setStatus(status: PointerLockStatus): void {
    this.status = status;
    this.onPointerLockChange?.(status);
  }
}
