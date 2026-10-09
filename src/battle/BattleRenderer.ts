import type { EnemyId, EquipmentId, PartyMemberId, PartyMemberProgress } from "../types/game";
import { isCarbineEquipment } from "../progression/equipmentData";
import { SPELLS } from "../progression/spellData";
import type { EnemyBattleTheme } from "./battleData";
import type { BattleView } from "./BattleSystem";

const WIDTH = 320;
const HEIGHT = 240;
const HORIZON = 61;
const FIELD_BOTTOM = 156;
const PARTY_FRAME_WIDTH = 96;
const PARTY_FRAME_HEIGHT = 112;
const ENEMY_FRAME_SIZE = 128;

/**
 * Public assets live next to the application entry point.  Using the current
 * document URL rather than a root-relative path keeps the sprites working on
 * both localhost and a project-scoped GitHub Pages URL.
 */
const graphicAsset = (fileName: string): string => new URL(`assets/graphics/${fileName}`, document.baseURI).toString();

const PARTY_SPRITE_ROWS: Record<PartyMemberId, number> = {
  ash: 0,
  ione: 1,
  nox: 2,
  sera: 3,
};

const ENEMY_SPRITE_INDEX = {
  "prism-mite": 0,
  "glint-hopper": 1,
  "dust-sentinel": 2,
  "vault-stalker": 3,
  "phase-warden": 4,
  "rift-hunter": 5,
  "storm-colossus": 6,
} as const;

const TOWER_ENEMY_SPRITE_INDEX = {
  "relay-wasp": 0,
  "circuit-hound": 1,
  "coil-knight": 2,
  "signal-wraith": 3,
} as const;

const SPECIAL_TOWER_ENEMY_SPRITES = new Set<EnemyId>(["aegis-specter", "cipher-drone", "archive-custodian", "gale-drone", "nimbus-shell", "tempest-regent", "crown-seeker", "oath-sentinel", "crown-judicator"]);

const SOUTHWAKE_ENEMY_SPRITE_INDEX = {
  "saltwire-crab": 0,
  "reef-drone": 1,
  "tidal-stalker": 2,
  "abyss-sentinel": 3,
} as const;

const UNDERTIDE_ENEMY_SPRITE_INDEX = {
  "burrow-maw": 0,
  "cave-skitter": 1,
  "blind-drake": 2,
  "rogue-borer": 3,
} as const;

const ENEMY_SPRITE_CROPS: Partial<Record<EnemyId, { sourceHeight: number; destinationY: number }>> = {
  // Two disconnected remnants sit at y=120..127 in this atlas frame. The
  // hound itself ends at y=108, so crop the debris and lower the intact body
  // onto the separately rendered battle shadow.
  "circuit-hound": { sourceHeight: 112, destinationY: 34 },
};

const CARBINE_PALETTES: Partial<Record<EquipmentId, { body: string; shade: string; coil: string; shot: string }>> = {
  "arc-carbine": { body: "#8094a3", shade: "#263743", coil: "#59d9e6", shot: "#8df5ff" },
  "relay-carbine": { body: "#b18a50", shade: "#443522", coil: "#58e1be", shot: "#8ff8d4" },
  "storm-carbine": { body: "#8e9eae", shade: "#293247", coil: "#e7cf58", shot: "#fff09a" },
  "harbor-carbine": { body: "#b7c9cf", shade: "#284c59", coil: "#59c9ee", shot: "#a8efff" },
  "cipher-carbine": { body: "#e7d9b6", shade: "#263e51", coil: "#69e4ce", shot: "#d4fff1" },
  "ion-carbine": { body: "#b3d9e4", shade: "#253a57", coil: "#9be8ff", shot: "#e0faff" },
};

interface MemberPosition {
  x: number;
  y: number;
}

interface EnemyPosition extends MemberPosition {
  scale: number;
}

