import { BattleRenderer } from "../battle/BattleRenderer";
import { BattleTransitionRenderer, type BattleTransitionPhase } from "../battle/BattleTransitionRenderer";
import { BattleSystem, type BattleOutcome } from "../battle/BattleSystem";
import {
  createDefaultInventory,
  createDefaultParty,
  createIone,
  createNox,
  createSera,
  type FormationId,
} from "../battle/battleData";
import { InputManager } from "../core/InputManager";
import { SaveManager } from "../core/SaveManager";
import { DialogueRenderer } from "../dialogue/DialogueRenderer";
import { DialogueSystem } from "../dialogue/DialogueSystem";
import { FieldMenuRenderer } from "../menu/FieldMenuRenderer";
import { FieldMenuSystem } from "../menu/FieldMenuSystem";
import { experienceForNextLevel, grantExperience } from "../progression/levelData";
import { FrontEndRenderer } from "../menu/FrontEndRenderer";
import { FrontEndSystem, type FrontEndAction } from "../menu/FrontEndSystem";
import { WorldRenderer } from "../rendering/WorldRenderer";
import { TownServiceRenderer } from "../town/TownServiceRenderer";
import { TownServiceSystem } from "../town/TownServiceSystem";
import { musicThemeForMap, musicThemeForService, type AudioSceneState } from "../audio/AudioManager";
import type {
  Interaction,
  InventoryState,
  LoadedMap,
  MapEntity,
  PartyMemberId,
  PartyState,
  PlayerState,
  SaveData,
  TiledTileLayer,
  Transition,
} from "../types/game";
import {
  entityCollisionRect,
  movementBlockedByRect,
  playerCollisionRect,
  playerDungeonTerrainCollisionRect,
  playerSceneryCollisionRect,
  playerTerrainCollisionRect,
  rectanglesOverlap,
} from "./ActorCollision";
import { EncounterDirector } from "./EncounterDirector";
import { nearestInteractionEntity } from "./EntityInteractionTarget";
import { EscortTrail } from "./EscortTrail";
import { isMapEntityVisible } from "./EntityVisibility";
import { resolveInteraction } from "./InteractionResolver";
import { centralChapterDialogue, synchronizeCentralQuestFlags } from "./CentralTowerQuest";
import { MapLoader } from "./MapLoader";
import { completeMiraEscort, MIRA_ESCORTING_FLAG } from "./MiraQuest";
import { sceneryBlocksFeet } from "./SceneryCollision";
import { isWithinServiceDoor, saveCounterExitPosition, serviceDoorExitPosition } from "./ServiceDoor";

