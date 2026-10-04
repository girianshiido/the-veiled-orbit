import type { InputManager } from "../core/InputManager";

export type FrontEndMode = "title" | "continue" | "intro" | "game-over" | "loading";

export type FrontEndAction =
  | { kind: "new-game" }
  | { kind: "continue"; slot: number };

export interface SaveSlotSummary {
  slot: number;
  savedAt: number | null;
}

export interface FrontEndView {
  mode: FrontEndMode;
  titleChoices: readonly string[];
  selectedChoice: number;
  slots: readonly SaveSlotSummary[];
  selectedSlot: number;
  message: string;
  introPage: number;
  introPages: readonly string[];
}

const TITLE_CHOICES = ["CONTINUE", "NEW GAME"] as const;
const INTRO_PAGES = [
  "My name is Ash. I am a pathfinder.",
  "I live in Lumen Hollow, a small settlement on the planet Nydra.",
  "For generations, the old machines slept beneath our roads.",
  "Now they have begun to speak again... and something beyond the sky is answering.",
] as const;

export class FrontEndSystem {
  private readonly input: InputManager;
  private readonly readSlots: () => SaveSlotSummary[];
  private mode: FrontEndMode | null = null;
  private selectedChoice = 0;
  private selectedSlot = 0;
  private slots: SaveSlotSummary[] = [];
  private message = "";
  private introPage = 0;

  public constructor(input: InputManager, readSlots: () => SaveSlotSummary[]) {
    this.input = input;
    this.readSlots = readSlots;
  }

  public get active(): boolean {
    return this.mode !== null;
  }

  public openTitle(message = ""): void {
    this.slots = this.readSlots();
    this.mode = "title";
    this.selectedChoice = this.slots.some((slot) => slot.savedAt !== null) ? 0 : 1;
    this.message = message || "Choose how the orbit begins.";
  }

  public openGameOver(): void {
    this.mode = "game-over";
    this.message = "The last village record remains unchanged.";
  }

  public beginLoading(message: string): void {
    this.mode = "loading";
    this.message = message;
  }

  public close(): void {
    this.mode = null;
  }

  public update(): FrontEndAction | null {
    if (this.mode === "game-over") {
      if (this.input.consumePress("confirm") || this.input.consumePress("menu")) this.openTitle();
      return null;
    }
    if (this.mode === "loading" || this.mode === null) return null;
    if (this.mode === "intro") {
      if (!this.input.consumePress("confirm")) return null;
      if (this.introPage < INTRO_PAGES.length - 1) {
        this.introPage += 1;
        return null;
      }
      return { kind: "new-game" };
    }
    if (this.mode === "continue") return this.updateContinue();
    if (this.input.consumePress("up")) this.selectedChoice = (this.selectedChoice - 1 + TITLE_CHOICES.length) % TITLE_CHOICES.length;
    if (this.input.consumePress("down")) this.selectedChoice = (this.selectedChoice + 1) % TITLE_CHOICES.length;
    if (!this.input.consumePress("confirm")) return null;
    if (this.selectedChoice === 1) {
      this.mode = "intro";
      this.introPage = 0;
      this.message = "A · CONTINUE";
      return null;
    }
    if (!this.slots.some((slot) => slot.savedAt !== null)) {
      this.message = "NO SAVE DATA · Begin a NEW GAME.";
      return null;
    }
    this.mode = "continue";
    this.selectedSlot = Math.max(0, this.slots.findIndex((slot) => slot.savedAt !== null));
    this.message = "Choose a village record.";
    return null;
  }

  public view(): FrontEndView | null {
    if (!this.mode) return null;
    return {
      mode: this.mode,
      titleChoices: TITLE_CHOICES,
      selectedChoice: this.selectedChoice,
      slots: this.slots,
      selectedSlot: this.selectedSlot,
      message: this.message,
      introPage: this.introPage,
      introPages: INTRO_PAGES,
    };
  }

  private updateContinue(): FrontEndAction | null {
    if (this.input.consumePress("menu")) {
      this.openTitle();
      return null;
    }
    if (this.input.consumePress("up")) this.selectedSlot = (this.selectedSlot - 1 + this.slots.length) % this.slots.length;
    if (this.input.consumePress("down")) this.selectedSlot = (this.selectedSlot + 1) % this.slots.length;
    if (!this.input.consumePress("confirm")) return null;
    const selected = this.slots[this.selectedSlot];
    if (!selected || selected.savedAt === null) {
      this.message = "That memory slot is empty.";
      return null;
    }
    return { kind: "continue", slot: selected.slot };
  }
}