export class BattleRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly partySprites = new Image();
  private readonly noxCarbineFiringSprite = new Image();
  private readonly enemySprites = new Image();
  private readonly towerEnemySprites = new Image();
  private readonly aegisSpecterSprite = new Image();
  private readonly cipherDroneSprite = new Image();
  private readonly archiveCustodianSprite = new Image();
  private readonly tempestRegentSprite = new Image();
  private readonly crownJudicatorSprite = new Image();
  private readonly southwakeEnemySprites = new Image();
  private readonly undertideEnemySprites = new Image();

  constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is unavailable.");
    this.ctx = context;
    this.ctx.imageSmoothingEnabled = false;
    this.partySprites.src = graphicAsset("battle-party-hd-v1.png");
    this.noxCarbineFiringSprite.src = graphicAsset("battle-nox-carbine-fire-hd-v1.png");
    this.enemySprites.src = graphicAsset("battle-enemies-hd-v1.png");
    this.towerEnemySprites.src = graphicAsset("tower-enemies-hd-v1.png");
    this.aegisSpecterSprite.src = graphicAsset("aegis-specter-hd-v1.png");
    this.cipherDroneSprite.src = graphicAsset("cipher-drone-hd-v1.png");
    this.archiveCustodianSprite.src = graphicAsset("archive-custodian-hd-v1.png");
    this.tempestRegentSprite.src = graphicAsset("tempest-regent-hd-v1.png");
    this.crownJudicatorSprite.src = graphicAsset("crown-judicator-hd-v1.png");
    this.southwakeEnemySprites.src = graphicAsset("southwake-enemies-hd-v1.png");
    this.undertideEnemySprites.src = graphicAsset("undertide-enemies-hd-v1.png");
  }

  public render(view: BattleView): void {
    this.drawBackground(view.enemies[0]?.definition.battleTheme ?? "violet-grid");
    this.drawEnemies(view);
    this.drawParty(view);
    if (view.effect === "arc-bolt" || view.effect === "flare-lance") this.drawArcBolt(view);
    if (view.effect === "static-field") this.drawStaticField(view);
    if (view.effect === "mend") this.drawMend(view);
    if (view.effect === "barrier") this.drawBarrier(view);
    if (view.effect === "weaken" || view.effect === "shock") this.drawDisruption(view);
    if (view.effect === "burn" || view.effect === "storm") this.drawEnemyPower(view);
    if (view.animation === "victory") this.drawVictorySignal(view);
    this.drawPopups(view);
    if (view.results) this.drawResults(view);
    else if (view.animation !== "victory") this.drawEnemyPanels(view);
    this.drawInterface(view);
    this.drawScanlines();
  }

  private drawBackground(theme: EnemyBattleTheme): void {
    const palette = theme === "verdant-grid"
      ? { sky: "#06141a", middle: "#0d2829", floor: "#07191d", horizon: "#1d5c58", bright: "#35a996", dim: "#1f685e", stars: "#8ce7c9" }
      : theme === "amber-grid"
        ? { sky: "#17100e", middle: "#32201b", floor: "#160e13", horizon: "#75482f", bright: "#b47343", dim: "#704329", stars: "#e2c174" }
        : { sky: "#050818", middle: "#10102a", floor: "#07091a", horizon: "#151541", bright: "#4149b4", dim: "#262d79", stars: "#75e0d2" };
    const gradient = this.ctx.createLinearGradient(0, 0, 0, FIELD_BOTTOM);
    gradient.addColorStop(0, palette.sky);
    gradient.addColorStop(0.62, palette.middle);
    gradient.addColorStop(1, palette.floor);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, WIDTH, FIELD_BOTTOM);

    this.ctx.fillStyle = palette.horizon;
    this.ctx.fillRect(0, HORIZON - 2, WIDTH, 2);
    this.ctx.lineWidth = 1;
    for (let x = -160; x <= 480; x += 32) {
      this.ctx.strokeStyle = palette.bright;
      this.ctx.beginPath();
      this.ctx.moveTo(160, HORIZON);
      this.ctx.lineTo(x, FIELD_BOTTOM);
      this.ctx.stroke();
    }
    for (let index = 0; index < 10; index += 1) {
      const t = index / 9;
      const y = HORIZON + Math.round(t * t * (FIELD_BOTTOM - HORIZON));
      this.ctx.strokeStyle = index % 2 === 0 ? palette.bright : palette.dim;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y + 0.5);
      this.ctx.lineTo(WIDTH, y + 0.5);
      this.ctx.stroke();
    }
    this.ctx.fillStyle = palette.stars;
    for (let x = 12; x < WIDTH; x += 37) this.ctx.fillRect(x, HORIZON - 8 - (x % 3), 1, 1);
  }

  private drawEnemies(view: BattleView): void {
    const positions = this.enemyPositions(view.enemies.length);
    view.enemies.forEach((enemy, index) => {
      const disappearing = enemy.hp <= 0 && view.defeatedEnemyIds.includes(enemy.combatId);
      if (enemy.hp <= 0 && !disappearing) return;
      const position = positions[index] ?? positions[0] ?? { x: 220, y: 92, scale: 1 };
      const arrivalScale = view.animation === "enemy-arrive" ? Math.max(0.08, view.animationProgress) : 1;
      const isAnimatedEnemy = enemy.combatId === view.animationEnemyId;
      const flash = isAnimatedEnemy
        && view.animation === "enemy-hit"
        && Math.floor(view.animationProgress * 8) % 2 === 0;
      const lunge = isAnimatedEnemy && view.animation === "enemy-strike"
        ? Math.round(Math.sin(view.animationProgress * Math.PI) * 22)
        : 0;
      const recoil = isAnimatedEnemy && view.animation === "enemy-hit"
        ? Math.round(Math.sin(view.animationProgress * Math.PI) * 6)
        : 0;
      const idleOffset = view.acceptingCommand
        ? Math.round(Math.sin(performance.now() / 520 + index * 1.8) * 0.7)
        : 0;
      const strikePulse = isAnimatedEnemy && (view.animation === "enemy-strike" || view.animation === "enemy-cast")
        ? Math.sin(view.animationProgress * Math.PI)
        : 0;
      const defeatScale = disappearing ? Math.max(0.35, 1 - view.animationProgress * 0.65) : 1;
      this.ctx.save();
      this.ctx.globalAlpha = disappearing ? Math.max(0, 1 - view.animationProgress) : 1;
      this.ctx.translate(position.x - lunge + recoil, position.y + idleOffset);
      this.ctx.rotate(-strikePulse * 0.035);
      this.ctx.scale(
        position.scale * arrivalScale * defeatScale * (1 + strikePulse * 0.045),
        position.scale * arrivalScale * defeatScale * (1 - strikePulse * 0.035),
      );
      this.ctx.translate(-220, -92);
      if (!this.drawEnemySprite(enemy.definition.id, flash)) {
        if (enemy.definition.id === "glint-hopper") this.drawGlintHopper(flash);
        else if (enemy.definition.id === "dust-sentinel") this.drawDustSentinel(flash);
        else if (enemy.definition.id === "vault-stalker" || enemy.definition.id === "rift-hunter") this.drawVaultStalker(flash);
        else if (enemy.definition.id === "phase-warden" || enemy.definition.id === "storm-colossus") this.drawPhaseWarden(flash);
        else this.drawPrismMite(flash);
      }
      this.ctx.restore();
    });

    if (view.targetingEnemy && view.selectedEnemyId) {
      const target = this.enemyPosition(view, view.selectedEnemyId);
      this.ctx.fillStyle = "#e9cf6a";
      this.ctx.fillRect(target.x - 4, target.y - 42, 9, 2);
      this.ctx.fillRect(target.x - 3, target.y - 40, 7, 2);
      this.ctx.fillRect(target.x - 1, target.y - 38, 3, 2);
    }
  }

  private drawPopups(view: BattleView): void {
    if (view.popups.length === 0) return;
    const rise = Math.round(view.animationProgress * 11);
    const opacity = view.animationProgress < 0.72
      ? 1
      : Math.max(0, 1 - (view.animationProgress - 0.72) / 0.28);
    view.popups.forEach((popup) => {
      let x = 160;
      let y = 96;
      if (popup.targetEnemyId) {
        const position = this.enemyPosition(view, popup.targetEnemyId);
        x = position.x;
        y = position.y - 34;
      } else if (popup.targetMemberId) {
        const memberIndex = Math.max(0, view.party.findIndex((member) => member.id === popup.targetMemberId));
        const position = this.memberPosition(memberIndex, view.party.length);
        x = position.x;
        y = position.y - 24;
      }
      this.ctx.save();
      this.ctx.globalAlpha = opacity;
      this.ctx.textAlign = "center";
      this.ctx.font = "bold 10px monospace";
      this.ctx.lineWidth = 3;
      this.ctx.strokeStyle = "rgba(4, 7, 19, .92)";
      this.ctx.strokeText(popup.text, x, y - rise);
      this.ctx.fillStyle = popup.tone === "heal" ? "#79f0c5" : "#ff9a7b";
      this.ctx.fillText(popup.text, x, y - rise);
      this.ctx.restore();
    });
  }

  private drawEnemySprite(enemyId: EnemyId, flash: boolean): boolean {
    if (SPECIAL_TOWER_ENEMY_SPRITES.has(enemyId)) {
      const sprite = enemyId === "crown-judicator" ? this.crownJudicatorSprite
        : enemyId === "tempest-regent" ? this.tempestRegentSprite
        : enemyId === "cipher-drone" || enemyId === "gale-drone" || enemyId === "crown-seeker" ? this.cipherDroneSprite
        : enemyId === "archive-custodian" ? this.archiveCustodianSprite : this.aegisSpecterSprite;
      if (!sprite.complete || sprite.naturalWidth === 0) return false;
      this.ctx.save();
      this.ctx.fillStyle = "rgba(0, 0, 0, .42)";
      this.ctx.beginPath();
      this.ctx.ellipse(220, 119, 27, 4, 0, 0, Math.PI * 2);
      this.ctx.fill();
      if (flash) this.ctx.filter = "brightness(2.8) saturate(0.15)";
      else if (enemyId === "gale-drone") this.ctx.filter = "hue-rotate(150deg) saturate(0.8)";
      else if (enemyId === "nimbus-shell") this.ctx.filter = "hue-rotate(40deg) saturate(0.65) brightness(1.2)";
      else if (enemyId === "crown-seeker") this.ctx.filter = "sepia(0.65) saturate(0.9)";
      else if (enemyId === "oath-sentinel") this.ctx.filter = "sepia(0.55) saturate(0.7) brightness(1.15)";
      if (enemyId === "aegis-specter" || enemyId === "nimbus-shell" || enemyId === "oath-sentinel") this.ctx.drawImage(sprite, 0, 0, 128, 128, 160, 22, 120, 120);
      else this.ctx.drawImage(sprite, 0, 0, 128, 128, 160, 7, 120, 120);
      this.ctx.restore();
      return true;
    }
    const towerIndex = TOWER_ENEMY_SPRITE_INDEX[enemyId as keyof typeof TOWER_ENEMY_SPRITE_INDEX];
    const southwakeIndex = SOUTHWAKE_ENEMY_SPRITE_INDEX[enemyId as keyof typeof SOUTHWAKE_ENEMY_SPRITE_INDEX];
    const undertideIndex = UNDERTIDE_ENEMY_SPRITE_INDEX[enemyId as keyof typeof UNDERTIDE_ENEMY_SPRITE_INDEX];
    const standardIndex = ENEMY_SPRITE_INDEX[enemyId as keyof typeof ENEMY_SPRITE_INDEX];
    const image = undertideIndex !== undefined
      ? this.undertideEnemySprites
      : southwakeIndex !== undefined
      ? this.southwakeEnemySprites
      : towerIndex !== undefined
        ? this.towerEnemySprites
        : this.enemySprites;
    const index = undertideIndex ?? southwakeIndex ?? towerIndex ?? standardIndex;
    if (index === undefined || !image.complete || image.naturalWidth === 0) return false;
    const columns = towerIndex !== undefined ? 2 : 4;
    const sourceX = (index % columns) * ENEMY_FRAME_SIZE;
    const sourceY = Math.floor(index / columns) * ENEMY_FRAME_SIZE;
    const crop = ENEMY_SPRITE_CROPS[enemyId];
    const sourceHeight = crop?.sourceHeight ?? ENEMY_FRAME_SIZE;
    const destinationY = crop?.destinationY ?? 26;
    const destinationHeight = 100 * sourceHeight / ENEMY_FRAME_SIZE;
    this.ctx.save();
    this.ctx.fillStyle = "rgba(0, 0, 0, .42)";
    this.ctx.beginPath();
    this.ctx.ellipse(220, 119, 27, 4, 0, 0, Math.PI * 2);
    this.ctx.fill();
    if (flash) this.ctx.filter = "brightness(2.8) saturate(0.15)";
    this.ctx.drawImage(
      image,
      sourceX,
      sourceY,
      ENEMY_FRAME_SIZE,
      sourceHeight,
      160,
      destinationY,
      120,
      destinationHeight,
    );
    this.ctx.restore();
    return true;
  }

  private drawPrismMite(flash: boolean): void {
    this.ctx.fillStyle = "#0008";
    this.ctx.fillRect(194, 116, 53, 5);
    this.ctx.fillStyle = flash ? "#f4f5ff" : "#12172d";
    this.ctx.fillRect(202, 73, 36, 40);
    this.ctx.fillStyle = flash ? "#fff" : "#9a5ee0";
    this.ctx.fillRect(207, 67, 26, 9);
    this.ctx.fillRect(198, 79, 8, 21);
    this.ctx.fillRect(234, 79, 8, 21);
    this.ctx.fillStyle = flash ? "#d7faff" : "#48d9c0";
    this.ctx.fillRect(209, 77, 22, 25);
    this.ctx.fillRect(204, 102, 8, 12);
    this.ctx.fillRect(228, 102, 8, 12);
    this.ctx.fillStyle = "#e9cf6a";
    this.ctx.fillRect(213, 84, 4, 4);
    this.ctx.fillRect(224, 84, 4, 4);
    this.ctx.fillStyle = "#233358";
    this.ctx.fillRect(216, 94, 10, 4);
    this.ctx.fillStyle = "#d5b5ff";
    this.ctx.fillRect(211, 63, 4, 6);
    this.ctx.fillRect(225, 63, 4, 6);
  }

  private drawGlintHopper(flash: boolean): void {
    this.ctx.fillStyle = "#0008";
    this.ctx.fillRect(191, 117, 58, 4);
    this.ctx.fillStyle = flash ? "#f7ffff" : "#23394a";
    this.ctx.fillRect(209, 75, 25, 31);
    this.ctx.fillRect(202, 84, 9, 18);
    this.ctx.fillStyle = flash ? "#fff" : "#45d9b7";
    this.ctx.fillRect(212, 70, 18, 35);
    this.ctx.fillRect(206, 78, 7, 18);
    this.ctx.fillStyle = flash ? "#fff4cf" : "#d9a84f";
    this.ctx.fillRect(198, 70, 13, 8);
    this.ctx.fillRect(231, 68, 14, 8);
    this.ctx.fillRect(201, 65, 7, 5);
    this.ctx.fillRect(236, 63, 6, 5);
    this.ctx.fillStyle = "#15212e";
    this.ctx.fillRect(215, 82, 4, 4);
    this.ctx.fillRect(225, 82, 4, 4);
    this.ctx.fillStyle = "#e9f9b7";
    this.ctx.fillRect(216, 83, 2, 2);
    this.ctx.fillRect(226, 83, 2, 2);
    this.ctx.fillStyle = flash ? "#fff" : "#397c73";
    this.ctx.fillRect(205, 103, 5, 12);
    this.ctx.fillRect(233, 102, 5, 13);
    this.ctx.fillRect(198, 111, 9, 3);
    this.ctx.fillRect(237, 112, 9, 3);
    this.ctx.fillStyle = "#d5b5ff";
    this.ctx.fillRect(219, 66, 6, 5);
  }

  private drawDustSentinel(flash: boolean): void {
    this.ctx.fillStyle = "#0008";
    this.ctx.fillRect(190, 117, 61, 5);
    this.ctx.fillStyle = flash ? "#fff" : "#382a2b";
    this.ctx.fillRect(201, 66, 39, 49);
    this.ctx.fillRect(195, 80, 8, 30);
    this.ctx.fillRect(239, 80, 8, 30);
    this.ctx.fillStyle = flash ? "#fff4df" : "#a86e43";
    this.ctx.fillRect(205, 62, 31, 48);
    this.ctx.fillRect(199, 84, 7, 21);
    this.ctx.fillRect(235, 84, 8, 21);
    this.ctx.fillStyle = flash ? "#fff" : "#d0a15f";
    this.ctx.fillRect(210, 67, 21, 9);
    this.ctx.fillRect(208, 80, 25, 4);
    this.ctx.fillRect(210, 101, 21, 5);
    this.ctx.fillStyle = "#3b3036";
    this.ctx.fillRect(211, 86, 19, 12);
    this.ctx.fillRect(207, 109, 9, 8);
    this.ctx.fillRect(226, 109, 9, 8);
    this.ctx.fillStyle = "#78e0c2";
    this.ctx.fillRect(214, 89, 13, 3);
    this.ctx.fillRect(219, 84, 3, 16);
    this.ctx.fillStyle = "#e9cf6a";
    this.ctx.fillRect(218, 70, 5, 4);
  }

  private drawVaultStalker(flash: boolean): void {
    this.ctx.fillStyle = "#0008";
    this.ctx.fillRect(190, 117, 61, 4);
    this.ctx.fillStyle = flash ? "#f4ffff" : "#142b35";
    this.ctx.fillRect(205, 70, 31, 43);
    this.ctx.fillRect(197, 88, 10, 18);
    this.ctx.fillRect(235, 88, 10, 18);
    this.ctx.fillStyle = flash ? "#fff" : "#55dbc7";
    this.ctx.fillRect(210, 66, 21, 38);
    this.ctx.fillRect(202, 83, 8, 16);
    this.ctx.fillRect(231, 82, 9, 17);
    this.ctx.fillStyle = "#1b1831";
    this.ctx.fillRect(213, 77, 15, 15);
    this.ctx.fillStyle = "#d578d8";
    this.ctx.fillRect(216, 81, 3, 4);
    this.ctx.fillRect(223, 81, 3, 4);
    this.ctx.fillRect(218, 91, 7, 2);
    this.ctx.fillStyle = flash ? "#fff" : "#327c78";
    this.ctx.fillRect(204, 105, 8, 12);
    this.ctx.fillRect(230, 105, 8, 12);
    this.ctx.fillRect(195, 111, 12, 4);
    this.ctx.fillRect(235, 111, 12, 4);
  }

  private drawPhaseWarden(flash: boolean): void {
    this.ctx.fillStyle = "#0008";
    this.ctx.fillRect(187, 117, 67, 5);
    this.ctx.fillStyle = flash ? "#fff" : "#24182f";
    this.ctx.fillRect(199, 61, 43, 54);
    this.ctx.fillRect(192, 78, 9, 31);
    this.ctx.fillRect(241, 78, 9, 31);
    this.ctx.fillStyle = flash ? "#fff" : "#77518e";
    this.ctx.fillRect(204, 65, 33, 45);
    this.ctx.fillRect(197, 82, 8, 23);
    this.ctx.fillRect(237, 82, 8, 23);
    this.ctx.fillStyle = flash ? "#fff" : "#d578d8";
    this.ctx.fillRect(209, 58, 23, 10);
    this.ctx.fillRect(207, 73, 27, 5);
    this.ctx.fillRect(211, 102, 19, 5);
    this.ctx.fillStyle = "#15192d";
    this.ctx.fillRect(211, 80, 19, 17);
    this.ctx.fillStyle = "#55dbc7";
    this.ctx.fillRect(215, 84, 11, 3);
    this.ctx.fillRect(219, 78, 3, 22);
    this.ctx.fillStyle = "#e9cf6a";
    this.ctx.fillRect(217, 62, 7, 4);
    this.ctx.fillStyle = "#352844";
    this.ctx.fillRect(205, 109, 10, 9);
    this.ctx.fillRect(227, 109, 10, 9);
  }

  private drawParty(view: BattleView): void {
    view.party.forEach((member, index) => {
      const position = this.memberPosition(index, view.party.length);
      const isAttacking = view.animation === "hero-strike" && member.id === view.animationMemberId;
      if (isAttacking) {
        if (member.id === "nox" && isCarbineEquipment(member.equipment.weapon)) {
          const recoil = Math.round(Math.sin(view.animationProgress * Math.PI) * 2);
          this.drawMemberBack(member, position.x - recoil, position.y, 0.9, false, false, 2);
          this.drawCarbineShot(member, position, this.enemyPosition(view, view.animationEnemyId), view.animationProgress);
          return;
        }
        if (view.animationProgress < 0.2) return;
        const travel = Math.min(1, (view.animationProgress - 0.2) / 0.35);
        const target = this.enemyPosition(view, view.animationEnemyId);
        const x = position.x + (target.x - 26 - position.x) * travel;
        const y = position.y + (target.y + 4 - position.y) * travel;
        const attackFrame = travel < 0.65 ? 1 : 2;
        this.drawMemberBack(member, Math.round(x), Math.round(y), 0.6, false, false, attackFrame);
        return;
      }
      const isHit = view.animation === "hero-hit" && member.id === view.animationTargetId;
      const hitOffset = isHit && Math.floor(view.animationProgress * 10) % 2 === 0 ? -3 : 0;
      const casting = view.animation === "hero-cast" && member.id === view.animationMemberId;
      this.drawMemberBack(member, position.x + hitOffset, position.y, 0.9, casting, isHit, casting ? 3 : 0);
      if (view.targetingMember && member.id === view.selectedMemberId) {
        this.ctx.fillStyle = "#e9cf6a";
        this.ctx.fillRect(position.x - 4, position.y - 39, 9, 2);
        this.ctx.fillRect(position.x - 3, position.y - 37, 7, 2);
        this.ctx.fillRect(position.x - 1, position.y - 35, 3, 2);
      }
    });
  }

  private drawMemberBack(
    member: PartyMemberProgress,
    x: number,
    y: number,
    scale: number,
    casting: boolean,
    hit: boolean,
    frame = 0,
  ): void {
    if (this.drawPartySprite(member, x, y, scale, frame, hit)) {
      this.drawEquippedCarbine(member, x, y, scale, frame);
      return;
    }
    const palette = member.id === "ione"
      ? { hair: "#7d4fa4", suit: "#64d6c4", shade: "#35445f", accent: "#d5b5ff" }
      : member.id === "nox"
        ? { hair: "#252b3e", suit: "#b58a55", shade: "#59463c", accent: "#78e0c2" }
        : { hair: "#b66f72", suit: "#dce5ed", shade: "#7f91aa", accent: "#e2c55f" };
    const inactive = member.hp <= 0;
    this.ctx.save();
    this.ctx.globalAlpha = inactive ? 0.45 : 1;
    this.ctx.translate(x, y);
    this.ctx.scale(scale, scale);
    this.ctx.translate(-x, -y);
    this.ctx.fillStyle = "#0008";
    this.ctx.fillRect(x - 15, y + 29, 34, 5);
    this.ctx.fillStyle = "#111525";
    this.ctx.fillRect(x - 8, y - 5, 17, 13);
    this.ctx.fillStyle = hit ? "#f0f4ff" : palette.hair;
    this.ctx.fillRect(x - 6, y - 3, 13, 10);
    this.ctx.fillStyle = palette.suit;
    this.ctx.fillRect(x - 11, y + 7, 23, 18);
    this.ctx.fillStyle = palette.shade;
    this.ctx.fillRect(x - 8, y + 10, 17, 13);
    this.ctx.fillStyle = palette.accent;
    this.ctx.fillRect(x - 1, y + 10, 3, 12);
    this.ctx.fillStyle = "#182035";
    this.ctx.fillRect(x - 9, y + 24, 7, 10);
    this.ctx.fillRect(x + 4, y + 24, 7, 10);
    this.ctx.fillStyle = palette.suit;
    if (casting) {
      this.ctx.fillRect(x - 17, y - 1, 7, 19);
      this.ctx.fillStyle = "#c98b74";
      this.ctx.fillRect(x - 17, y - 7, 6, 7);
    } else {
      this.ctx.fillRect(x - 16, y + 9, 7, 15);
    }
    this.ctx.fillStyle = palette.suit;
    this.ctx.fillRect(x + 10, y + 9, 7, 15);
    this.ctx.restore();
    this.drawEquippedCarbine(member, x, y, scale, frame);
  }

  private drawEquippedCarbine(
    member: PartyMemberProgress,
    x: number,
    y: number,
    scale: number,
    frame: number,
  ): void {
    if (member.id !== "nox" || !member.equipment.weapon) return;
    const palette = CARBINE_PALETTES[member.equipment.weapon];
    if (!palette) return;
    // Keep the standard rear sprite clean while idle.  The equipped carbine
    // is only revealed in Nox's dedicated firing pose, rather than reading as
    // an oversized weapon permanently strapped across his back.
    if (frame !== 2 || this.hasNoxCarbineFiringSprite()) return;
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.scale(scale, scale);
    // Fallback for a missing dedicated firing sheet.
    this.ctx.fillStyle = "#111923";
    this.ctx.fillRect(-15, -2, 14, 9);
    this.ctx.fillRect(-3, -6, 25, 13);
    this.ctx.fillRect(20, -4, 29, 7);
    this.ctx.fillRect(47, -6, 5, 11);
    this.ctx.fillRect(8, 6, 8, 11);
    this.ctx.fillStyle = palette.shade;
    this.ctx.fillRect(-12, 0, 12, 5);
    this.ctx.fillRect(0, -3, 20, 8);
    this.ctx.fillRect(20, -2, 26, 3);
    this.ctx.fillRect(10, 6, 5, 8);
    this.ctx.fillStyle = palette.body;
    this.ctx.fillRect(-9, 0, 8, 3);
    this.ctx.fillRect(3, -4, 16, 3);
    this.ctx.fillRect(21, -3, 23, 2);
    this.ctx.fillRect(6, 7, 5, 5);
    this.ctx.fillRect(12, -10, 11, 4);
    this.ctx.fillStyle = palette.coil;
    this.ctx.fillRect(15, -5, 5, 5);
    this.ctx.fillRect(14, -9, 5, 2);
    this.ctx.fillStyle = "#dce8ed";
    this.ctx.fillRect(48, -3, 4, 4);
    this.ctx.restore();
  }

  private drawCarbineShot(
    member: PartyMemberProgress,
    origin: MemberPosition,
    target: EnemyPosition,
    progress: number,
  ): void {
    if (!member.equipment.weapon) return;
    const palette = CARBINE_PALETTES[member.equipment.weapon];
    if (!palette || progress < 0.16 || progress > 0.72) return;
    const travel = Math.min(1, (progress - 0.16) / 0.42);
    const startX = origin.x + 26;
    const startY = origin.y - 2;
    const x = startX + (target.x - 24 - startX) * travel;
    const y = startY + (target.y - 4 - startY) * travel;
    this.ctx.save();
    this.ctx.fillStyle = palette.shot;
    this.ctx.fillRect(Math.round(x) - 5, Math.round(y) - 1, 10, 2);
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(Math.round(x) - 2, Math.round(y) - 1, 4, 1);
    if (progress < 0.3) {
      this.ctx.fillStyle = palette.coil;
      this.ctx.fillRect(startX - 2, startY - 3, 7, 7);
      this.ctx.fillStyle = "#ffffff";
      this.ctx.fillRect(startX, startY - 1, 3, 3);
    }
    this.ctx.restore();
  }

  private drawPartySprite(
    member: PartyMemberProgress,
    x: number,
    y: number,
    scale: number,
    frame: number,
    hit: boolean,
  ): boolean {
    if (!this.partySprites.complete || this.partySprites.naturalWidth === 0) return false;
    const row = PARTY_SPRITE_ROWS[member.id];
    const width = 54 * scale;
    const height = 63 * scale;
    this.ctx.save();
    this.ctx.globalAlpha = member.hp <= 0 ? 0.42 : 1;
    if (hit) this.ctx.filter = "brightness(2.7) saturate(0.1)";
    this.ctx.fillStyle = "rgba(0, 0, 0, .42)";
    this.ctx.beginPath();
    this.ctx.ellipse(x, y + 30 * scale, 16 * scale, 3 * scale, 0, 0, Math.PI * 2);
    this.ctx.fill();
    if (member.id === "nox" && frame === 2 && isCarbineEquipment(member.equipment.weapon)
      && this.hasNoxCarbineFiringSprite()) {
      // Unlike a melee strike, Nox stays on his mark to fire. Enlarge this
      // dedicated pose so the carbine reads clearly, while keeping its boots
      // on the same ground line as his standard battle stance.
      const firingWidth = 70 * scale;
      const firingHeight = 82 * scale;
      const firingFeetRatio = 104 / PARTY_FRAME_HEIGHT;
      this.ctx.drawImage(
        this.noxCarbineFiringSprite,
        x - firingWidth / 2,
        y + 30 * scale - firingHeight * firingFeetRatio,
        firingWidth,
        firingHeight,
      );
    } else {
      this.ctx.drawImage(
        this.partySprites,
        frame * PARTY_FRAME_WIDTH,
        row * PARTY_FRAME_HEIGHT,
        PARTY_FRAME_WIDTH,
        PARTY_FRAME_HEIGHT,
        x - width / 2,
        y - height / 2,
        width,
        height,
      );
    }
    this.ctx.restore();
    return true;
  }

  private hasNoxCarbineFiringSprite(): boolean {
    return this.noxCarbineFiringSprite.complete && this.noxCarbineFiringSprite.naturalWidth > 0;
  }

  private drawArcBolt(view: BattleView): void {
    const actorIndex = Math.max(0, view.party.findIndex((member) => member.id === view.animationMemberId));
    const origin = this.memberPosition(actorIndex, view.party.length);
    const target = this.enemyPosition(view, view.animationEnemyId);
    const originX = origin.x + 7;
    const originY = origin.y - 12;
    const x = originX + Math.round(view.animationProgress * (target.x - originX));
    const y = originY
      + Math.round(view.animationProgress * (target.y - originY))
      - Math.round(Math.sin(view.animationProgress * Math.PI) * 35);
    const flare = view.effect === "flare-lance";
    if (flare) {
      const previous = Math.max(0, view.animationProgress - 0.16);
      const trailX = originX + Math.round(previous * (target.x - originX));
      const trailY = originY
        + Math.round(previous * (target.y - originY))
        - Math.round(Math.sin(previous * Math.PI) * 35);
      this.ctx.strokeStyle = "#9e3549";
      this.ctx.lineWidth = 6;
      this.ctx.beginPath();
      this.ctx.moveTo(trailX, trailY);
      this.ctx.lineTo(x, y);
      this.ctx.stroke();
      this.ctx.strokeStyle = "#ffb45f";
      this.ctx.lineWidth = 3;
      this.ctx.stroke();
      this.ctx.fillStyle = "#fff4c4";
      this.ctx.fillRect(x - 4, y - 2, 11, 5);
      this.ctx.fillStyle = "#ef765c";
      for (let index = 0; index < 4; index += 1) {
        const offset = 5 + index * 4;
        this.ctx.fillRect(x - offset, y + (index % 2 === 0 ? -5 : 5), 3, 3);
      }
      return;
    }

    const points = 8;
    this.ctx.strokeStyle = "#286e91";
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    for (let index = 0; index <= points; index += 1) {
      const t = index / points;
      const pointX = originX + (x - originX) * t;
      const pointY = originY + (y - originY) * t
        + Math.sin(index * 4.7 + view.animationProgress * 18) * (index === 0 || index === points ? 0 : 4);
      if (index === 0) this.ctx.moveTo(pointX, pointY);
      else this.ctx.lineTo(pointX, pointY);
    }
    this.ctx.stroke();
    this.ctx.strokeStyle = "#bafcff";
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    this.ctx.fillStyle = "#f1ffff";
    this.ctx.fillRect(x - 3, y - 3, 7, 7);
    this.ctx.fillStyle = "#65e5d1";
    this.ctx.fillRect(x - 7, y - 1, 4, 3);
    this.ctx.fillRect(x + 4, y - 1, 5, 3);
  }

  private drawStaticField(view: BattleView): void {
    const positions = this.enemyPositions(view.enemies.length);
    const activePositions = view.enemies
      .map((enemy, index) => enemy.hp > 0 ? positions[index] : undefined)
      .filter((position): position is EnemyPosition => !!position);
    if (activePositions.length === 0) return;
    const pulse = Math.sin(view.animationProgress * Math.PI);
    view.enemies.forEach((enemy, index) => {
      if (enemy.hp <= 0) return;
      const position = positions[index] ?? positions[0];
      if (!position) return;
      this.drawEnergyPath(
        position.x,
        HORIZON - 10,
        position.x,
        position.y + 8,
        7,
        5 + pulse * 4,
        index % 2 === 0 ? "#78e0c2" : "#d5b5ff",
        2,
        view.animationProgress * 22 + index,
      );
      const radius = 14 + Math.round(pulse * 13);
      this.ctx.strokeStyle = index % 2 === 0 ? "#78e0c2" : "#d5b5ff";
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.ellipse(position.x, position.y + 18, radius, Math.max(3, radius / 4), 0, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.fillStyle = "#e9fff9";
      this.ctx.fillRect(position.x - 1, position.y - 42, 3, 8);
      this.ctx.fillRect(position.x - 5, position.y - 39, 11, 2);
    });
    for (let index = 1; index < activePositions.length; index += 1) {
      const previous = activePositions[index - 1];
      const current = activePositions[index];
      if (!previous || !current) continue;
      this.drawEnergyPath(
        previous.x,
        previous.y - 8,
        current.x,
        current.y - 8,
        6,
        4,
        "#b9fff4",
        1,
        view.animationProgress * 19 + index,
      );
    }
  }

  private drawMend(view: BattleView): void {
    const targetId = view.animationTargetId ?? view.animationMemberId;
    const targetIndex = Math.max(0, view.party.findIndex((member) => member.id === targetId));
    const target = this.memberPosition(targetIndex, view.party.length);
    const pulse = Math.sin(view.animationProgress * Math.PI);
    const radius = 8 + Math.round(view.animationProgress * 20);
    this.ctx.strokeStyle = view.animationProgress < 0.65 ? "#78e0c2" : "#d5b5ff";
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.ellipse(target.x, target.y + 13, radius, Math.max(3, radius / 4), 0, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.ellipse(target.x, target.y + 13, radius * 0.62, Math.max(2, radius / 7), 0, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.fillStyle = "#e9fff9";
    this.ctx.fillRect(target.x - 1, target.y - 18, 3, 11);
    this.ctx.fillRect(target.x - 5, target.y - 14, 11, 3);
    for (let index = 0; index < 7; index += 1) {
      const angle = index / 7 * Math.PI * 2 + view.animationProgress * 1.8;
      const orbit = 13 + pulse * 8;
      const x = target.x + Math.cos(angle) * orbit;
      const y = target.y + 4 + Math.sin(angle) * orbit * 0.75 - view.animationProgress * 9;
      this.ctx.fillStyle = index % 2 === 0 ? "#78e0c2" : "#d5b5ff";
      this.ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
    }
  }

  private drawBarrier(view: BattleView): void {
    if (view.animationEnemyId) {
      const position = this.enemyPosition(view, view.animationEnemyId);
      const pulse = Math.sin(view.animationProgress * Math.PI);
      this.ctx.strokeStyle = "#8ef7df";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.ellipse(position.x, position.y - 2, 25 + pulse * 6, 38 + pulse * 5, 0, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.strokeStyle = "#d5b5ff";
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.ellipse(position.x, position.y - 2, 20 + pulse * 4, 32 + pulse * 4, 0, 0, Math.PI * 2);
      this.ctx.stroke();
      return;
    }
    const targets = view.animationTargetId
      ? view.party.filter((member) => member.id === view.animationTargetId)
      : view.party.filter((member) => member.hp > 0);
    const pulse = Math.sin(view.animationProgress * Math.PI);
    targets.forEach((member) => {
      const index = view.party.findIndex((candidate) => candidate.id === member.id);
      const position = this.memberPosition(index, view.party.length);
      this.ctx.strokeStyle = "#8ef7df";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.ellipse(position.x, position.y + 2, 16 + pulse * 5, 29 + pulse * 4, 0, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.strokeStyle = "#d5b5ff";
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.ellipse(position.x, position.y + 2, 12 + pulse * 3, 24 + pulse * 3, 0, 0, Math.PI * 2);
      this.ctx.stroke();
    });
  }

  private drawDisruption(view: BattleView): void {
    const positions = view.animationTargetId
      ? [this.memberPosition(Math.max(0, view.party.findIndex((member) => member.id === view.animationTargetId)), view.party.length)]
      : view.animation === "enemy-cast" && view.effect === "weaken"
        ? view.party.filter((member) => member.hp > 0).map((_, index) => this.memberPosition(index, view.party.length))
      : view.animationEnemyId
        ? [this.enemyPosition(view, view.animationEnemyId)]
        : this.enemyPositions(view.enemies.length);
    positions.forEach((position, index) => {
      const radius = 9 + Math.sin(view.animationProgress * Math.PI) * 12;
      this.ctx.strokeStyle = view.effect === "shock" ? "#a6fff1" : "#d884e7";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(position.x, position.y - 5, radius, 0, Math.PI * 2);
      this.ctx.stroke();
      for (let spark = 0; spark < 4; spark += 1) {
        const angle = spark / 4 * Math.PI * 2 + index;
        this.ctx.fillStyle = view.effect === "shock" ? "#f1ffff" : "#f2b4ff";
        this.ctx.fillRect(
          Math.round(position.x + Math.cos(angle) * (radius + 4)),
          Math.round(position.y - 5 + Math.sin(angle) * (radius + 4)),
          2,
          2,
        );
      }
    });
  }

  private drawEnemyPower(view: BattleView): void {
    const caster = this.enemyPosition(view, view.animationEnemyId);
    const pulse = Math.sin(view.animationProgress * Math.PI);
    const storm = view.effect === "storm";
    this.ctx.strokeStyle = storm ? "#91fff2" : "#ff9b62";
    this.ctx.lineWidth = 2;
    for (let ring = 0; ring < 3; ring += 1) {
      const radius = 10 + ring * 8 + pulse * 8;
      this.ctx.beginPath();
      this.ctx.arc(caster.x, caster.y - 7, radius, 0, Math.PI * 2);
      this.ctx.stroke();
    }
    const targets = view.animationTargetId
      ? [this.memberPosition(Math.max(0, view.party.findIndex((member) => member.id === view.animationTargetId)), view.party.length)]
      : view.party.filter((member) => member.hp > 0).map((_, index) => this.memberPosition(index, view.party.length));
    targets.forEach((target, index) => {
      this.ctx.fillStyle = storm ? (index % 2 === 0 ? "#d8ffff" : "#d5b5ff") : "#ffb267";
      for (let spark = 0; spark < 4; spark += 1) {
        const x = target.x - 10 + ((spark * 7 + index * 3) % 22);
        const y = target.y - 24 + ((spark * 11 + Math.round(view.animationProgress * 25)) % 37);
        this.ctx.fillRect(x, y, 2, storm ? 7 : 4);
      }
    });
  }

  private drawEnergyPath(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    segments: number,
    jitter: number,
    color: string,
    width: number,
    phase: number,
  ): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.beginPath();
    for (let index = 0; index <= segments; index += 1) {
      const t = index / segments;
      const edge = index === 0 || index === segments;
      const x = startX + (endX - startX) * t + (edge ? 0 : Math.sin(index * 5.3 + phase) * jitter);
      const y = startY + (endY - startY) * t + (edge ? 0 : Math.cos(index * 4.1 + phase) * jitter);
      if (index === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.stroke();
  }

  private drawVictorySignal(view: BattleView): void {
    const pulse = Math.sin(view.animationProgress * Math.PI);
    this.ctx.fillStyle = `rgba(117, 224, 210, ${0.12 + pulse * 0.18})`;
    this.ctx.fillRect(0, HORIZON - 3, WIDTH, 7);
    this.ctx.strokeStyle = "#78e0c2";
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(82 - pulse * 30, 91);
    this.ctx.lineTo(238 + pulse * 30, 91);
    this.ctx.stroke();
    this.ctx.fillStyle = "#e9cf6a";
    this.ctx.font = "bold 10px monospace";
    this.ctx.textAlign = "center";
    this.ctx.fillText("SIGNAL CLEAR", WIDTH / 2, 88);
    this.ctx.textAlign = "left";
    view.party.forEach((member, index) => {
      if (member.hp <= 0) return;
      const position = this.memberPosition(index, view.party.length);
      for (let spark = 0; spark < 3; spark += 1) {
        const x = position.x - 12 + ((spark * 11 + index * 5) % 25);
        const y = position.y - 13 - ((spark * 9 + view.animationProgress * 22) % 27);
        this.ctx.fillStyle = spark % 2 === 0 ? "#78e0c2" : "#e9cf6a";
        this.ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
      }
    });
  }

  private drawEnemyPanels(view: BattleView): void {
    const count = view.enemies.length;
    const gap = count === 3 ? 3 : 8;
    const margin = count === 3 ? 5 : 8;
    const width = count === 1 ? 130 : Math.floor((WIDTH - margin * 2 - gap * (count - 1)) / count);
    view.enemies.forEach((enemy, index) => {
      const x = margin + index * (width + gap);
      const selected = view.targetingEnemy && enemy.combatId === view.selectedEnemyId;
      this.ctx.fillStyle = "rgba(4, 7, 19, .92)";
      const panelHeight = enemy.intent ? 31 : 25;
      this.ctx.fillRect(x, 7, width, panelHeight);
      this.ctx.strokeStyle = selected ? "#e9cf6a" : enemy.hp <= 0 ? "#3e4656" : "#657895";
      this.ctx.strokeRect(x + 0.5, 7.5, width - 1, panelHeight - 1);
      this.ctx.fillStyle = enemy.hp <= 0 ? "#687083" : "#edf3f8";
      this.ctx.font = `${count === 3 ? 7 : 8}px monospace`;
      const nameLimit = count === 3 ? 13 : 19;
      this.ctx.fillText(enemy.definition.name.slice(0, nameLimit), x + 7, 18);
      const barWidth = width - 14;
      this.ctx.fillStyle = "#292d49";
      this.ctx.fillRect(x + 7, 23, barWidth, 4);
      this.ctx.fillStyle = enemy.hp <= 0 ? "#4c5260" : enemy.definition.accentColor;
      this.ctx.fillRect(x + 7, 23, Math.round(barWidth * enemy.hp / enemy.definition.maxHp), 4);
      if (enemy.statuses.length > 0) {
        this.ctx.textAlign = "right";
        this.ctx.fillStyle = "#d5b5ff";
        this.ctx.font = "5px monospace";
        this.ctx.fillText(enemy.statuses.map((status) => status.id.slice(0, 4).toUpperCase()).join("/"), x + width - 6, 18);
        this.ctx.textAlign = "left";
      }
      if (enemy.intent) {
        this.ctx.fillStyle = "#ffbf6a";
        this.ctx.font = "bold 5px monospace";
        this.ctx.fillText(`! ${enemy.intent}`, x + 7, 34);
      }
    });
  }

  private drawResults(view: BattleView): void {
    const results = view.results;
    if (!results) return;
    this.ctx.fillStyle = "rgba(4, 7, 19, .96)";
    this.ctx.fillRect(34, 36, 252, 113);
    this.ctx.strokeStyle = "#8398b5";
    this.ctx.strokeRect(34.5, 36.5, 251, 112);
    this.ctx.strokeStyle = "#354660";
    this.ctx.strokeRect(37.5, 39.5, 245, 106);
    this.ctx.fillStyle = "#e9cf6a";
    this.ctx.font = "bold 9px monospace";
    this.ctx.fillText("BATTLE RESULTS", 45, 52);
    this.ctx.fillStyle = "#dbe4ef";
    this.ctx.font = "8px monospace";
    this.ctx.fillText(`EXP POOL +${results.experience}`, 45, 66);
    this.ctx.fillText(`CREDITS +${results.credits}`, 187, 66);
    const compact = results.members.length > 2;
    results.members.forEach((member, index) => {
      const x = compact ? 45 + (index % 2) * 120 : 45;
      const y = compact ? 80 + Math.floor(index / 2) * 31 : 84 + index * 29;
      const levelled = member.level > member.previousLevel;
      this.ctx.fillStyle = levelled ? "#78e0c2" : "#dbe4ef";
      this.ctx.font = `bold ${compact ? 7 : 8}px monospace`;
      this.ctx.fillText(`${member.name}  LV ${member.level}${levelled ? compact ? " UP" : "  LEVEL UP" : ""}`, x, y);
      this.ctx.fillStyle = "#8d9bb0";
      this.ctx.font = "7px monospace";
      this.ctx.fillText(member.earnedExperience > 0
        ? `NEXT ${member.experience}/${member.nextLevelExperience}`
        : "DOWN · NO EXP", x, y + 10);
      const learned = member.learnedSpells.map((spellId) => SPELLS[spellId].name).join(", ");
      if (learned) {
        this.ctx.fillStyle = "#d5b5ff";
        this.ctx.fillText(`LEARNED ${compact ? learned.slice(0, 12) : learned}`, compact ? x : 138, compact ? y + 20 : y + 10);
      }
    });
    this.ctx.fillStyle = "#e9cf6a";
    this.ctx.font = "7px monospace";
    this.ctx.fillText("A · CONTINUE", 223, 141);
  }

  private drawInterface(view: BattleView): void {
    this.ctx.fillStyle = "#060915";
    this.ctx.fillRect(0, FIELD_BOTTOM, WIDTH, HEIGHT - FIELD_BOTTOM);
    this.ctx.strokeStyle = "#7489a7";
    this.ctx.strokeRect(4.5, 160.5, 155, 74);
    this.ctx.strokeRect(164.5, 160.5, 151, 74);
    this.ctx.strokeStyle = "#354660";
    this.ctx.beginPath();
    this.ctx.moveTo(82.5, 161);
    this.ctx.lineTo(82.5, 234);
    this.ctx.moveTo(5, 197.5);
    this.ctx.lineTo(159, 197.5);
    this.ctx.stroke();

    view.party.forEach((member, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = 10 + column * 77;
      const y = 172 + row * 37;
      const active = view.acceptingCommand && member.id === view.activeMemberId;
      this.ctx.fillStyle = active ? "#e9cf6a" : member.hp <= 0 ? "#687083" : "#78e0c2";
      this.ctx.font = "bold 7px monospace";
      this.ctx.fillText(active ? "▶" : "·", x, y);
      this.ctx.fillText(member.name.slice(0, 7), x + 9, y);
      this.ctx.fillStyle = member.hp <= 0 ? "#687083" : "#8d9bb0";
      this.ctx.textAlign = "right";
      this.ctx.fillText(`LV${member.level}`, x + 68, y);
      this.ctx.textAlign = "left";
      this.ctx.fillStyle = member.hp <= 0 ? "#687083" : "#edf3f8";
      this.ctx.font = "6px monospace";
      this.ctx.fillText(`HP ${member.hp}/${member.maxHp}`, x + 9, y + 10);
      this.ctx.fillText(`MP ${member.mp}/${member.maxMp}`, x + 9, y + 19);
      const statuses = view.memberStatuses[member.id] ?? [];
      if (statuses.length > 0) {
        this.ctx.fillStyle = "#d5b5ff";
        this.ctx.font = "5px monospace";
        this.ctx.fillText(statuses.map((status) => status.id.slice(0, 4).toUpperCase()).join("/"), x + 42, y + 19);
      }
    });
    if (view.choosingSpell) {
      this.drawSpellCommands(view);
    } else {
      this.ctx.fillStyle = "#8d9bb0";
      this.ctx.font = "6px monospace";
      this.ctx.fillText(`TONIC ${view.inventory.tonics} · CR ${view.inventory.credits}`, 171, 205);
      this.drawActionCommands(view);
      this.ctx.fillStyle = "#e7edf5";
      this.ctx.font = "7px monospace";
      const messageLines = this.wrapMessage(view.message, 31);
      this.ctx.fillText(messageLines[0] ?? "", 171, 216);
      this.ctx.fillText(messageLines[1] ?? "", 171, 227);
    }
  }

  private drawActionCommands(view: BattleView): void {
    this.ctx.font = "7px monospace";
    view.actions.forEach((action, index) => {
      const column = index >= 3 ? 1 : 0;
      const row = column === 0 ? index : index - 3;
      const x = column === 0 ? 171 : 242;
      const y = 173 + row * 11;
      const selected = view.acceptingCommand && !view.targetingEnemy && !view.targetingMember && index === view.selectedAction;
      this.ctx.fillStyle = selected ? "#e9cf6a" : "#9ba8bd";
      this.ctx.fillText(selected ? "▶" : "·", x, y);
      this.ctx.fillText(action, x + 9, y);
    });
  }

  private drawSpellCommands(view: BattleView): void {
    this.ctx.font = "7px monospace";
    const offset = Math.max(0, Math.min(view.selectedSpell - 2, view.availableSpells.length - 4));
    view.availableSpells.slice(offset, offset + 4).forEach((spellId, visibleIndex) => {
      const index = visibleIndex + offset;
      const spell = SPELLS[spellId];
      const y = 173 + visibleIndex * 10;
      const selected = index === view.selectedSpell;
      this.ctx.fillStyle = selected ? "#e9cf6a" : "#d5b5ff";
      this.ctx.fillText(selected ? "▶" : "·", 171, y);
      this.ctx.fillText(spell.name.slice(0, 15), 180, y);
      this.ctx.fillStyle = "#8d9bb0";
      this.ctx.fillText(`${spell.cost}`, 299, y);
    });
    const selectedTechnique = SPELLS[view.availableSpells[view.selectedSpell] ?? "arc-bolt"];
    this.ctx.fillStyle = "#aeb9c9";
    this.ctx.font = "6px monospace";
    const description = this.wrapMessage(selectedTechnique.description, 40);
    this.ctx.fillText(description[0] ?? "", 171, 216);
    this.ctx.fillText(description[1] ?? "", 171, 227);
  }

  private wrapMessage(text: string, limit: number): [string, string?] {
    if (text.length <= limit) return [text];
    const breakAt = text.lastIndexOf(" ", limit);
    const split = breakAt > 12 ? breakAt : limit;
    const first = text.slice(0, split);
    const remainder = text.slice(split).trim();
    return [first, remainder.length <= limit ? remainder : `${remainder.slice(0, limit - 1)}…`];
  }

  private memberPosition(index: number, count: number): MemberPosition {
    if (count <= 1) return { x: 94, y: 120 };
    const positions: MemberPosition[] = [
      { x: 74, y: 119 },
      { x: 118, y: 124 },
      { x: 48, y: 128 },
      { x: 145, y: 130 },
    ];
    return positions[index] ?? positions[0] ?? { x: 94, y: 120 };
  }

  private enemyPositions(count: number): EnemyPosition[] {
    if (count <= 1) return [{ x: 220, y: 92, scale: 1 }];
    if (count === 2) return [
      { x: 195, y: 94, scale: 0.78 },
      { x: 249, y: 90, scale: 0.78 },
    ];
    return [
      { x: 177, y: 96, scale: 0.66 },
      { x: 220, y: 88, scale: 0.72 },
      { x: 263, y: 96, scale: 0.66 },
    ];
  }

  private enemyPosition(view: BattleView, combatId: string | null): EnemyPosition {
    const index = Math.max(0, view.enemies.findIndex((enemy) => enemy.combatId === combatId));
    return this.enemyPositions(view.enemies.length)[index] ?? { x: 220, y: 92, scale: 1 };
  }

  private drawScanlines(): void {
    this.ctx.fillStyle = "rgba(4, 8, 18, .07)";
    for (let y = 0; y < HEIGHT; y += 2) this.ctx.fillRect(0, y, WIDTH, 1);
  }
}