const PLAYER_SIZE = 12;
const SPEED = 58;
const START_MAP = "lumen-hollow";
const START_X = 10;
const START_Y = 6;
const LABYRINTH_MAPS = new Set([
  "echo-vault",
  "west-control-1f", "west-control-2f", "west-control-3f", "west-control-summit",
  "east-control-1f", "east-control-2f", "east-control-3f", "east-control-summit",
  "undertide-passage",
  "meridian-array",
  "central-control-entry", "central-control-galleries", "central-control-archives", "central-control-core",
  "cradle-workshop", "cradle-hangar",
]);
const LABYRINTH_RETURN_DESTINATIONS: Partial<Record<string, {
  mapId: string;
  x: number;
  y: number;
  direction: PlayerState["direction"];
}>> = {
  "echo-vault": { mapId: "glass-steppe", x: 32, y: 9, direction: "down" },
  "west-control-1f": { mapId: "glass-steppe", x: 10, y: 79, direction: "down" },
  "west-control-2f": { mapId: "glass-steppe", x: 10, y: 79, direction: "down" },
  "west-control-3f": { mapId: "glass-steppe", x: 10, y: 79, direction: "down" },
  "west-control-summit": { mapId: "glass-steppe", x: 10, y: 79, direction: "down" },
  "east-control-1f": { mapId: "glass-steppe", x: 46, y: 79, direction: "down" },
  "east-control-2f": { mapId: "glass-steppe", x: 46, y: 79, direction: "down" },
  "east-control-3f": { mapId: "glass-steppe", x: 46, y: 79, direction: "down" },
  "east-control-summit": { mapId: "glass-steppe", x: 46, y: 79, direction: "down" },
  "undertide-passage": { mapId: "southern-landing", x: 47, y: 15, direction: "left" },
  "meridian-array": { mapId: "meridian-basin", x: 38, y: 28, direction: "down" },
  "central-control-entry": { mapId: "glass-steppe", x: 28, y: 80, direction: "down" },
  "central-control-galleries": { mapId: "glass-steppe", x: 28, y: 80, direction: "down" },
  "central-control-archives": { mapId: "glass-steppe", x: 28, y: 80, direction: "down" },
  "central-control-core": { mapId: "glass-steppe", x: 28, y: 80, direction: "down" },
  "cradle-workshop": { mapId: "windscar-cliffs", x: 23, y: 4, direction: "down" },
  "cradle-hangar": { mapId: "windscar-cliffs", x: 23, y: 4, direction: "down" },
};
const TOWN_SERVICE_KINDS = new Set([
  "inn",
  "item-shop",
  "weapon-shop",
  "armor-shop",
  "save-shop",
  "revival-shop",
  "teleport",
  "party-house",
]);
const DEBUG_SPAWNS: Record<string, { x: number; y: number; direction: PlayerState["direction"] }> = {
  "relay-garden": { x: 10, y: 11, direction: "up" },
  "archive-hall": { x: 10, y: 12, direction: "up" },
  "glass-steppe": { x: 6, y: 8, direction: "down" },
  "echo-vault": { x: 5, y: 5, direction: "up" },
  "lumen-hollow": { x: 13, y: 19, direction: "up" },
  "aster-reach": { x: 14, y: 17, direction: "up" },
  "vesper-crossing": { x: 12, y: 15, direction: "up" },
  "west-control-1f": { x: 21, y: 31, direction: "up" },
  "west-control-2f": { x: 18, y: 26, direction: "up" },
  "west-control-3f": { x: 15, y: 21, direction: "up" },
  "west-control-summit": { x: 12, y: 15, direction: "up" },
  "central-control-entry": { x: 12, y: 15, direction: "up" },
  "central-control-galleries": { x: 20, y: 31, direction: "up" },
  "central-control-archives": { x: 17, y: 25, direction: "up" },
  "central-control-core": { x: 13, y: 19, direction: "up" },
  "east-control-1f": { x: 21, y: 31, direction: "up" },
  "east-control-2f": { x: 18, y: 26, direction: "up" },
  "east-control-3f": { x: 15, y: 21, direction: "up" },
  "east-control-summit": { x: 12, y: 15, direction: "up" },
  "southern-landing": { x: 31, y: 44, direction: "up" },
  "tideglass-harbor": { x: 19, y: 18, direction: "up" },
  "undertide-passage": { x: 3, y: 26, direction: "right" },
  "meridian-basin": { x: 6, y: 20, direction: "right" },
  "cairn-meridian": { x: 18, y: 21, direction: "up" },
  "meridian-array": { x: 3, y: 25, direction: "right" },
  "windscar-cliffs": { x: 3, y: 29, direction: "right" },
  "cradle-workshop": { x: 19, y: 29, direction: "up" },
  "cradle-hangar": { x: 15, y: 23, direction: "up" },
  "skyglass-relay": { x: 6, y: 13, direction: "down" },
};
const VILLAGE_TRANSIT_SPAWNS: Record<string, { x: number; y: number; direction: PlayerState["direction"] }> = {
  "lumen-hollow": { x: 24, y: 6, direction: "down" },
  "aster-reach": { x: 9, y: 7, direction: "down" },
  "vesper-crossing": { x: 9, y: 7, direction: "down" },
  "tideglass-harbor": { x: 22, y: 7, direction: "down" },
  "cairn-meridian": { x: 22, y: 7, direction: "down" },
  "skyglass-relay": { x: 26, y: 7, direction: "down" },
};
const TRANSIT_BEACON_DESTINATIONS = [
  { mapId: "lumen-hollow", name: "LUMEN HOLLOW", visitedFlag: "village.lumen-hollow.visited" },
  { mapId: "aster-reach", name: "ASTER REACH", visitedFlag: "village.aster-reach.visited" },
  { mapId: "vesper-crossing", name: "VESPER CROSSING", visitedFlag: "village.vesper-crossing.visited" },
  { mapId: "tideglass-harbor", name: "TIDEGLASS HARBOR", visitedFlag: "village.tideglass-harbor.visited" },
  { mapId: "cairn-meridian", name: "CAIRN MERIDIAN", visitedFlag: "village.cairn-meridian.visited" },
  { mapId: "skyglass-relay", name: "SKYGLASS RELAY", visitedFlag: "village.skyglass-relay.visited" },
] as const;
const PLAYER_IDLE_FRAME = 0;

export class WorldScene {
  private map!: LoadedMap;
  private mapId = START_MAP;
  private player: PlayerState = {
    x: START_X * 16 + 2,
    y: START_Y * 16,
    direction: "up",
    frame: PLAYER_IDLE_FRAME,
    animationTime: 0,
  };
  private readonly worldFlags = new Set<string>();
  private party: PartyState = createDefaultParty();
  private inventory: InventoryState = createDefaultInventory();
  private readonly encounters = new EncounterDirector();
  private readonly escortTrail = new EscortTrail();
  private scriptedBattle: { defeatFlag: string; escortFlag: string; victoryDialogueId: string } | null = null;
  private battleTransition: {
    phase: BattleTransitionPhase;
    elapsed: number;
    duration: number;
    formationId?: FormationId;
    outcome?: BattleOutcome;
  } | null = null;
  private ferryTravel: {
    mode: "ferry" | "shuttle";
    loading?: boolean;
    elapsed: number;
    duration: number;
    targetMap: string;
    targetX: number;
    targetY: number;
  } | null = null;
  private transitionLocked = false;
  private debugSession = false;
  private readonly fieldMenu: FieldMenuSystem;
  private readonly townService: TownServiceSystem;

  constructor(
    private readonly input: InputManager,
    private readonly maps: MapLoader,
    private readonly renderer: WorldRenderer,
    private readonly dialogue: DialogueSystem,
    private readonly dialogueRenderer: DialogueRenderer,
    private readonly fieldMenuRenderer: FieldMenuRenderer,
    private readonly frontEnd: FrontEndSystem,
    private readonly frontEndRenderer: FrontEndRenderer,
    private readonly townServiceRenderer: TownServiceRenderer,
    private readonly battle: BattleSystem,
    private readonly battleRenderer: BattleRenderer,
    private readonly battleTransitionRenderer: BattleTransitionRenderer,
    private readonly saves: SaveManager,
    private readonly locationElement: HTMLElement,
    private readonly saveElement: HTMLElement,
  ) {
    this.fieldMenu = new FieldMenuSystem(
      this.input,
      () => this.markUnsaved(),
      () => this.useReturnBeacon(),
      () => this.availableTransitBeaconDestinations(),
      (mapId) => this.useTransitBeacon(mapId),
    );
    this.townService = new TownServiceSystem(
      this.input,
      () => this.markUnsaved(),
      (slot) => this.saveAtVillageCounter(slot),
      (mapId) => { void this.travelToVillage(mapId); },
      (interaction) => this.leaveServiceDoor(interaction),
      (slot) => this.saves.loadSlot(slot)?.savedAt ?? null,
    );
  }

