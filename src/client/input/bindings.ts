export const INPUT_ACTIONS = [
  "forward",
  "back",
  "left",
  "right",
  "jump",
  "sprint",
  "crouch",
  "reload",
  "pause",
] as const;

export type InputAction = (typeof INPUT_ACTIONS)[number];

export type KeyBindings = Readonly<Record<InputAction, readonly string[]>>;

export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  forward: ["KeyW"],
  back: ["KeyS"],
  left: ["KeyA"],
  right: ["KeyD"],
  jump: ["Space"],
  sprint: ["ShiftLeft", "ShiftRight"],
  crouch: ["KeyC"],
  reload: ["KeyR"],
  pause: ["Escape"],
};

/**
 * Mutable action map for the rebinding screen in M25. The controller only
 * resolves physical key codes through this map, so remapping cannot alter
 * movement logic or require remounting the input system.
 */
export class InputBindingMap {
  private map: Record<InputAction, readonly string[]>;
  private readonly codeToAction = new Map<string, InputAction>();

  constructor(initial: KeyBindings = DEFAULT_KEY_BINDINGS) {
    this.map = cloneBindings(initial);
    this.rebuildLookup();
  }

  get(action: InputAction): readonly string[] {
    return this.map[action];
  }

  get all(): KeyBindings {
    return cloneBindings(this.map);
  }

  resolve(code: string): InputAction | null {
    return this.codeToAction.get(code) ?? null;
  }

  rebind(action: InputAction, codes: readonly string[]): void {
    const normalized = codes
      .map((code) => code.trim())
      .filter((code, index, all) => code.length > 0 && all.indexOf(code) === index);

    if (normalized.length === 0) {
      throw new Error(`Action "${action}" needs at least one key.`);
    }

    for (const [otherAction, otherCodes] of Object.entries(this.map)) {
      if (otherAction === action) {
        continue;
      }

      const conflict = normalized.find((code) =>
        otherCodes.includes(code),
      );

      if (conflict) {
        throw new Error(
          `Key "${conflict}" is already bound to "${otherAction}".`,
        );
      }
    }

    this.map[action] = normalized;
    this.rebuildLookup();
  }

  reset(): void {
    this.map = cloneBindings(DEFAULT_KEY_BINDINGS);
    this.rebuildLookup();
  }

  private rebuildLookup(): void {
    this.codeToAction.clear();

    for (const action of INPUT_ACTIONS) {
      for (const code of this.map[action]) {
        this.codeToAction.set(code, action);
      }
    }
  }
}

function cloneBindings(bindings: KeyBindings): Record<InputAction, readonly string[]> {
  return {
    forward: [...bindings.forward],
    back: [...bindings.back],
    left: [...bindings.left],
    right: [...bindings.right],
    jump: [...bindings.jump],
    sprint: [...bindings.sprint],
    crouch: [...bindings.crouch],
    reload: [...bindings.reload],
    pause: [...bindings.pause],
  };
}
