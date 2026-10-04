import { InputManager } from "../core/InputManager.ts";
import { DIALOGUES, type DialogueChoice, type DialogueNode } from "./dialogues.ts";

const CHARACTERS_PER_SECOND = 42;

export interface DialogueView {
  speaker: string;
  text: string;
  choices: readonly DialogueChoice[];
  selectedChoice: number;
  complete: boolean;
}

export class DialogueSystem {
  private readonly input: InputManager;
  private node: DialogueNode | null = null;
  private visibleCharacters = 0;
  private selectedChoice = 0;
  private closeCallback: (() => void) | null = null;

  constructor(input: InputManager) {
    this.input = input;
  }

  public get active(): boolean {
    return this.node !== null;
  }

  public start(id: string, onClose?: () => void): void {
    const node = DIALOGUES[id];
    if (!node) throw new Error(`Unknown dialogue: ${id}`);
    this.closeCallback = onClose ?? null;
    this.openNode(node);
  }

  public startInline(speaker: string, text: string): void {
    this.closeCallback = null;
    this.openNode({ id: "inline", speaker, text });
  }

  public update(deltaSeconds: number): void {
    if (!this.node) return;
    this.visibleCharacters = Math.min(
      this.node.text.length,
      this.visibleCharacters + CHARACTERS_PER_SECOND * deltaSeconds,
    );
    const complete = this.visibleCharacters >= this.node.text.length;

    if (complete && this.node.choices?.length) {
      if (this.input.consumePress("up")) {
        this.selectedChoice = (this.selectedChoice - 1 + this.node.choices.length) % this.node.choices.length;
      }
      if (this.input.consumePress("down")) {
        this.selectedChoice = (this.selectedChoice + 1) % this.node.choices.length;
      }
    }

    if (!this.input.consumePress("confirm")) return;
    if (!complete) {
      this.visibleCharacters = this.node.text.length;
      return;
    }

    const choice = this.node.choices?.[this.selectedChoice];
    if (choice) {
      if (choice.next) this.openNode(this.requireNode(choice.next));
      else this.close(!choice.cancelCallback);
      return;
    }
    if (this.node.next) this.openNode(this.requireNode(this.node.next));
    else this.close();
  }

  public view(): DialogueView | null {
    if (!this.node) return null;
    const complete = this.visibleCharacters >= this.node.text.length;
    return {
      speaker: this.node.speaker,
      text: this.node.text.slice(0, Math.floor(this.visibleCharacters)),
      choices: complete ? (this.node.choices ?? []) : [],
      selectedChoice: this.selectedChoice,
      complete,
    };
  }

  private openNode(node: DialogueNode): void {
    // A confirmation used on the previous screen cannot spill into this node.
    this.input.clearPresses();
    this.node = node;
    this.visibleCharacters = 0;
    this.selectedChoice = 0;
  }

  private requireNode(id: string): DialogueNode {
    const node = DIALOGUES[id];
    if (!node) throw new Error(`Dialogue node ${id} does not exist.`);
    return node;
  }

  private close(runCallback = true): void {
    this.node = null;
    const callback = this.closeCallback;
    this.closeCallback = null;
    if (runCallback) callback?.();
  }
}