  public async initialize(
    debugMap?: string,
    debugBattle?: FormationId,
    debugParty?: "duo" | "trio" | "quartet",
    debugLevel?: number,
  ): Promise<void> {
    await this.saves.restoreBackups();
    this.debugSession = !!debugMap || !!debugBattle || !!debugParty || !!debugLevel;
    if (!this.debugSession) {
      this.frontEnd.openTitle();
      this.locationElement.textContent = "TITLE SCREEN";
      this.saveElement.textContent = this.saves.load() ? "SAVE DATA AVAILABLE" : "NO MANUAL SAVE";
      return;
    }
    if (debugMap && DEBUG_SPAWNS[debugMap]) {
      const spawn = DEBUG_SPAWNS[debugMap];
      this.mapId = debugMap;
      this.player.x = spawn.x * 16 + 2;
      this.player.y = spawn.y * 16;
      this.player.direction = spawn.direction;
      this.saveElement.textContent = "DEBUG SCENE";
    }
    try {
      this.map = await this.maps.load(this.mapId);
    } catch {
      this.mapId = START_MAP;
      this.player.x = START_X * 16 + 2;
      this.player.y = START_Y * 16;
      this.map = await this.maps.load(this.mapId);
      this.saveElement.textContent = "NO MANUAL SAVE";
    }
    this.worldFlags.add("village.lumen-hollow.visited");
    if (debugMap === "windscar-cliffs" || debugMap?.startsWith("cradle-") || debugMap === "skyglass-relay") {
      this.worldFlags.add("quest.central-archive-read");
      if (debugMap === "cradle-hangar" || debugMap === "skyglass-relay") {
        this.worldFlags.add("quest.cradle-coupler-recovered");
        this.worldFlags.add("quest.cradle-reactor-online");
      }
      if (debugMap === "skyglass-relay") {
        this.worldFlags.add("cradle.warden-defeated");
        this.worldFlags.add("quest.launch-cradle-online");
      }
    }
    if (debugMap?.startsWith("central-control-")) {
      this.worldFlags.add("array.meridian-core-read");
      if (debugMap === "central-control-archives" || debugMap === "central-control-core") {
        this.worldFlags.add("relay.central-west-online");
        this.worldFlags.add("relay.central-east-online");
        synchronizeCentralQuestFlags(this.worldFlags);
      }
    }
    this.markVillageVisited();
    if (debugParty) this.recruitIone();
    if (debugParty === "trio") this.recruitNox();
    if (debugParty === "quartet") {
      this.recruitNox();
      this.recruitSera();
    }
    if (debugLevel) {
      this.party.roster.forEach((member) => {
        while (member.level < debugLevel) grantExperience(member, experienceForNextLevel(member.level));
      });
    }
    this.escortTrail.reset(this.player);
    this.updateLocationLabel();
    if (debugBattle) this.startBattle(debugBattle);
    else this.checkNarrativeTrigger();
    if (this.debugSession) this.saveElement.textContent = "DEBUG SCENE · NO SAVE";
  }

  public update(deltaSeconds: number): void {
    if (this.frontEnd.active) {
      const previousMode = this.frontEnd.view()?.mode;
      const action = this.frontEnd.update();
      if (previousMode === "game-over" && this.frontEnd.view()?.mode === "title") {
        this.locationElement.textContent = "TITLE SCREEN";
        this.saveElement.textContent = this.saves.load() ? "SAVE DATA AVAILABLE" : "NO MANUAL SAVE";
      }
      if (action) void this.handleFrontEndAction(action);
      return;
    }
    if (this.ferryTravel) {
      this.updateFerryTravel(deltaSeconds);
      return;
    }
    if (this.battleTransition) {
      this.updateBattleTransition(deltaSeconds);
      return;
    }
    if (this.battle.active) {
      this.battle.update(deltaSeconds);
      return;
    }
    if (this.dialogue.active) {
      this.dialogue.update(deltaSeconds);
      return;
    }
    if (this.townService.active) {
      this.townService.update();
      return;
    }
    if (this.fieldMenu.active) {
      this.fieldMenu.update();
      return;
    }

    this.updateEntities(deltaSeconds);

    if (this.tryEnterServiceDoor()) return;

    if (this.input.consumePress("menu")) {
      this.fieldMenu.open(this.party, this.inventory);
      return;
    }

    if (this.input.consumePress("confirm")) this.interact();

    let xAxis = 0;
    let yAxis = 0;
    if (this.input.isHeld("left")) { xAxis -= 1; this.player.direction = "left"; }
    if (this.input.isHeld("right")) { xAxis += 1; this.player.direction = "right"; }
    if (this.input.isHeld("up")) { yAxis -= 1; this.player.direction = "up"; }
    if (this.input.isHeld("down")) { yAxis += 1; this.player.direction = "down"; }

    const moving = xAxis !== 0 || yAxis !== 0;
    if (moving) {
      const previousX = this.player.x;
      const previousY = this.player.y;
      const length = Math.hypot(xAxis, yAxis);
      const movementX = xAxis / length * SPEED * deltaSeconds;
      const movementY = yAxis / length * SPEED * deltaSeconds;
      if (!this.collides(this.player.x + movementX, this.player.y)) this.player.x += movementX;
      if (!this.collides(this.player.x, this.player.y + movementY)) this.player.y += movementY;
      this.player.animationTime += deltaSeconds;
      this.player.frame = Math.floor(this.player.animationTime * 7) % 3;
      const movedDistance = Math.hypot(this.player.x - previousX, this.player.y - previousY);
      this.escortTrail.record(this.player);
      if (this.currentTransition()) {
        void this.checkTransition();
      } else {
        this.checkNarrativeTrigger();
        const enemy = this.dialogue.active ? null : this.encounters.update(
          this.map,
          this.player.x + PLAYER_SIZE / 2,
          this.player.y + PLAYER_SIZE / 2,
          movedDistance,
          this.worldFlags,
        );
        if (enemy) this.startBattle(enemy);
      }
    } else {
      this.player.frame = PLAYER_IDLE_FRAME;
      this.player.animationTime = 0;
    }

    if (this.transitionLocked && !this.currentTransition()) this.transitionLocked = false;
  }

