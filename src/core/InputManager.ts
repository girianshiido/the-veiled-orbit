import type { InputAction } from "../types/game";

const KEY_BINDINGS: Record<string, InputAction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  W: "up",
  z: "up",
  Z: "up",
  s: "down",
  S: "down",
  a: "left",
  A: "left",
  q: "left",
  Q: "left",
  d: "right",
  D: "right",
  Enter: "confirm",
  " ": "menu",
  Escape: "menu",
};

const CONFIRM_DEBOUNCE_MS = 140;

export class InputManager {
  private readonly held = new Set<InputAction>();
  private readonly pressed = new Set<InputAction>();
  private readonly onPress?: (action: InputAction) => void;
  private lastConfirmPress = -Infinity;

  constructor(onPress?: (action: InputAction) => void) {
    this.onPress = onPress;
    window.addEventListener("keydown", this.onKeyDown, { passive: false });
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.releaseAll);
  }

  public isHeld(action: InputAction): boolean {
    return this.held.has(action);
  }

  public consumePress(action: InputAction): boolean {
    if (!this.pressed.has(action)) return false;
    this.pressed.delete(action);
    return true;
  }

  public clearPresses(): void {
    this.pressed.clear();
  }

  /**
   * Map transitions must wait for a fresh directional input.  Otherwise the
   * key that walked Ash through a doorway can still be held on the new map
   * and immediately fire the opposite exit trigger.
   */
  public cancelMovement(): void {
    for (const action of ["up", "down", "left", "right"] satisfies InputAction[]) {
      this.held.delete(action);
      this.pressed.delete(action);
    }
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const action = KEY_BINDINGS[event.key];
    if (!action) return;
    event.preventDefault();
    if (!this.held.has(action)) {
      if (action !== "confirm" || event.timeStamp - this.lastConfirmPress >= CONFIRM_DEBOUNCE_MS) {
        this.pressed.add(action);
        this.onPress?.(action);
        if (action === "confirm") this.lastConfirmPress = event.timeStamp;
      }
    }
    this.held.add(action);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    const action = KEY_BINDINGS[event.key];
    if (action) this.held.delete(action);
  };

  private readonly releaseAll = (): void => {
    this.held.clear();
    this.pressed.clear();
  };

}
