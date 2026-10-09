import type { Direction, Interaction, LoadedMap, MapEntity, PlayerState, TiledTileLayer } from "../types/game";
import { createPixelTileset } from "./PixelTileset";
import { SceneryRenderer } from "./SceneryRenderer";
import { WorldCamera, type CameraPosition } from "./WorldCamera";
import { isMapEntityVisible } from "../world/EntityVisibility";

const VIEW_WIDTH = 320;
const VIEW_HEIGHT = 240;
const TILE = 16;
const DRAW_LAYERS = ["ground", "terrain", "details-low", "objects"];
const LUMEN_INTEGRATED_SIGNS = new Set([
  "hollow-inn-service",
  "ash-house-service",
  "weapon-shop-service",
  "transit-gate-service",
  "item-shop-service",
  "lumen-regeneration-clinic",
  "memory-counter-service",
  "armor-shop-service",
]);

export class WorldRenderer {
  private readonly tileset = createPixelTileset();
  private readonly ashSprites: HTMLImageElement;
  private readonly villageNpcSprites: HTMLImageElement;
  private readonly regionalNpcSprites: HTMLImageElement;
  private readonly seraSprites: HTMLImageElement;
  private readonly vaultGuardianSprites: HTMLImageElement;
  private readonly controlArrayConsole: HTMLImageElement;
  private readonly archiveCustodian = new Image();
  private readonly tempestRegent = new Image();
  private readonly crownJudicator = new Image();
  private readonly surveyDrone = new Image();
  private readonly cradleShuttle = new Image();
  private readonly lumenHdTiles: HTMLImageElement;
  private readonly worldHdTiles: HTMLImageElement;
  private readonly echoVaultHdTiles: HTMLImageElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly scenery: SceneryRenderer;
  private readonly camera = new WorldCamera();

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is unavailable.");
    this.ctx = context;
    this.ctx.imageSmoothingEnabled = false;
    this.ashSprites = new Image();
    this.ashSprites.src = `${import.meta.env.BASE_URL}assets/graphics/ash-overworld-hd-v1.png`;
    this.villageNpcSprites = new Image();
    this.villageNpcSprites.src = `${import.meta.env.BASE_URL}assets/graphics/village-npcs-hd-v3.png`;
    this.regionalNpcSprites = new Image();
    this.regionalNpcSprites.src = `${import.meta.env.BASE_URL}assets/graphics/village-npcs-regional-hd-v3.png`;
    this.seraSprites = new Image();
    this.seraSprites.src = `${import.meta.env.BASE_URL}assets/graphics/sera-overworld-hd-v1.png`;
    this.vaultGuardianSprites = new Image();
    this.vaultGuardianSprites.src = `${import.meta.env.BASE_URL}assets/graphics/echo-vault-guardian-hd-v1.png`;
    this.controlArrayConsole = new Image();
    this.controlArrayConsole.src = `${import.meta.env.BASE_URL}assets/graphics/control-array-console-hd-v1.png`;
    this.archiveCustodian.src = `${import.meta.env.BASE_URL}assets/graphics/archive-custodian-hd-v1.png`;
    this.tempestRegent.src = `${import.meta.env.BASE_URL}assets/graphics/tempest-regent-hd-v1.png`;
    this.crownJudicator.src = `${import.meta.env.BASE_URL}assets/graphics/crown-judicator-hd-v1.png`;
    this.surveyDrone.src = `${import.meta.env.BASE_URL}assets/graphics/cipher-drone-hd-v1.png`;
    this.cradleShuttle.src = `${import.meta.env.BASE_URL}assets/graphics/cradle-shuttle-hd-v1.png`;
    this.lumenHdTiles = new Image();
    this.lumenHdTiles.src = `${import.meta.env.BASE_URL}assets/graphics/lumen-tiles-hd-v1.png`;
    this.worldHdTiles = new Image();
    this.worldHdTiles.src = `${import.meta.env.BASE_URL}assets/graphics/world-terrain-hd-v1.png`;
    this.echoVaultHdTiles = new Image();
    this.echoVaultHdTiles.src = `${import.meta.env.BASE_URL}assets/graphics/echo-vault-tiles-hd-v1.png`;
    this.scenery = new SceneryRenderer(this.ctx);
  }

  public render(
    map: LoadedMap,
    player: PlayerState,
    showInteractionPrompt: boolean,
    worldFlags: ReadonlySet<string>,
    escort: PlayerState | null = null,
  ): void {
    const camera = this.camera.follow(map, player);
    this.ctx.fillStyle = "#070b18";
    this.ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    this.ctx.save();
    this.ctx.translate(-camera.x, -camera.y);

    for (const name of DRAW_LAYERS) {
      const layer = map.tileLayers.get(name);
      if (layer?.visible) this.drawLayer(layer, map.width, map.height, camera, map.id);
    }

    const visibleEntities = map.entities.filter((entity) => isMapEntityVisible(entity, worldFlags));
    const actors = [
      ...map.scenery.map((object) => ({ y: object.y + object.anchorY, order: 0, draw: () => this.scenery.draw(object) })),
      ...map.interactions.filter((interaction) => interaction.kind === "cache").map((interaction) => ({
        y: interaction.y + interaction.height,
        order: 1,
        draw: () => this.drawCache(interaction, worldFlags.has(interaction.flag)),
      })),
      ...map.interactions.filter((interaction) => interaction.kind === "control-console" || interaction.kind === "archive-authenticator").map((interaction) => ({
        y: interaction.y + interaction.height,
        order: 1,
        draw: () => this.drawControlConsole(interaction, worldFlags.has(interaction.flag)),
      })),
      ...map.interactions.filter((interaction) => this.isTownService(interaction)
        && !this.hasIntegratedServiceSign(map.id, interaction.name)).map((interaction) => ({
        y: interaction.y + interaction.height - 1,
        order: 1,
        draw: () => this.drawServiceSign(interaction),
      })),
      ...map.interactions.filter((interaction) => interaction.kind === "barrier"
        && (!interaction.requiredFlag || !worldFlags.has(interaction.requiredFlag))).map((interaction) => ({
        y: interaction.y + interaction.height,
        order: 1,
        draw: () => this.drawBridgeBarrier(interaction),
      })),
      ...visibleEntities.map((entity) => ({ y: entity.y + 16, order: 1, draw: () => this.drawEntity(entity) })),
      ...(escort ? [{
        y: escort.y + 16,
        order: 1,
        draw: () => this.drawEscortFollower(escort.x, escort.y, escort.direction, escort.frame),
      }] : []),
      { y: player.y + 16, order: 2, draw: () => this.drawPlayer(player) },
    ].sort((left, right) => left.y - right.y || left.order - right.order);
    actors.forEach((actor) => actor.draw());
    const foreground = map.tileLayers.get("details-high");
    if (foreground?.visible) this.drawLayer(foreground, map.width, map.height, camera, map.id);
    this.ctx.restore();
    this.drawHud(map.name);
    if (showInteractionPrompt) this.drawInteractionPrompt();
    this.drawScanlines();
  }

  public drawFerryTravel(progress: number): void {
    const normalized = Math.max(0, Math.min(1, progress));
    this.ctx.save();
    this.ctx.globalAlpha = Math.min(1, normalized * 6);
    this.ctx.fillStyle = "#07182d";
    this.ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    const waveOffset = Math.floor(normalized * 48) % 24;
    for (let row = -1; row < 13; row += 1) {
      const y = row * 20 + waveOffset;
      this.ctx.fillStyle = row % 2 === 0 ? "#0d4164" : "#0a3152";
      for (let x = (row % 2) * 12 - 24; x < VIEW_WIDTH + 24; x += 48) {
        this.ctx.fillRect(x, y, 22, 2);
        this.ctx.fillStyle = "#3e91a8";
        this.ctx.fillRect(x + 4, y, 7, 1);
        this.ctx.fillStyle = row % 2 === 0 ? "#0d4164" : "#0a3152";
      }
    }

    const boatX = VIEW_WIDTH / 2;
    const boatY = 34 + normalized * 164;
    this.ctx.fillStyle = "#d9edf2";
    this.ctx.fillRect(boatX - 1, boatY - 20, 3, 14);
    this.ctx.fillStyle = "#73e1d1";
    this.ctx.fillRect(boatX - 10, boatY - 17, 9, 8);
    this.ctx.fillStyle = "#26394b";
    this.ctx.fillRect(boatX - 12, boatY - 8, 25, 13);
    this.ctx.fillStyle = "#9b7046";
    this.ctx.fillRect(boatX - 9, boatY - 6, 19, 8);
    this.ctx.fillStyle = "#e6b762";
    this.ctx.fillRect(boatX - 5, boatY - 3, 11, 3);
    this.ctx.fillStyle = "#d4f5ef";
    this.ctx.fillRect(boatX - 14, boatY + 7, 29, 2);
    this.ctx.fillRect(boatX - 10, boatY + 11, 21, 1);

    this.ctx.fillStyle = "#07101dcc";
    this.ctx.fillRect(76, 12, 168, 20);
    this.ctx.strokeStyle = "#7894b5";
    this.ctx.strokeRect(76.5, 12.5, 167, 19);
    this.ctx.fillStyle = "#79e2ce";
    this.ctx.font = "8px 'Press Start 2P', monospace";
    this.ctx.textAlign = "center";
    this.ctx.fillText("SOUTHERN PASSAGE", VIEW_WIDTH / 2, 25);
    this.ctx.restore();
    this.drawScanlines();
  }

  public drawShuttleTravel(progress: number): void {
    this.ctx.save();
    this.ctx.setTransform(2,0,0,2,0,0);
    this.ctx.fillStyle = "#244e6a";
    this.ctx.fillRect(0,0,VIEW_WIDTH,VIEW_HEIGHT);
    for (let row=0;row<8;row++) {
      const y=(row*43+progress*240)%300-35;
      const x=(row*71)%VIEW_WIDTH-24;
      this.ctx.fillStyle=row%2===0?"#477994":"#365f7c";
      this.ctx.fillRect(x,y,80,9); this.ctx.fillRect(x+13,y-5,44,5);
    }
    if (this.cradleShuttle.complete && this.cradleShuttle.naturalWidth>0) {
      const y=75+Math.sin(progress*Math.PI)*12;
      this.ctx.drawImage(this.cradleShuttle,112,y,96,80);
    }
    this.ctx.fillStyle="#07101ddd";
    this.ctx.fillRect(81,12,158,20);
    this.ctx.fillStyle="#79e2ce"; this.ctx.font="8px monospace"; this.ctx.textAlign="center";
    this.ctx.fillText("SKYGLASS FLIGHT",160,25);
    this.ctx.fillStyle=`rgba(5,9,20,${Math.max(0,1-progress*8,(progress-.88)*8)})`;
    this.ctx.fillRect(0,0,VIEW_WIDTH,VIEW_HEIGHT);
    this.ctx.restore();
    this.drawScanlines();
  }

  private drawEntity(entity: MapEntity): void {
    const x = Math.round(entity.x);
    const y = Math.round(entity.y);
    if (entity.spriteId === "crown-judicator" && this.crownJudicator.complete && this.crownJudicator.naturalWidth > 0) {
      this.ctx.drawImage(this.crownJudicator, 0, 0, 128, 128, x - 20, y - 36, 56, 56);
      return;
    }
    if (entity.spriteId === "cipher-drone" && this.surveyDrone.complete && this.surveyDrone.naturalWidth > 0) {
      this.ctx.drawImage(this.surveyDrone, 0, 0, 128, 128, x - 10, y - 15, 36, 36);
      return;
    }
    if (entity.spriteId === "tempest-regent" && this.tempestRegent.complete && this.tempestRegent.naturalWidth > 0) {
      this.ctx.drawImage(this.tempestRegent, 0, 0, 128, 128, x - 20, y - 36, 56, 56);
      return;
    }
    if (entity.spriteId === "cradle-shuttle" && this.cradleShuttle.complete && this.cradleShuttle.naturalWidth > 0) {
      this.ctx.drawImage(this.cradleShuttle,0,0,192,160,x-40,y-64,96,80);
      return;
    }
    if (entity.spriteId === "archive-custodian" && this.archiveCustodian.complete && this.archiveCustodian.naturalWidth > 0) {
      this.ctx.drawImage(this.archiveCustodian, 0, 0, 128, 128, x - 16, y - 30, 48, 48);
      return;
    }
    if (entity.spriteId === "vault-guardian") {
      this.drawVaultGuardian(x, y, entity.direction, entity.frame);
      return;
    }
    if (entity.spriteId === "ferry-boat") {
      this.drawFerryBoat(x, y);
      return;
    }
    if (entity.spriteId === "sera-venn" && this.seraSprites.complete && this.seraSprites.naturalWidth > 0) {
      const column = { down: 0, up: 1, left: 2, right: 3 }[entity.direction];
      this.ctx.fillStyle = "#0007";
      this.ctx.fillRect(x + 2, y + 13, 11, 3);
      this.ctx.drawImage(this.seraSprites, column * 48, 0, 48, 64, x - 4, y - 16, 24, 32);
      return;
    }
    const npcRow = ({
      "hollow-host": 0,
      "glass-smith": 1,
      "wind-child": 2,
      "mayor-daughter": 3,
      "archive-adept": 4,
      "bridge-scout": 5,
      "surveyor-leth": 6,
    } as Record<string, number>)[entity.spriteId];
    const regionalNpcRow = ({
      "lumen-botanist": 0,
      "aster-courier": 1,
      "vesper-boatman": 2,
      "vesper-engineer": 3,
    } as Record<string, number>)[entity.spriteId];
    const bob = entity.movement === "patrol" && entity.frame === 1 ? 1 : 0;
    if (regionalNpcRow !== undefined && this.regionalNpcSprites.complete && this.regionalNpcSprites.naturalWidth > 0) {
      const column = { down: 0, up: 1, left: 2, right: 3 }[entity.direction];
      this.ctx.fillStyle = "#0007";
      this.ctx.fillRect(x + 2, y + 13, 11, 3);
      this.ctx.drawImage(
        this.regionalNpcSprites,
        column * 48,
        regionalNpcRow * 64,
        48,
        64,
        x - 4,
        y - 16 + bob,
        24,
        32,
      );
      return;
    }
    if (npcRow !== undefined && this.villageNpcSprites.complete && this.villageNpcSprites.naturalWidth > 0) {
      // The normalized sheet guarantees front, back, left, right.
      const column = { down: 0, up: 1, left: 2, right: 3 }[entity.direction];
      this.ctx.fillStyle = "#0007";
      this.ctx.fillRect(x + 2, y + 13, 11, 3);
      this.ctx.drawImage(
        this.villageNpcSprites,
        column * 48,
        npcRow * 64,
        48,
        64,
        x - 4,
        y - 16 + bob,
        24,
        32,
      );
      return;
    }
    const palette = entity.spriteId === "hollow-host"
      ? { hair: "#d0b16d", skin: "#b97d68", suit: "#594869", accent: "#e9cf6a" }
      : entity.spriteId === "glass-smith"
        ? { hair: "#7c8c9c", skin: "#9d7165", suit: "#3f5660", accent: "#78e0c2" }
        : entity.spriteId === "wind-child" || entity.spriteId === "mayor-daughter"
          ? { hair: "#68b8a6", skin: "#c58b73", suit: "#4b4166", accent: "#d9b5ef" }
          : entity.spriteId === "archive-adept"
            ? { hair: "#7d4fa4", skin: "#c98b74", suit: "#35445f", accent: "#64d6c4" }
            : entity.spriteId === "bridge-scout"
              ? { hair: "#252b3e", skin: "#b9826e", suit: "#6d523d", accent: "#e2c55f" }
          : { hair: "#161629", skin: "#b67887", suit: "#23354e", accent: "#d9b5ef" };
    this.ctx.fillStyle = "#0007";
    this.ctx.fillRect(x + 2, y + 13, 11, 3);
    this.ctx.fillStyle = palette.hair;
    this.ctx.fillRect(x + 4, y + 1 + bob, 8, 5);
    if (entity.direction === "down") {
      this.ctx.fillStyle = palette.skin;
      this.ctx.fillRect(x + 5, y + 2 + bob, 6, 4);
    } else if (entity.direction === "left") {
      this.ctx.fillStyle = palette.skin;
      this.ctx.fillRect(x + 4, y + 3 + bob, 3, 3);
    } else if (entity.direction === "right") {
      this.ctx.fillStyle = palette.skin;
      this.ctx.fillRect(x + 9, y + 3 + bob, 3, 3);
    } else {
      this.ctx.fillStyle = palette.hair;
      this.ctx.fillRect(x + 5, y + 4 + bob, 6, 3);
    }
    this.ctx.fillStyle = palette.suit;
    this.ctx.fillRect(x + 3, y + 6 + bob, 10, 7);
    this.ctx.fillStyle = palette.accent;
    if (entity.direction === "up") this.ctx.fillRect(x + 7, y + 7 + bob, 2, 5);
    else {
      this.ctx.fillRect(x + 3, y + 8 + bob, 2, 4);
      this.ctx.fillRect(x + 11, y + 8 + bob, 2, 4);
    }
    this.ctx.fillStyle = palette.accent;
    if (entity.direction !== "up") this.ctx.fillRect(x + 7, y + 7 + bob, 2, 5);
    const legOffset = entity.frame === 0 ? -1 : entity.frame === 2 ? 1 : 0;
    this.ctx.fillStyle = "#141b2b";
    this.ctx.fillRect(x + 4 + legOffset, y + 12, 3, 4);
    this.ctx.fillRect(x + 9 - legOffset, y + 12, 3, 4);
  }

  private drawCache(interaction: Interaction, opened: boolean): void {
    const x = Math.round(interaction.x);
    const y = Math.round(interaction.y);
    this.ctx.fillStyle = "#0008";
    this.ctx.fillRect(x + 1, y + 13, 15, 3);
    this.ctx.fillStyle = "#171c2c";
    this.ctx.fillRect(x + 1, y + (opened ? 6 : 4), 14, 10);
    this.ctx.fillStyle = opened ? "#3c4659" : "#65507b";
    this.ctx.fillRect(x + 2, y + (opened ? 7 : 5), 12, opened ? 3 : 8);
    if (opened) {
      this.ctx.fillStyle = "#242c3d";
      this.ctx.fillRect(x + 3, y + 2, 11, 5);
      this.ctx.fillStyle = "#758399";
      this.ctx.fillRect(x + 4, y + 2, 9, 1);
    } else {
      this.ctx.fillStyle = "#d9b5ef";
      this.ctx.fillRect(x + 7, y + 7, 2, 3);
      this.ctx.fillStyle = "#8da0b7";
      this.ctx.fillRect(x + 2, y + 4, 12, 1);
    }
  }

  private drawControlConsole(interaction: Interaction, restored: boolean): void {
    const x = Math.round(interaction.x) - 16;
    const y = Math.round(interaction.y) - 48;
    if (this.controlArrayConsole.complete && this.controlArrayConsole.naturalWidth > 0) {
      this.ctx.drawImage(this.controlArrayConsole, x, y, 48, 64);
    } else {
      this.ctx.fillStyle = "#0b1524";
      this.ctx.fillRect(x + 8, y + 12, 32, 48);
      this.ctx.fillStyle = "#253b53";
      this.ctx.fillRect(x + 10, y + 14, 28, 42);
      this.ctx.fillStyle = restored ? "#78e0c2" : "#d9b5ef";
      this.ctx.fillRect(x + 15, y + 21, 18, 12);
    }

    // The array's status is intentionally the only runtime accent over the
    // shared sprite: violet is dormant, amber means the southern link is live.
    this.ctx.fillStyle = restored ? "#e9cf6a" : "#a981cf";
    this.ctx.fillRect(x + 23, y + 55, 2, 2);
  }

  private drawServiceSign(interaction: Interaction): void {
    const x = Math.round(interaction.x) + 1;
    const yOffset = interaction.kind === "teleport" || interaction.kind === "save-shop" ? 40 : 31;
    const y = Math.round(interaction.y) - yOffset;
    this.ctx.fillStyle = "#596b82";
    this.ctx.fillRect(x + 7, y + 13, 2, 6);
    this.ctx.fillStyle = "#09101c";
    this.ctx.fillRect(x + 1, y, 14, 14);
    this.ctx.strokeStyle = "#8da0b7";
    this.ctx.strokeRect(x + 1.5, y + 0.5, 13, 13);
    this.ctx.fillStyle = "#1c2b3c";
    this.ctx.fillRect(x + 3, y + 2, 10, 10);
    this.ctx.fillStyle = "#e9cf6a";
    if (interaction.kind === "weapon-shop") {
      for (let offset = 0; offset < 8; offset += 1) this.ctx.fillRect(x + 5 + offset, y + 10 - offset, 1, 1);
      this.ctx.fillRect(x + 4, y + 10, 4, 1);
      this.ctx.fillRect(x + 10, y + 3, 3, 2);
    } else if (interaction.kind === "armor-shop") {
      this.ctx.fillRect(x + 5, y + 4, 7, 2);
      this.ctx.fillRect(x + 4, y + 6, 9, 3);
      this.ctx.fillRect(x + 6, y + 9, 5, 2);
      this.ctx.fillRect(x + 8, y + 11, 1, 1);
    } else if (interaction.kind === "item-shop") {
      this.ctx.fillRect(x + 7, y + 3, 4, 2);
      this.ctx.fillRect(x + 6, y + 5, 6, 6);
      this.ctx.fillStyle = "#78e0c2";
      this.ctx.fillRect(x + 7, y + 8, 4, 2);
    } else if (interaction.kind === "revival-shop") {
      this.ctx.fillStyle = "#78e0c2";
      this.ctx.fillRect(x + 7, y + 3, 3, 9);
      this.ctx.fillRect(x + 4, y + 6, 9, 3);
      this.ctx.fillStyle = "#d9b5ef";
      this.ctx.fillRect(x + 8, y + 4, 1, 7);
    } else if (interaction.kind === "save-shop") {
      this.ctx.fillStyle = "#d9b5ef";
      this.ctx.fillRect(x + 5, y + 3, 7, 8);
      this.ctx.fillStyle = "#78e0c2";
      this.ctx.fillRect(x + 7, y + 4, 3, 3);
      this.ctx.fillRect(x + 6, y + 9, 5, 1);
    } else if (interaction.kind === "teleport") {
      this.ctx.strokeStyle = "#78e0c2";
      this.ctx.strokeRect(x + 5.5, y + 3.5, 6, 8);
      this.ctx.strokeStyle = "#d9b5ef";
      this.ctx.strokeRect(x + 7.5, y + 5.5, 2, 4);
    } else if (interaction.kind === "party-house") {
      this.ctx.fillStyle = "#d9b5ef";
      this.ctx.fillRect(x + 4, y + 4, 4, 4);
      this.ctx.fillRect(x + 9, y + 5, 3, 3);
      this.ctx.fillStyle = "#78e0c2";
      this.ctx.fillRect(x + 3, y + 9, 6, 3);
      this.ctx.fillRect(x + 9, y + 9, 4, 3);
    } else {
      this.ctx.fillStyle = "#d9b5ef";
      this.ctx.fillRect(x + 5, y + 5, 7, 5);
      this.ctx.fillStyle = "#e9cf6a";
      this.ctx.fillRect(x + 7, y + 3, 3, 3);
    }
  }

  private isTownService(interaction: Interaction): boolean {
    // Control consoles are world interactions, not storefront services.  They
    // used to fall through to the generic shop-sign renderer on tower summits.
    return [
      "inn", "weapon-shop", "armor-shop", "item-shop", "save-shop",
      "teleport", "party-house", "revival-shop",
    ].includes(interaction.kind);
  }

  private hasIntegratedServiceSign(mapId: string, interactionName: string): boolean {
    return (mapId === "lumen-hollow" && LUMEN_INTEGRATED_SIGNS.has(interactionName))
      || mapId === "aster-reach"
      || mapId === "vesper-crossing";
  }

  private drawBridgeBarrier(interaction: Interaction): void {
    const x = Math.round(interaction.x);
    const y = Math.round(interaction.y);
    if (interaction.height > interaction.width) {
      this.ctx.fillStyle = "#182332";
      this.ctx.fillRect(x + 2, y, 12, 4);
      this.ctx.fillRect(x + 2, y + interaction.height - 4, 12, 4);
      this.ctx.fillStyle = "#d9b5ef";
      this.ctx.fillRect(x + 7, y + 4, 2, interaction.height - 8);
      this.ctx.fillStyle = "#78e0c2";
      for (let beamY = y + 6; beamY < y + interaction.height - 5; beamY += 7) this.ctx.fillRect(x + 5, beamY, 6, 2);
      return;
    }
    this.ctx.fillStyle = "#182332";
    this.ctx.fillRect(x, y + 2, 4, 14);
    this.ctx.fillRect(x + interaction.width - 4, y + 2, 4, 14);
    this.ctx.fillStyle = "#d9b5ef";
    this.ctx.fillRect(x + 4, y + 7, interaction.width - 8, 2);
    this.ctx.fillStyle = "#78e0c2";
    for (let beamX = x + 6; beamX < x + interaction.width - 5; beamX += 7) {
      this.ctx.fillRect(beamX, y + 5, 2, 6);
    }
  }

  private drawVaultGuardian(x: number, y: number, direction: Direction, frame: number): void {
    if (this.vaultGuardianSprites.complete && this.vaultGuardianSprites.naturalWidth > 0) {
      const column = { down: 0, up: 1, left: 2, right: 3 }[direction];
      this.ctx.fillStyle = "#0008";
      this.ctx.fillRect(x - 3, y + 13, 22, 3);
      this.ctx.drawImage(this.vaultGuardianSprites, column * 64, 0, 64, 72, x - 8, y - 20, 32, 36);
      return;
    }
    const bob = frame === 1 ? 1 : 0;
    this.ctx.fillStyle = "#0008";
    this.ctx.fillRect(x + 1, y + 13, 14, 3);
    this.ctx.fillStyle = "#24182f";
    this.ctx.fillRect(x + 3, y + 2 + bob, 10, 12);
    this.ctx.fillStyle = "#77518e";
    this.ctx.fillRect(x + 5, y + 1 + bob, 6, 13);
    this.ctx.fillStyle = "#55dbc7";
    this.ctx.fillRect(x + 6, y + 4 + bob, 4, 3);
    this.ctx.fillRect(x + 2, y + 7 + bob, 3, 5);
    this.ctx.fillRect(x + 11, y + 7 + bob, 3, 5);
    this.ctx.fillStyle = "#e9cf6a";
    this.ctx.fillRect(x + 7, y + 2 + bob, 2, 2);
  }

  private drawEscortFollower(rawX: number, rawY: number, direction: Direction, frame: number): void {
    const x = Math.round(rawX);
    const y = Math.round(rawY);
    const bob = frame === 1 ? 1 : 0;
    if (this.villageNpcSprites.complete && this.villageNpcSprites.naturalWidth > 0) {
      const column = { down: 0, up: 1, left: 2, right: 3 }[direction];
      this.ctx.fillStyle = "#0007";
      this.ctx.fillRect(x + 2, y + 13, 11, 3);
      this.ctx.drawImage(
        this.villageNpcSprites,
        column * 48,
        3 * 64,
        48,
        64,
        x - 4,
        y - 16 + bob,
        24,
        32,
      );
      return;
    }
    this.ctx.fillStyle = "#0007";
    this.ctx.fillRect(x + 2, y + 13, 11, 3);
    this.ctx.fillStyle = "#68b8a6";
    this.ctx.fillRect(x + 4, y + 1 + bob, 8, 5);
    this.ctx.fillStyle = "#c58b73";
    this.ctx.fillRect(x + 5, y + 3 + bob, 6, 3);
    this.ctx.fillStyle = "#4b4166";
    this.ctx.fillRect(x + 3, y + 6 + bob, 10, 7);
    this.ctx.fillStyle = "#d9b5ef";
    this.ctx.fillRect(x + 7, y + 7 + bob, 2, 5);
    this.ctx.fillStyle = "#141b2b";
    this.ctx.fillRect(x + 4, y + 12, 3, 4);
    this.ctx.fillRect(x + 9, y + 12, 3, 4);
  }

  private drawFerryBoat(x: number, y: number): void {
    this.ctx.fillStyle = "#0008";
    this.ctx.fillRect(x - 5, y + 11, 28, 4);
    this.ctx.fillStyle = "#2b3441";
    this.ctx.fillRect(x - 4, y + 2, 26, 10);
    this.ctx.fillStyle = "#8a6845";
    this.ctx.fillRect(x - 1, y + 4, 20, 6);
    this.ctx.fillStyle = "#d0a15f";
    this.ctx.fillRect(x + 2, y + 5, 14, 3);
    this.ctx.fillStyle = "#78e0c2";
    this.ctx.fillRect(x + 8, y - 7, 3, 12);
    this.ctx.fillStyle = "#58667a";
    this.ctx.fillRect(x + 4, y - 5, 11, 2);
  }

  private drawLayer(
    layer: TiledTileLayer,
    mapWidth: number,
    mapHeight: number,
    camera: CameraPosition,
    mapId: string,
  ): void {
    const firstColumn = Math.max(0, Math.floor(camera.x / TILE));
    const lastColumn = Math.min(mapWidth, Math.ceil((camera.x + VIEW_WIDTH) / TILE) + 1);
    const firstRow = Math.max(0, Math.floor(camera.y / TILE));
    const lastRow = Math.min(mapHeight, Math.ceil((camera.y + VIEW_HEIGHT) / TILE) + 1);
    for (let tileY = firstRow; tileY < lastRow; tileY += 1) {
      for (let tileX = firstColumn; tileX < lastColumn; tileX += 1) {
        const gid = layer.data[tileY * mapWidth + tileX] ?? 0;
        if (gid === 0) continue;
        const x = tileX * TILE;
        const y = tileY * TILE;
        const lumenTile = mapId === "lumen-hollow"
          ? ({ 14: 0, 15: 1, 9: 6, 12: 7 } as Record<number, number>)[gid]
          : undefined;
        const worldTile = mapId === "glass-steppe" || mapId === "southern-landing" || mapId === "meridian-basin" || mapId === "windscar-cliffs" || mapId === "skyglass-relay" || mapId === "stormbreak-ridge" || mapId === "crown-causeway"
          ? ({ 16: 0, 1: 1, 17: 1, 2: 2, 18: 4, 19: 5, 21: 6, 12: 7 } as Record<number, number>)[gid]
          : undefined;
        const regionalTile = mapId === "aster-reach"
          ? ({ 14: 1, 15: 2 } as Record<number, number>)[gid]
          : mapId === "vesper-crossing"
            ? ({ 14: 3, 15: 2 } as Record<number, number>)[gid]
            : mapId === "tideglass-harbor" || mapId === "cairn-meridian" || mapId === "skyglass-relay"
              ? ({ 14: 1, 15: 2 } as Record<number, number>)[gid]
            : undefined;
        const echoTile = mapId === "echo-vault" || mapId === "undertide-passage" || mapId === "meridian-array" || mapId.includes("control-") || mapId.startsWith("cradle-") || mapId.startsWith("weather-") || mapId === "crown-archives" || mapId === "crown-sanctum"
          ? ({ 6: 0, 13: 1, 12: 2, 10: 3, 5: 4, 8: 5, 4: 6, 7: 7 } as Record<number, number>)[gid]
          : undefined;
        if (lumenTile !== undefined && this.lumenHdTiles.complete && this.lumenHdTiles.naturalWidth > 0) {
          this.ctx.drawImage(this.lumenHdTiles, lumenTile * 32, 0, 32, 32, x, y, TILE, TILE);
        } else if (worldTile !== undefined && this.worldHdTiles.complete && this.worldHdTiles.naturalWidth > 0) {
          this.ctx.drawImage(this.worldHdTiles, worldTile * 64, 0, 64, 64, x, y, TILE, TILE);
        } else if (regionalTile !== undefined && this.worldHdTiles.complete && this.worldHdTiles.naturalWidth > 0) {
          this.ctx.drawImage(this.worldHdTiles, regionalTile * 64, 0, 64, 64, x, y, TILE, TILE);
        } else if (echoTile !== undefined && this.echoVaultHdTiles.complete && this.echoVaultHdTiles.naturalWidth > 0) {
          this.ctx.drawImage(this.echoVaultHdTiles, echoTile * 64, 0, 64, 64, x, y, TILE, TILE);
        } else {
          this.ctx.drawImage(this.tileset, gid * TILE, 0, TILE, TILE, x, y, TILE, TILE);
        }
        if ((mapId === "glass-steppe" || mapId === "southern-landing" || mapId === "meridian-basin" || mapId === "windscar-cliffs") && layer.name === "terrain" && gid !== 0) {
          this.drawWorldShoreline(layer, mapWidth, mapHeight, tileX, tileY, x, y);
        }
      }
    }
  }

  private drawWorldShoreline(
    terrain: TiledTileLayer,
    mapWidth: number,
    mapHeight: number,
    tileX: number,
    tileY: number,
    x: number,
    y: number,
  ): void {
    const isWater = (checkX: number, checkY: number): boolean => (
      checkX < 0
      || checkY < 0
      || checkX >= mapWidth
      || checkY >= mapHeight
      || (terrain.data[checkY * mapWidth + checkX] ?? 0) === 0
    );
    const north = isWater(tileX, tileY - 1);
    const south = isWater(tileX, tileY + 1);
    const west = isWater(tileX - 1, tileY);
    const east = isWater(tileX + 1, tileY);
    if (!north && !south && !west && !east) return;

    // A dark vegetated bank and sparse teal foam blend the two textures
    // without outlining the island with a continuous artificial stripe.
    this.ctx.fillStyle = "#294b43";
    if (north) this.ctx.fillRect(x, y, TILE, 1);
    if (south) this.ctx.fillRect(x, y + TILE - 1, TILE, 1);
    if (west) this.ctx.fillRect(x, y, 1, TILE);
    if (east) this.ctx.fillRect(x + TILE - 1, y, 1, TILE);
    this.ctx.fillStyle = "#79b8a8";
    if (north) for (let px = 2 + ((tileX + tileY) % 4); px < TILE - 1; px += 6) this.ctx.fillRect(x + px, y, 2, 1);
    if (south) for (let px = 1 + ((tileX * 2 + tileY) % 4); px < TILE - 1; px += 6) this.ctx.fillRect(x + px, y + TILE - 1, 2, 1);
    if (west) for (let py = 2 + ((tileX + tileY * 2) % 4); py < TILE - 1; py += 6) this.ctx.fillRect(x, y + py, 1, 2);
    if (east) for (let py = 1 + ((tileX * 3 + tileY) % 4); py < TILE - 1; py += 6) this.ctx.fillRect(x + TILE - 1, y + py, 1, 2);
  }

  private drawPlayer(player: PlayerState): void {
    const x = Math.round(player.x);
    const y = Math.round(player.y);
    this.ctx.fillStyle = "#0007";
    this.ctx.fillRect(x + 2, y + 13, 10, 3);
    if (this.ashSprites.complete && this.ashSprites.naturalWidth > 0) {
      const row = { down: 0, left: 1, right: 2, up: 3 }[player.direction];
      const frame = Math.max(0, Math.min(2, player.frame));
      this.ctx.drawImage(this.ashSprites, frame * 48, row * 64, 48, 64, x - 4, y - 16, 24, 32);
      return;
    }
    const bob = player.frame === 1 ? 1 : 0;
    const palette = { outline: "#111525", suit: "#d9e0e8", shade: "#8493ab", accent: "#e2c55f", skin: "#c78b74" };
    this.ctx.fillStyle = palette.outline;
    this.ctx.fillRect(x + 4, y + bob, 7, 5);
    this.ctx.fillStyle = palette.skin;
    this.ctx.fillRect(x + 5, y + 2 + bob, 5, 4);
    this.ctx.fillStyle = palette.suit;
    this.ctx.fillRect(x + 3, y + 6 + bob, 9, 6);
    this.ctx.fillStyle = palette.shade;
    this.ctx.fillRect(x + 3, y + 10 + bob, 9, 2);
    this.ctx.fillStyle = palette.accent;
    this.ctx.fillRect(x + 7, y + 7 + bob, 1, 3);

    const legOffset = player.frame === 0 ? -1 : player.frame === 2 ? 1 : 0;
    this.ctx.fillStyle = palette.outline;
    this.ctx.fillRect(x + 4 + legOffset, y + 12, 3, 4);
    this.ctx.fillRect(x + 9 - legOffset, y + 12, 3, 4);
    this.drawDirectionMarker(player.direction, x, y + bob);
  }

  private drawDirectionMarker(direction: Direction, x: number, y: number): void {
    this.ctx.fillStyle = "#78e0c2";
    if (direction === "up") this.ctx.fillRect(x + 7, y, 1, 2);
    if (direction === "down") this.ctx.fillRect(x + 7, y + 4, 1, 1);
    if (direction === "left") this.ctx.fillRect(x + 4, y + 3, 1, 1);
    if (direction === "right") this.ctx.fillRect(x + 10, y + 3, 1, 1);
  }

  private drawHud(name: string): void {
    const label = name.toUpperCase();
    this.ctx.font = "8px monospace";
    const width = Math.min(VIEW_WIDTH - 10, Math.ceil(this.ctx.measureText(label).width) + 14);
    this.ctx.fillStyle = "rgba(5, 9, 20, .88)";
    this.ctx.fillRect(5, 5, width, 18);
    this.ctx.strokeStyle = "#7890a9";
    this.ctx.strokeRect(5.5, 5.5, width - 1, 17);
    this.ctx.fillStyle = "#78e0c2";
    this.ctx.fillText(label, 12, 17);
  }

  private drawInteractionPrompt(): void {
    this.ctx.fillStyle = "rgba(5, 9, 20, .94)";
    this.ctx.fillRect(116, 213, 88, 17);
    this.ctx.strokeStyle = "#7890a9";
    this.ctx.strokeRect(116.5, 213.5, 87, 16);
    this.ctx.fillStyle = "#e9cf6a";
    this.ctx.font = "9px monospace";
    this.ctx.fillText("[ A ] ACT", 137, 225);
  }

  private drawScanlines(): void {
    this.ctx.fillStyle = "rgba(4, 8, 18, .06)";
    for (let y = 0; y < VIEW_HEIGHT; y += 2) this.ctx.fillRect(0, y, VIEW_WIDTH, 1);
  }
}