  public render(): void {
    const frontEndView = this.frontEnd.view();
    if (frontEndView) {
      this.frontEndRenderer.render(frontEndView);
      return;
    }
    const battleView = this.battle.view();
    if (battleView) {
      this.battleRenderer.render(battleView);
      return;
    }
    const escort = this.escortTrail.follower(this.worldFlags.has(MIRA_ESCORTING_FLAG));
    this.renderer.render(this.map, this.player, this.hasNearbyInteraction(), this.worldFlags, escort);
    if (this.ferryTravel) {
      const progress = this.ferryTravel.elapsed / this.ferryTravel.duration;
      if (this.ferryTravel.mode === "shuttle") this.renderer.drawShuttleTravel(progress);
      else this.renderer.drawFerryTravel(progress);
      return;
    }
    const townServiceView = this.townService.view();
    if (townServiceView) {
      this.townServiceRenderer.render(townServiceView);
      return;
    }
    const menuView = this.fieldMenu.view();
    if (menuView) {
      this.fieldMenuRenderer.render(menuView);
      return;
    }
    const dialogueView = this.dialogue.view();
    if (dialogueView) this.dialogueRenderer.render(dialogueView);
    if (this.battleTransition) {
      this.battleTransitionRenderer.render(
        this.battleTransition.phase,
        this.battleTransition.elapsed / this.battleTransition.duration,
      );
    }
  }

  public audioState(): AudioSceneState {
    const frontEndView = this.frontEnd.view();
    const battleView = this.battle.view();
    const serviceView = this.townService.view();
    const menuInput = !!frontEndView
      || !!battleView?.acceptingCommand
      || this.dialogue.active
      || this.townService.active
      || this.fieldMenu.active;
    return {
      theme: frontEndView?.mode === "game-over"
        ? "game-over"
        : battleView?.results || battleView?.animation === "victory"
          ? "victory"
          : battleView || this.battleTransition?.phase === "enter"
            ? "battle"
            : serviceView
              ? musicThemeForService(serviceView.serviceKind) ?? musicThemeForMap(this.mapId)
              : frontEndView
                ? "title"
          : this.map
            ? musicThemeForMap(this.mapId)
            : "silence",
      menuInput,
      mapId: this.map ? this.mapId : null,
      battleAnimation: battleView?.animation ?? null,
      battleEffect: battleView?.effect ?? null,
      battleTransition: this.battleTransition?.phase ?? null,
      serviceActive: this.townService.active,
      serviceKind: serviceView?.serviceKind ?? null,
    };
  }

  private collides(x: number, y: number): boolean {
    const collision = this.map.tileLayers.get("collision");
    if (!collision) return false;
    const terrainBody = LABYRINTH_MAPS.has(this.mapId)
      ? playerDungeonTerrainCollisionRect(x, y)
      : playerTerrainCollisionRect(x, y);
    const left = Math.floor(terrainBody.left / this.map.tileWidth);
    const right = Math.floor((terrainBody.right - 1) / this.map.tileWidth);
    const top = Math.floor(terrainBody.top / this.map.tileHeight);
    const bottom = Math.floor((terrainBody.bottom - 1) / this.map.tileHeight);
    const points = [[left, top], [right, top], [left, bottom], [right, bottom]];
    const tileBlocked = points.some(([tileX, tileY]) => {
      if (tileX === undefined || tileY === undefined) return true;
      if (tileX < 0 || tileY < 0 || tileX >= this.map.width || tileY >= this.map.height) return true;
      return (collision.data[tileY * this.map.width + tileX] ?? 1) !== 0;
    });
    if (tileBlocked) return true;
    const sceneryFeet = playerSceneryCollisionRect(x, y);
    if (this.map.scenery.some((object) => sceneryBlocksFeet(object, sceneryFeet))) {
      return true;
    }
    const closedBarrier = this.map.interactions.some((interaction) => interaction.kind === "barrier"
      && (!interaction.requiredFlag || !this.worldFlags.has(interaction.requiredFlag))
      && rectanglesOverlap(terrainBody, {
        left: interaction.x,
        top: interaction.y,
        right: interaction.x + interaction.width,
        bottom: interaction.y + interaction.height,
      }));
    if (closedBarrier) return true;
    const currentPlayerBody = playerCollisionRect(this.player.x, this.player.y);
    const playerBody = playerCollisionRect(x, y);
    return this.visibleEntities().some((entity) => movementBlockedByRect(
      currentPlayerBody,
      playerBody,
      entityCollisionRect(entity.x, entity.y, entity.spriteId),
    ));
  }

