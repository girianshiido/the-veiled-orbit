import type { InteractionKind, PartyMemberId } from "../types/game";
import type { TownIdentityView, TownServiceView } from "./TownServiceSystem";

const WIDTH = 320;
const HEIGHT = 240;

export class TownServiceRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly servicePortraits: HTMLImageElement;
  private readonly partyPortraits: HTMLImageElement;

  constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is unavailable.");
    this.ctx = context;
    this.ctx.imageSmoothingEnabled = false;
    this.servicePortraits = new Image();
    this.servicePortraits.src = `${import.meta.env.BASE_URL}assets/graphics/service-portraits-hd-v1.png`;
    this.partyPortraits = new Image();
    this.partyPortraits.src = `${import.meta.env.BASE_URL}assets/graphics/party-portraits-hd-v1.png`;
  }

  public render(view: TownServiceView): void {
    this.ctx.fillStyle = "rgba(3, 6, 15, .97)";
    this.ctx.fillRect(0, 0, WIDTH, HEIGHT);
    this.drawFrame(7, 6, 306, 30);
    const identityMode = view.mode === "profiles";
    this.drawFrame(7, 41, 83, identityMode ? 146 : 105);
    this.drawFrame(95, 41, 218, 146);
    this.drawFrame(7, 192, 306, 41);

    this.ctx.fillStyle = "#78e0c2";
    this.ctx.font = "bold 10px monospace";
    this.ctx.fillText(view.title, 17, 25);
    this.ctx.fillStyle = "#e9cf6a";
    this.ctx.font = "8px monospace";
    this.ctx.fillText(`${view.credits} CR`, 259, 25);

    if (identityMode) {
      this.drawIdentityRoster(view);
      this.drawIdentity(view.identity);
    } else {
      this.drawServicePortrait(view.serviceKind, 17, 51);
      this.ctx.fillStyle = "#728198";
      this.ctx.font = "7px monospace";
      this.ctx.fillText(view.portraitLabel, 17, 136);

      this.ctx.fillStyle = "#8190a5";
      this.ctx.font = "7px monospace";
      this.ctx.fillText(view.mode === "main" ? "SERVICE MENU" : view.mode.toUpperCase(), 106, 57);
      const choiceSpacing = view.choices.length > 5 ? 14 : 22;
      view.choices.forEach((choice, index) => {
        const y = 76 + index * choiceSpacing;
        const selected = index === view.selectedChoice;
        this.ctx.fillStyle = selected ? "#e9cf6a" : "#c1ccda";
        this.ctx.font = "8px monospace";
        this.ctx.fillText(selected ? "▶" : "·", 106, y);
        this.ctx.fillText(choice.label.slice(0, 19), 120, y);
        if (choice.price !== null) {
          this.ctx.fillStyle = choice.price <= view.credits ? "#78e0c2" : "#b66f72";
          this.ctx.fillText(`${choice.price} CR`, 260, y);
        }
      });
    }

    this.ctx.fillStyle = "#dbe4ef";
    this.ctx.font = "7px monospace";
    this.drawWrappedText(view.feedback, 17, 204, 286, 9, 2);
    this.ctx.fillStyle = "#5f718a";
    this.ctx.fillText("▲▼ SELECT  A CONFIRM  B BACK", 78, 226);
    this.drawScanlines();
  }

  private drawServicePortrait(kind: InteractionKind, x: number, y: number): void {
    const index = ({
      inn: 0,
      "item-shop": 1,
      "weapon-shop": 2,
      "armor-shop": 3,
      "save-shop": 4,
      "revival-shop": 5,
      teleport: 6,
      "party-house": 7,
    } as Partial<Record<InteractionKind, number>>)[kind];
    if (index !== undefined && this.servicePortraits.complete && this.servicePortraits.naturalWidth > 0) {
      const sourceWidth = this.servicePortraits.naturalWidth / 4;
      const sourceHeight = this.servicePortraits.naturalHeight / 2;
      this.ctx.fillStyle = "#101827";
      this.ctx.fillRect(x, y, 63, 72);
      this.ctx.drawImage(
        this.servicePortraits,
        index % 4 * sourceWidth,
        Math.floor(index / 4) * sourceHeight,
        sourceWidth,
        sourceHeight,
        x,
        y,
        63,
        72,
      );
      return;
    }
    this.drawFallbackPortrait(x, y);
  }

  private drawFallbackPortrait(x: number, y: number): void {
    this.ctx.fillStyle = "#101827";
    this.ctx.fillRect(x, y, 63, 72);
    this.ctx.fillStyle = "#29364a";
    this.ctx.fillRect(x + 5, y + 48, 53, 23);
    this.ctx.fillStyle = "#35485d";
    this.ctx.fillRect(x + 13, y + 39, 37, 31);
    this.ctx.fillStyle = "#7a5570";
    this.ctx.fillRect(x + 17, y + 11, 29, 35);
    this.ctx.fillStyle = "#c58972";
    this.ctx.fillRect(x + 19, y + 16, 25, 28);
    this.ctx.fillStyle = "#25263b";
    this.ctx.fillRect(x + 15, y + 8, 33, 12);
    this.ctx.fillRect(x + 17, y + 18, 5, 17);
    this.ctx.fillRect(x + 42, y + 18, 5, 17);
    this.ctx.fillStyle = "#e9cf6a";
    this.ctx.fillRect(x + 24, y + 27, 3, 2);
    this.ctx.fillRect(x + 37, y + 27, 3, 2);
    this.ctx.fillStyle = "#5b3540";
    this.ctx.fillRect(x + 28, y + 37, 9, 2);
    this.ctx.fillStyle = "#78e0c2";
    this.ctx.fillRect(x + 8, y + 57, 4, 9);
    this.ctx.fillRect(x + 51, y + 57, 4, 9);
  }

  private drawIdentityRoster(view: TownServiceView): void {
    const selectedId = view.identity?.id;
    if (selectedId) this.drawPartyPortrait(selectedId, 17, 47, 63, 68);
    else this.drawServicePortrait("party-house", 17, 47);
    this.ctx.fillStyle = "#728198";
    this.ctx.font = "6px monospace";
    this.ctx.fillText("IDENTITY FILES", 15, 122);
    view.choices.forEach((choice, index) => {
      const y = 130 + index * 7;
      const selected = index === view.selectedChoice;
      this.ctx.fillStyle = selected ? "#e9cf6a" : "#c1ccda";
      this.ctx.fillText(selected ? "▶" : "·", 14, y);
      this.ctx.fillText(choice.label.slice(0, 10), 24, y);
    });
  }

  private drawPartyPortrait(id: PartyMemberId, x: number, y: number, width: number, height: number): void {
    const index = { ash: 0, ione: 1, nox: 2, sera: 3 }[id];
    this.ctx.fillStyle = "#101827";
    this.ctx.fillRect(x, y, width, height);
    if (!this.partyPortraits.complete || this.partyPortraits.naturalWidth === 0) return;
    const sourceSize = this.partyPortraits.naturalWidth / 4;
    this.ctx.drawImage(this.partyPortraits, index * sourceSize, 0, sourceSize, this.partyPortraits.naturalHeight, x, y, width, height);
  }

  private drawIdentity(identity: TownIdentityView | null): void {
    this.ctx.fillStyle = "#8190a5";
    this.ctx.font = "7px monospace";
    this.ctx.fillText("IDENTITY RECORD", 106, 57);
    if (!identity) {
      this.ctx.fillStyle = "#dbe4ef";
      this.ctx.font = "8px monospace";
      this.ctx.fillText("RETURN TO HOUSE MENU", 106, 83);
      return;
    }
    this.ctx.fillStyle = "#78e0c2";
    this.ctx.font = "bold 10px monospace";
    this.ctx.fillText(identity.name, 106, 73);
    this.ctx.fillStyle = identity.active ? "#e9cf6a" : "#8190a5";
    this.ctx.font = "7px monospace";
    this.ctx.fillText(`${identity.role} · ${identity.active ? "ACTIVE" : "WAITING"}`, 106, 84);
    this.ctx.fillStyle = "#b7c2d1";
    this.ctx.font = "6px monospace";
    this.drawWrappedText(identity.description, 106, 96, 195, 8, 3);

    this.ctx.fillStyle = "#728198";
    this.ctx.font = "7px monospace";
    this.ctx.fillText(`LV ${identity.level}`, 106, 128);
    this.ctx.fillText(`EXP ${identity.experience}/${identity.nextLevel}`, 161, 128);
    this.ctx.fillStyle = identity.hp > 0 ? "#dbe4ef" : "#d6818d";
    this.ctx.fillText(`HP ${identity.hp}/${identity.maxHp}`, 106, 143);
    this.ctx.fillStyle = "#dbe4ef";
    this.ctx.fillText(`MP ${identity.mp}/${identity.maxMp}`, 206, 143);
    this.ctx.fillText(`ATK ${identity.attack}`, 106, 160);
    this.ctx.fillText(`DEF ${identity.defense}`, 171, 160);
    this.ctx.fillText(`AGI ${identity.agility}`, 239, 160);
    this.ctx.fillStyle = "#728198";
    this.ctx.fillText("CURRENT VALUES INCLUDE EQUIPMENT", 106, 178);
  }

  private drawFrame(x: number, y: number, width: number, height: number): void {
    this.ctx.strokeStyle = "#8398b5";
    this.ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
    this.ctx.strokeStyle = "#354660";
    this.ctx.strokeRect(x + 3.5, y + 3.5, width - 7, height - 7);
  }

  private drawWrappedText(
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    maxLines: number,
  ): void {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (this.ctx.measureText(candidate).width <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = word;
    }
    if (line) lines.push(line);
    lines.slice(0, maxLines).forEach((value, index) => this.ctx.fillText(value, x, y + index * lineHeight));
  }

  private drawScanlines(): void {
    this.ctx.fillStyle = "rgba(3, 7, 16, .06)";
    for (let y = 0; y < HEIGHT; y += 2) this.ctx.fillRect(0, y, WIDTH, 1);
  }
}
