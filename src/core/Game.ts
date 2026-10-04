import { BattleRenderer } from "../battle/BattleRenderer";
import { BattleTransitionRenderer } from "../battle/BattleTransitionRenderer";
import { BattleSystem } from "../battle/BattleSystem";
import type { FormationId } from "../battle/battleData";
import { WorldRenderer } from "../rendering/WorldRenderer";
import { DialogueRenderer } from "../dialogue/DialogueRenderer";
import { DialogueSystem } from "../dialogue/DialogueSystem";
import { FieldMenuRenderer } from "../menu/FieldMenuRenderer";
import { FrontEndRenderer } from "../menu/FrontEndRenderer";
import { FrontEndSystem } from "../menu/FrontEndSystem";
import { MapLoader } from "../world/MapLoader";
import { WorldScene } from "../world/WorldScene";
import { TownServiceRenderer } from "../town/TownServiceRenderer";
import { GameLoop } from "./GameLoop";
import { InputManager } from "./InputManager";
import { SaveManager } from "./SaveManager";
import { AudioManager, type AudioControls } from "../audio/AudioManager";

export class Game {
  private readonly scene: WorldScene;
  private readonly loop: GameLoop;
  private readonly dialogue: DialogueSystem;

  constructor(
    canvas: HTMLCanvasElement,
    locationElement: HTMLElement,
    saveElement: HTMLElement,
    audioControls: AudioControls,
  ) {
    const audio = new AudioManager(audioControls);
    const input = new InputManager((action) => audio.handleInput(action));
    const maps = new MapLoader();
    const renderer = new WorldRenderer(canvas);
    const dialogue = new DialogueSystem(input);
    this.dialogue = dialogue;
    const dialogueRenderer = new DialogueRenderer(canvas);
    const fieldMenuRenderer = new FieldMenuRenderer(canvas);
    const frontEndRenderer = new FrontEndRenderer(canvas);
    const townServiceRenderer = new TownServiceRenderer(canvas);
    const battle = new BattleSystem(input);
    const battleRenderer = new BattleRenderer(canvas);
    const battleTransitionRenderer = new BattleTransitionRenderer(canvas);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is unavailable.");
    context.setTransform(2, 0, 0, 2, 0, 0);
    context.imageSmoothingEnabled = false;
    const saves = new SaveManager();
    const frontEnd = new FrontEndSystem(input, () => [1, 2, 3].map((slot) => ({
      slot,
      savedAt: saves.loadSlot(slot)?.savedAt ?? null,
    })));
    this.scene = new WorldScene(
      input,
      maps,
      renderer,
      dialogue,
      dialogueRenderer,
      fieldMenuRenderer,
      frontEnd,
      frontEndRenderer,
      townServiceRenderer,
      battle,
      battleRenderer,
      battleTransitionRenderer,
      saves,
      locationElement,
      saveElement,
    );
    this.loop = new GameLoop(
      (deltaSeconds) => {
        this.scene.update(deltaSeconds);
        audio.sync(this.scene.audioState());
      },
      () => this.scene.render(),
    );
  }

  public async start(
    debugMap?: string,
    debugDialogue?: string,
    debugBattle?: FormationId,
    debugParty?: "duo" | "trio" | "quartet",
    debugLevel?: number,
  ): Promise<void> {
    await this.scene.initialize(debugMap, debugBattle, debugParty, debugLevel);
    if (debugDialogue) this.dialogue.start(debugDialogue);
    this.loop.start();
  }
}