  private updateEntities(deltaSeconds: number): void {
    const collision = this.map.tileLayers.get("collision");
    if (!collision) return;
    this.visibleEntities().forEach((entity) => {
      if (entity.movement !== "patrol" || entity.patrolRange <= 0) return;
      if (entity.patrolPause > 0) {
        entity.patrolPause = Math.max(0, entity.patrolPause - deltaSeconds);
        entity.frame = 0;
        return;
      }
      let nextX = entity.x;
      let nextY = entity.y;
      if (entity.patrolAxis === "horizontal") nextX += entity.speed * entity.patrolSign * deltaSeconds;
      else nextY += entity.speed * entity.patrolSign * deltaSeconds;
      const travelled = entity.patrolAxis === "horizontal" ? nextX - entity.originX : nextY - entity.originY;
      const blocked = this.entityMovementBlocked(entity, nextX, nextY, collision);
      if (Math.abs(travelled) > entity.patrolRange || blocked) {
        entity.patrolSign = entity.patrolSign === 1 ? -1 : 1;
        entity.patrolPause = 0.75 + ((entity.id * 29) % 70) / 100;
        entity.animationTime = 0;
        entity.frame = 0;
      } else {
        entity.x = nextX;
        entity.y = nextY;
      }
      entity.direction = entity.patrolAxis === "horizontal"
        ? entity.patrolSign === 1 ? "right" : "left"
        : entity.patrolSign === 1 ? "down" : "up";
      if (entity.patrolPause === 0) {
        entity.animationTime += deltaSeconds;
        entity.frame = Math.floor(entity.animationTime * 6) % 3;
      }
    });
  }

  private entityMovementBlocked(entity: MapEntity, x: number, y: number, collision: TiledTileLayer): boolean {
    const body = entityCollisionRect(x, y, entity.spriteId);
    const currentBody = entityCollisionRect(entity.x, entity.y, entity.spriteId);
    const points = [
      [body.left, body.top],
      [body.right - 0.01, body.top],
      [body.left, body.bottom - 0.01],
      [body.right - 0.01, body.bottom - 0.01],
    ];
    const tileBlocked = points.some(([pointX, pointY]) => {
      if (pointX === undefined || pointY === undefined) return true;
      const tileX = Math.floor(pointX / this.map.tileWidth);
      const tileY = Math.floor(pointY / this.map.tileHeight);
      return tileX < 0 || tileY < 0 || tileX >= this.map.width || tileY >= this.map.height
        || (collision.data[tileY * this.map.width + tileX] ?? 1) !== 0;
    });
    if (tileBlocked || movementBlockedByRect(currentBody, body, playerCollisionRect(this.player.x, this.player.y))) return true;
    return this.visibleEntities().some((candidate) => candidate.id !== entity.id
      && movementBlockedByRect(currentBody, body, entityCollisionRect(candidate.x, candidate.y, candidate.spriteId)));
  }

  private async checkTransition(): Promise<void> {
    const transition = this.currentTransition();
    if (!transition || this.transitionLocked) return;
    this.transitionLocked = true;
    await this.changeMap(transition);
  }

  private currentTransition(): Transition | undefined {
    const footX = this.player.x + PLAYER_SIZE / 2;
    const footY = this.player.y + 15;
    return this.map.transitions.find((transition) => footX >= transition.x
      && footX < transition.x + transition.width
      && footY >= transition.y
      && footY < transition.y + transition.height);
  }

  private async changeMap(transition: Transition): Promise<void> {
    this.mapId = transition.targetMap;
    this.map = await this.maps.load(this.mapId);
    this.player.x = transition.targetX * this.map.tileWidth + 2 + transition.targetOffsetX;
    this.player.y = transition.targetY * this.map.tileHeight + transition.targetOffsetY;
    this.player.direction = transition.targetDirection;
    this.player.animationTime = 0;
    this.player.frame = PLAYER_IDLE_FRAME;
    this.input.cancelMovement();
    this.escortTrail.reset(this.player);
    this.markVillageVisited();
    this.updateLocationLabel();
    this.markUnsaved();
    if (this.completeEscortAtLumen()) return;
    this.checkNarrativeTrigger();
  }

  private interact(): void {
    const centerX = this.player.x + PLAYER_SIZE / 2;
    const centerY = this.player.y + PLAYER_SIZE / 2;
    const entity = nearestInteractionEntity(this.visibleEntities(), centerX, centerY);
    if (entity) {
      if (entity.battleFormation && (!entity.defeatFlag || !this.worldFlags.has(entity.defeatFlag))) {
        this.scriptedBattle = {
          defeatFlag: entity.defeatFlag,
          escortFlag: entity.escortFlag,
          victoryDialogueId: entity.victoryDialogueId,
        };
        if (entity.spriteId === "archive-custodian") {
          this.dialogue.start(entity.dialogueId, () => this.startBattle(entity.battleFormation!));
        } else this.startBattle(entity.battleFormation);
        return;
      }
      const dialogueId = (entity.name === "Engineer Rhea" ? centralChapterDialogue(entity.spriteId, this.worldFlags) : null) ?? (entity.dialogueAfterFlag
        && entity.dialogueAfterId
        && this.worldFlags.has(entity.dialogueAfterFlag)
        ? entity.dialogueAfterId
        : entity.dialogueMiddleFlag
          && entity.dialogueMiddleId
          && this.worldFlags.has(entity.dialogueMiddleFlag)
          ? entity.dialogueMiddleId
        : entity.dialogueId);
      if (entity.travelMap) {
        this.dialogue.start(dialogueId, () => {
          if (entity.spriteId === "ferry-boat") {
            this.startFerryTravel(entity.travelMap!, entity.travelX, entity.travelY);
          } else if (entity.spriteId === "cradle-shuttle") {
            this.startFerryTravel(entity.travelMap!, entity.travelX, entity.travelY, "shuttle");
          } else {
            void this.travelToMap(entity.travelMap!, entity.travelX, entity.travelY);
          }
        });
        return;
      }
      if (entity.recruitMemberId && entity.recruitFlag && !this.worldFlags.has(entity.recruitFlag)) {
        this.dialogue.start(dialogueId, () => {
          this.recruitToRoster(entity.recruitMemberId!);
          this.worldFlags.add(entity.recruitFlag);
          this.markUnsaved();
        });
      } else this.dialogue.start(dialogueId);
      return;
    }

    const target = this.nearbyInteraction(centerX, centerY);
    if (target) {
      // A recovered or older village save can contain Nox in the roster while
      // lacking the historical recruitment flag.  The array cares about his
      // actual presence, not that stale bookkeeping detail.
      if (target.kind === "control-console"
        && target.requiredFlag === "party.nox-recruited"
        && this.party.roster.some((member) => member.id === "nox")) {
        this.worldFlags.add("party.nox-recruited");
      }
      const outcome = resolveInteraction(target, this.inventory, this.worldFlags);
      synchronizeCentralQuestFlags(this.worldFlags);
      if (outcome.changed && target.dialogueId) this.dialogue.start(target.dialogueId);
      else this.dialogue.startInline(outcome.speaker, outcome.text);
      if (outcome.changed) {
        if (this.worldFlags.has("tower.west-restored") && this.worldFlags.has("tower.east-restored")) {
          this.worldFlags.add("quest.control-towers-restored");
        }
        this.markUnsaved();
      }
    }
  }

  private hasNearbyInteraction(): boolean {
    if (this.dialogue.active || this.townService.active) return false;
    const centerX = this.player.x + PLAYER_SIZE / 2;
    const centerY = this.player.y + PLAYER_SIZE / 2;
    const nearEntity = !!nearestInteractionEntity(this.visibleEntities(), centerX, centerY);
    return nearEntity || !!this.nearbyInteraction(centerX, centerY);
  }

  private nearbyInteraction(centerX: number, centerY: number) {
    return this.map.interactions.find((interaction) => {
      if (TOWN_SERVICE_KINDS.has(interaction.kind)) return false;
      const nearestX = Math.max(interaction.x, Math.min(centerX, interaction.x + interaction.width));
      const nearestY = Math.max(interaction.y, Math.min(centerY, interaction.y + interaction.height));
      return Math.hypot(centerX - nearestX, centerY - nearestY) <= 19;
    });
  }

  private tryEnterServiceDoor(): boolean {
    if (this.input.isHeld("down")) return false;
    const approachDirection: PlayerState["direction"] | null = this.input.isHeld("up")
      ? "up"
      : this.input.isHeld("left")
        ? "left"
        : this.input.isHeld("right")
          ? "right"
          : null;
    if (!approachDirection) return false;
    const footX = this.player.x + PLAYER_SIZE / 2;
    const footY = this.player.y + 15;
    const service = this.map.interactions.find((interaction) => TOWN_SERVICE_KINDS.has(interaction.kind)
      && isWithinServiceDoor(interaction, footX, footY, approachDirection));
    if (!service) return false;
    this.townService.open(service, this.party, this.inventory, this.worldFlags);
    return true;
  }

  private leaveServiceDoor(interaction: Interaction): void {
    const position = serviceDoorExitPosition(interaction, PLAYER_SIZE, 15);
    this.player.x = position.x;
    this.player.y = position.y;
    this.player.direction = "down";
    this.player.frame = PLAYER_IDLE_FRAME;
    this.player.animationTime = 0;
    this.escortTrail.reset(this.player);
  }

  private markVillageVisited(): void {
    if (["lumen-hollow", "aster-reach", "vesper-crossing", "tideglass-harbor", "cairn-meridian", "skyglass-relay"].includes(this.mapId)) {
      this.worldFlags.add(`village.${this.mapId}.visited`);
    }
  }

  private checkNarrativeTrigger(): void {
    if (this.dialogue.active) return;
    const centerX = this.player.x + PLAYER_SIZE / 2;
    const centerY = this.player.y + PLAYER_SIZE / 2;
    const trigger = this.map.narrativeTriggers.find((candidate) => !this.worldFlags.has(candidate.flag)
      && centerX >= candidate.x
      && centerX < candidate.x + candidate.width
      && centerY >= candidate.y
      && centerY < candidate.y + candidate.height);
    if (!trigger) return;
    this.dialogue.start(trigger.dialogueId, () => {
      if (trigger.flag === "party.ione-recruited") this.recruitIone();
      this.worldFlags.add(trigger.flag);
      this.markUnsaved();
    });
  }

  private saveAtVillageCounter(slot: number): boolean {
    if (this.debugSession) {
      this.saveElement.textContent = "DEBUG SCENE · NO SAVE";
      return false;
    }
    const counterPosition = saveCounterExitPosition(this.map.interactions, PLAYER_SIZE, 15);
    const savedPosition = counterPosition ?? { x: this.player.x, y: this.player.y };
    const data: SaveData = {
      version: 13,
      mapId: this.mapId,
      player: {
        x: Math.round(savedPosition.x * 100) / 100,
        y: Math.round(savedPosition.y * 100) / 100,
        direction: counterPosition ? "down" : this.player.direction,
      },
      worldFlags: [...this.worldFlags].sort(),
      party: {
        activeMemberIds: [...this.party.activeMemberIds],
        roster: this.party.roster.map((member) => ({
          ...member,
          spells: [...member.spells],
          equipment: { ...member.equipment },
        })),
      },
      inventory: { ...this.inventory, gear: [...this.inventory.gear] },
      savedAt: Date.now(),
    };
    this.saves.save(data, slot);
    this.saveElement.textContent = `VILLAGE SAVE · SLOT ${slot}`;
    return true;
  }

  private markUnsaved(): void {
    if (this.debugSession) {
      this.saveElement.textContent = "DEBUG SCENE · NO SAVE";
      return;
    }
    this.saveElement.textContent = "UNSAVED PROGRESS";
  }

  private async travelToVillage(mapId: string): Promise<void> {
    const spawn = VILLAGE_TRANSIT_SPAWNS[mapId];
    if (!spawn) return;
    this.mapId = mapId;
    this.map = await this.maps.load(mapId);
    this.player.x = spawn.x * this.map.tileWidth + 2;
    this.player.y = spawn.y * this.map.tileHeight;
    this.player.direction = spawn.direction;
    this.player.frame = PLAYER_IDLE_FRAME;
    this.player.animationTime = 0;
    this.escortTrail.reset(this.player);
    this.markVillageVisited();
    this.updateLocationLabel();
    this.markUnsaved();
    if (this.completeEscortAtLumen()) return;
    this.checkNarrativeTrigger();
  }

  private async travelToMap(
    mapId: string,
    tileX: number,
    tileY: number,
    direction: PlayerState["direction"] = "up",
  ): Promise<void> {
    this.mapId = mapId;
    this.map = await this.maps.load(mapId);
    this.player.x = tileX * this.map.tileWidth + 2;
    this.player.y = tileY * this.map.tileHeight;
    this.player.direction = direction;
    this.player.frame = PLAYER_IDLE_FRAME;
    this.player.animationTime = 0;
    this.input.clearPresses();
    this.input.cancelMovement();
    this.escortTrail.reset(this.player);
    this.markVillageVisited();
    this.updateLocationLabel();
    this.markUnsaved();
    this.checkNarrativeTrigger();
  }

  private startFerryTravel(targetMap: string, targetX: number, targetY: number, mode: "ferry" | "shuttle" = "ferry"): void {
    this.input.clearPresses();
    this.input.cancelMovement();
    this.locationElement.textContent = mode === "shuttle" ? "SKYGLASS FLIGHT" : "SOUTHERN PASSAGE";
    this.ferryTravel = {
      mode,
      elapsed: 0,
      duration: 3.4,
      targetMap,
      targetX,
      targetY,
    };
  }

  private updateFerryTravel(deltaSeconds: number): void {
    const travel = this.ferryTravel;
    if (!travel || travel.loading) return;
    travel.elapsed = Math.min(travel.duration, travel.elapsed + deltaSeconds);
    if (travel.elapsed < travel.duration) return;
    travel.loading = true;
    this.input.cancelMovement();
    void this.travelToMap(travel.targetMap, travel.targetX, travel.targetY, "down")
      .finally(() => { this.ferryTravel = null; });
  }

  private updateLocationLabel(): void {
    this.locationElement.textContent = this.map.name.toUpperCase();
  }

  private startBattle(formationId: FormationId): void {
    if (this.battle.active || this.battleTransition) return;
    this.input.clearPresses();
    this.locationElement.textContent = "HOSTILE CONTACT";
    this.battleTransition = { phase: "enter", elapsed: 0, duration: 0.42, formationId };
  }

  private updateBattleTransition(deltaSeconds: number): void {
    const transition = this.battleTransition;
    if (!transition) return;
    transition.elapsed = Math.min(transition.duration, transition.elapsed + deltaSeconds);
    if (transition.elapsed < transition.duration) return;
    this.battleTransition = null;
    if (transition.phase === "enter" && transition.formationId) {
      this.battle.start(this.party, this.inventory, transition.formationId, (outcome) => {
        if (outcome === "defeat") {
          void this.handleBattleEnd(outcome);
          return;
        }
        this.battleTransition = { phase: "exit", elapsed: 0, duration: 0.38, outcome };
      });
      return;
    }
    if (transition.phase === "exit" && transition.outcome) void this.handleBattleEnd(transition.outcome);
  }

  private async handleBattleEnd(outcome: BattleOutcome): Promise<void> {
    this.encounters.reset();
    const scriptedBattle = this.scriptedBattle;
    this.scriptedBattle = null;
    if (outcome === "defeat") {
      this.frontEnd.openGameOver();
      this.locationElement.textContent = "GAME OVER";
      this.saveElement.textContent = "LAST SAVE UNCHANGED";
    } else if (outcome === "victory" && scriptedBattle) {
      if (scriptedBattle.defeatFlag) this.worldFlags.add(scriptedBattle.defeatFlag);
      if (scriptedBattle.escortFlag) this.worldFlags.add(scriptedBattle.escortFlag);
      if (scriptedBattle.victoryDialogueId) this.dialogue.start(scriptedBattle.victoryDialogueId);
    }
    if (outcome !== "defeat") {
      this.updateLocationLabel();
      this.markUnsaved();
    }
  }

  private recruitIone(): void {
    if (!this.party.roster.some((member) => member.id === "ione")) this.party.roster.push(createIone());
    if (!this.party.activeMemberIds.includes("ione") && this.party.activeMemberIds.length < 4) {
      this.party.activeMemberIds.push("ione");
    }
  }

  private recruitNox(): void {
    if (!this.party.roster.some((member) => member.id === "nox")) this.party.roster.push(createNox());
    if (!this.party.activeMemberIds.includes("nox") && this.party.activeMemberIds.length < 4) {
      this.party.activeMemberIds.push("nox");
    }
  }

  private recruitSera(): void {
    if (!this.party.roster.some((member) => member.id === "sera")) this.party.roster.push(createSera());
    if (!this.party.activeMemberIds.includes("sera") && this.party.activeMemberIds.length < 4) {
      this.party.activeMemberIds.push("sera");
    }
  }

  private recruitToRoster(memberId: PartyMemberId): void {
    if (this.party.roster.some((member) => member.id === memberId)) return;
    if (memberId === "ione") this.party.roster.push(createIone());
    else if (memberId === "nox") this.party.roster.push(createNox());
    else if (memberId === "sera") this.party.roster.push(createSera());
  }

  private completeEscortAtLumen(): boolean {
    if (this.mapId !== "lumen-hollow" || !this.worldFlags.has(MIRA_ESCORTING_FLAG)) return false;
    this.dialogue.start("mira-homecoming", () => {
      completeMiraEscort(this.worldFlags);
      this.markUnsaved();
    });
    return true;
  }

  private async handleFrontEndAction(action: FrontEndAction): Promise<void> {
    this.frontEnd.beginLoading(action.kind === "new-game" ? "Opening a new path…" : "Restoring village record…");
    try {
      if (action.kind === "new-game") await this.startNewGame();
      else await this.continueFromSlot(action.slot);
    } catch {
      this.frontEnd.openTitle("The world data could not be opened.");
      this.locationElement.textContent = "TITLE SCREEN";
    }
  }

  private async startNewGame(): Promise<void> {
    this.maps.reset();
    this.mapId = START_MAP;
    this.player = {
      x: START_X * 16 + 2,
      y: START_Y * 16,
      direction: "up",
      frame: PLAYER_IDLE_FRAME,
      animationTime: 0,
    };
    this.worldFlags.clear();
    this.party = createDefaultParty();
    this.inventory = createDefaultInventory();
    this.map = await this.maps.load(this.mapId);
    this.escortTrail.reset(this.player);
    this.worldFlags.add("village.lumen-hollow.visited");
    this.frontEnd.close();
    this.updateLocationLabel();
    this.saveElement.textContent = "UNSAVED NEW GAME";
    this.checkNarrativeTrigger();
  }

  private async continueFromSlot(slot: number): Promise<void> {
    const save = this.saves.loadSlot(slot);
    if (!save) {
      this.frontEnd.openTitle("That village record could not be restored.");
      return;
    }
    this.mapId = save.mapId;
    this.maps.reset();
    this.player = { ...save.player, frame: PLAYER_IDLE_FRAME, animationTime: 0 };
    this.worldFlags.clear();
    save.worldFlags.forEach((flag) => this.worldFlags.add(flag));
    synchronizeCentralQuestFlags(this.worldFlags);
    this.party = save.party;
    this.inventory = save.inventory;
    try {
      this.map = await this.maps.load(this.mapId);
      const position = saveCounterExitPosition(this.map.interactions, PLAYER_SIZE, 15);
      if (position) {
        this.player.x = position.x;
        this.player.y = position.y;
        this.player.direction = "down";
      }
      this.escortTrail.reset(this.player);
    } catch {
      this.frontEnd.openTitle("That village record points to an unavailable location.");
      return;
    }
    this.frontEnd.close();
    this.updateLocationLabel();
    this.saveElement.textContent = `VILLAGE SAVE RESTORED · SLOT ${slot}`;
  }

  private useReturnBeacon(): boolean {
    const destination = LABYRINTH_RETURN_DESTINATIONS[this.mapId];
    if (!LABYRINTH_MAPS.has(this.mapId) || !destination) return false;
    this.transitionLocked = true;
    void this.travelToMap(destination.mapId, destination.x, destination.y, destination.direction)
      .finally(() => { this.transitionLocked = false; });
    return true;
  }

  private availableTransitBeaconDestinations(): readonly { mapId: string; name: string }[] {
    if (LABYRINTH_MAPS.has(this.mapId)) return [];
    return TRANSIT_BEACON_DESTINATIONS
      .filter((destination) => destination.mapId !== this.mapId && this.worldFlags.has(destination.visitedFlag))
      .map(({ mapId, name }) => ({ mapId, name }));
  }

  private useTransitBeacon(mapId: string): boolean {
    if (!this.availableTransitBeaconDestinations().some((destination) => destination.mapId === mapId)) return false;
    void this.travelToVillage(mapId);
    return true;
  }

  private visibleEntities(): MapEntity[] {
    return this.map.entities.filter((entity) => isMapEntityVisible(entity, this.worldFlags));
  }
}
