import { EQUIPMENT, effectiveStats } from "../progression/equipmentData";
import { experienceForNextLevel } from "../progression/levelData";
import type { EquipmentId, PartyMemberProgress } from "../types/game";
import type { FieldMenuView } from "./FieldMenuSystem";

const WIDTH = 320;
const HEIGHT = 240;

export class FieldMenuRenderer {
  private readonly ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is unavailable.");
    this.ctx = context;
    this.ctx.imageSmoothingEnabled = false;
  }

  public render(view: FieldMenuView): void {
    this.ctx.fillStyle = "rgba(3, 6, 16, .96)";
    this.ctx.fillRect(0, 0, WIDTH, HEIGHT);
    this.drawFrame(5, 5, 310, 230);
    this.drawHeader(view);
    this.drawPartyList(view);
    this.drawContent(view);
    this.drawFooter(view);
    this.drawScanlines();
  }

  private drawHeader(view: FieldMenuView): void {
    this.ctx.fillStyle = "#78e0c2";
    this.ctx.font = "bold 9px monospace";
    this.ctx.fillText("FIELD CONSOLE", 14, 19);
    const credits = `${view.inventory.credits} CR`;
    this.ctx.fillStyle = "#e9cf6a";
    this.ctx.fillText(credits, 306 - this.ctx.measureText(credits).width, 19);
    view.tabs.forEach((tab, index) => {
      const x = 12 + index * 76;
      const selected = index === view.selectedTab;
      this.ctx.fillStyle = selected ? "#e9cf6a" : "#7e8da4";
      this.ctx.fillText(selected ? "▶" : "·", x, 37);
      this.ctx.fillText(tab, x + 10, 37);
    });
    this.ctx.strokeStyle = "#526784";
    this.ctx.beginPath();
    this.ctx.moveTo(10, 44.5);
    this.ctx.lineTo(310, 44.5);
    this.ctx.stroke();
  }

  private drawPartyList(view: FieldMenuView): void {
    this.drawFrame(9, 49, 87, 154);
    this.ctx.fillStyle = "#75849b";
    this.ctx.font = "7px monospace";
    this.ctx.fillText("ACTIVE PARTY", 17, 62);
    view.members.forEach((member, index) => {
      const y = 76 + index * 32;
      const selected = index === view.selectedMember;
      this.ctx.fillStyle = selected ? "#e9cf6a" : "#78e0c2";
      this.ctx.font = "bold 7px monospace";
      this.ctx.fillText(selected ? "▶" : "·", 16, y);
      this.ctx.fillText(member.name, 27, y);
      this.ctx.fillStyle = "#8d9bb0";
      this.ctx.fillText(`LV${member.level}`, 72, y);
      this.ctx.fillStyle = "#dce4ef";
      this.ctx.font = "6px monospace";
      this.ctx.fillText(`HP ${member.hp}/${member.maxHp}`, 27, y + 10);
      this.ctx.fillText(`MP ${member.mp}/${member.maxMp}`, 27, y + 19);
    });
  }

  private drawContent(view: FieldMenuView): void {
    this.drawFrame(101, 49, 210, 154);
    if (view.mode === "transit-destinations") {
      this.drawTransitDestinations(view);
      return;
    }
    const member = view.members[view.selectedMember];
    if (!member) return;
    const tab = view.tabs[view.selectedTab];
    if (tab === "TECH") this.drawMagic(member, view);
    else if (tab === "ITEMS") this.drawItems(member, view);
    else if (tab === "EQUIP") this.drawEquipment(member, view);
    else this.drawStatus(member);
  }

  private drawStatus(member: PartyMemberProgress): void {
    const stats = effectiveStats(member);
    this.drawMemberTitle(member);
    this.labelValue("EXPERIENCE", `${member.experience}/${experienceForNextLevel(member.level)}`, 111, 84);
    this.labelValue("ATTACK", `${stats.attack}`, 111, 101);
    this.labelValue("DEFENSE", `${stats.defense}`, 111, 116);
    this.labelValue("AGILITY", `${stats.agility}`, 111, 131);
    this.ctx.fillStyle = "#728198";
    this.ctx.font = "7px monospace";
    this.ctx.fillText("LOADOUT", 111, 151);
    this.ctx.fillStyle = "#dbe4ef";
    this.ctx.fillText(this.equipmentName(member.equipment.weapon), 111, 164);
    this.ctx.fillText(this.equipmentName(member.equipment.armor), 111, 174);
    this.ctx.fillText(this.equipmentName(member.equipment.shield), 111, 184);
    this.ctx.fillText(this.equipmentName(member.equipment.core), 111, 194);
  }

  private drawMagic(member: PartyMemberProgress, view: FieldMenuView): void {
    this.drawMemberTitle(member);
    this.ctx.fillStyle = "#728198";
    this.ctx.font = "7px monospace";
    if (view.mode === "tech-targets") {
      const spell = view.spells[view.selectedSpell];
      this.ctx.fillText(spell?.label ?? "TECHNIQUE", 111, 84);
      this.ctx.fillStyle = "#aeb9c9";
      this.ctx.fillText("CHOOSE ALLY", 111, 98);
      view.members.forEach((target, index) => {
        const y = 116 + index * 18;
        const selected = index === view.selectedSpellTarget;
        this.ctx.fillStyle = selected ? "#e9cf6a" : target.hp > 0 ? "#dbe4ef" : "#68758a";
        this.ctx.font = "bold 8px monospace";
        this.ctx.fillText(selected ? "▶" : "·", 111, y);
        this.ctx.fillText(target.name, 123, y);
        this.ctx.fillStyle = target.hp > 0 ? "#78e0c2" : "#b26d83";
        this.ctx.fillText(`${target.hp}/${target.maxHp} HP`, 230, y);
      });
      return;
    }
    this.ctx.fillText(view.mode === "tech-spells" ? "FIELD TECHNIQUES" : "KNOWN TECHNIQUES", 111, 84);
    const compact = view.spells.length > 5;
    view.spells.forEach((spell, index) => {
      const y = 98 + index * (compact ? 13 : 20);
      const selected = view.mode === "tech-spells" && index === view.selectedSpell;
      this.ctx.fillStyle = selected ? "#e9cf6a" : spell.usableInField ? "#d5b5ff" : "#7e8da4";
      this.ctx.font = `bold ${compact ? 7 : 8}px monospace`;
      this.ctx.fillText(selected ? "▶" : "·", 111, y);
      this.ctx.fillText(spell.label, 123, y);
      this.ctx.fillStyle = "#e9cf6a";
      const cost = `${spell.cost} MP`;
      this.ctx.fillText(cost, 299 - this.ctx.measureText(cost).width, y);
      if (!compact) {
        this.ctx.fillStyle = "#aeb9c9";
        this.ctx.font = "7px monospace";
        this.wrapText(spell.usableInField ? spell.description : "Battle only.", 111, y + 11, 188, 9, 1);
      }
    });
  }

  private drawItems(member: PartyMemberProgress, view: FieldMenuView): void {
    this.drawMemberTitle(member);
    this.ctx.fillStyle = "#728198";
    this.ctx.font = "7px monospace";
    this.ctx.fillText("ITEM INVENTORY", 111, 82);
    view.items.forEach((item, index) => {
      const y = 98 + index * 15;
      const selected = view.mode === "items" && index === view.selectedItem;
      this.ctx.fillStyle = selected ? "#e9cf6a" : item.count > 0 ? "#dbe4ef" : "#68758a";
      this.ctx.font = "bold 8px monospace";
      this.ctx.fillText(selected ? "▶" : "·", 111, y);
      this.ctx.fillText(item.label, 123, y);
      this.ctx.fillText(`×${item.count}`, 277, y);
    });
    const selectedItem = view.items[view.selectedItem] ?? view.items[0];
    this.ctx.fillStyle = "#aeb9c9";
    this.ctx.font = "7px monospace";
    this.ctx.strokeStyle = "#293950";
    this.ctx.beginPath();
    this.ctx.moveTo(111, 138.5);
    this.ctx.lineTo(299, 138.5);
    this.ctx.stroke();
    if (selectedItem) this.wrapText(selectedItem.description, 111, 151, 188, 9, 2);
    if (selectedItem?.id === "return-beacon") {
      this.ctx.fillStyle = "#728198";
      this.ctx.fillText("EFFECT", 111, 174);
      this.ctx.fillStyle = "#78e0c2";
      this.ctx.font = "bold 8px monospace";
      this.ctx.fillText("LABYRINTH ENTRANCE", 111, 188);
    } else if (selectedItem?.id === "transit-beacon") {
      this.ctx.fillStyle = "#728198";
      this.ctx.fillText("EFFECT", 111, 174);
      this.ctx.fillStyle = "#78e0c2";
      this.ctx.font = "bold 8px monospace";
      this.ctx.fillText("VISITED VILLAGE", 111, 188);
    } else {
      this.ctx.fillStyle = "#728198";
      this.ctx.fillText("TARGET", 111, 174);
      this.ctx.fillStyle = "#78e0c2";
      this.ctx.font = "bold 8px monospace";
      this.ctx.fillText(member.name, 111, 187);
      this.drawBar(111, 191, 180, member.hp / member.maxHp, "#66cf9b");
      this.ctx.fillStyle = "#dbe4ef";
      this.ctx.font = "6px monospace";
      this.ctx.fillText(`${member.hp} / ${member.maxHp} HP`, 205, 188);
    }
  }

  private drawTransitDestinations(view: FieldMenuView): void {
    this.ctx.fillStyle = "#78e0c2";
    this.ctx.font = "bold 9px monospace";
    this.ctx.fillText("TRANSIT BEACON", 111, 65);
    this.ctx.fillStyle = "#728198";
    this.ctx.font = "7px monospace";
    this.ctx.fillText("REGISTERED VILLAGES", 111, 82);
    view.transitDestinations.forEach((destination, index) => {
      const selected = index === view.selectedTransitDestination;
      const y = 101 + index * 18;
      this.ctx.fillStyle = selected ? "#e9cf6a" : "#dbe4ef";
      this.ctx.font = "bold 8px monospace";
      this.ctx.fillText(selected ? "▶" : "·", 111, y);
      this.ctx.fillText(destination.name, 125, y);
    });
  }

  private drawEquipment(member: PartyMemberProgress, view: FieldMenuView): void {
    const stats = effectiveStats(member);
    this.drawMemberTitle(member);
    this.ctx.font = "7px monospace";
    if (view.mode === "equip-options") {
      const slot = view.equipmentSlots[view.selectedEquipmentSlot] ?? "weapon";
      this.ctx.fillStyle = "#728198";
      this.ctx.fillText(`${slot.toUpperCase()} · STORAGE`, 111, 82);
      view.equipmentOptions.forEach((choice, index) => {
        const y = 98 + index * 16;
        const selected = index === view.selectedEquipmentOption;
        this.ctx.fillStyle = selected ? "#e9cf6a" : choice.action === "current" ? "#78e0c2" : "#dbe4ef";
        this.ctx.fillText(selected ? "▶" : "·", 111, y);
        this.ctx.fillText(this.truncate(choice.label, 27), 123, y);
      });
    } else {
      view.equipmentSlots.forEach((slot, index) => {
        const y = 82 + index * 16;
        const selected = view.mode === "equip-slots" && index === view.selectedEquipmentSlot;
        this.ctx.fillStyle = selected ? "#e9cf6a" : "#728198";
        this.ctx.fillText(selected ? "▶" : "·", 111, y);
        this.ctx.fillText(slot.toUpperCase(), 123, y);
        this.ctx.fillStyle = "#dbe4ef";
        this.ctx.fillText(this.truncate(this.equipmentName(member.equipment[slot]), 16), 176, y);
      });
    }
    this.ctx.fillStyle = "#728198";
    this.ctx.fillText("TOTAL", 111, 153);
    this.ctx.fillStyle = "#dbe4ef";
    this.ctx.fillText(`ATK ${stats.attack}  DEF ${stats.defense}  AGI ${stats.agility}`, 111, 165);
    this.ctx.fillStyle = "#728198";
    this.ctx.fillText(`STORAGE · ${view.inventory.gear.length} PIECE${view.inventory.gear.length === 1 ? "" : "S"}`, 111, 183);
    this.ctx.fillStyle = view.inventory.gear.length > 0 ? "#d5b5ff" : "#778397";
    this.ctx.fillText(view.inventory.gear.length > 0 ? "A · CHOOSE / EQUIP" : "NO STORED EQUIPMENT", 111, 195);
  }

  private drawMemberTitle(member: PartyMemberProgress): void {
    this.ctx.fillStyle = "#78e0c2";
    this.ctx.font = "bold 9px monospace";
    this.ctx.fillText(member.name, 111, 65);
    this.ctx.fillStyle = "#8392a9";
    this.ctx.font = "7px monospace";
    this.ctx.fillText(member.role, 164, 65);
  }

  private drawFooter(view: FieldMenuView): void {
    this.ctx.fillStyle = "#090e1c";
    this.ctx.fillRect(9, 205, 302, 30);
    this.ctx.strokeStyle = "#526784";
    this.ctx.strokeRect(9.5, 205.5, 301, 29);
    this.ctx.fillStyle = "#dbe4ef";
    this.ctx.font = "7px monospace";
    this.ctx.fillText(this.truncate(view.feedback, 44), 16, 216);
    this.ctx.fillStyle = "#73839a";
    const controls = view.mode === "tech-spells"
      ? "▲▼ TECH  A USE  B BACK"
      : view.mode === "tech-targets"
        ? "▲▼ ALLY  A CAST  B BACK"
      : view.mode === "items"
      ? "▲▼ ITEM  A USE  B BACK"
      : view.mode === "transit-destinations"
        ? "▲▼ VILLAGE  A TRAVEL  B BACK"
      : view.mode === "equip-slots"
        ? "▲▼ SLOT  A OPEN  B BACK"
        : view.mode === "equip-options"
          ? "▲▼ EQUIPMENT  A EQUIP  B BACK"
          : "◀▶ TAB  ▲▼ MEMBER  A ACTION  B CLOSE";
    this.ctx.fillText(controls, view.mode === "browse" ? 65 : 78, 229);
  }

  private labelValue(label: string, value: string, x: number, y: number): void {
    this.ctx.fillStyle = "#728198";
    this.ctx.font = "7px monospace";
    this.ctx.fillText(label, x, y);
    this.ctx.fillStyle = "#dbe4ef";
    this.ctx.fillText(value, x + 67, y);
  }

  private equipmentName(id: EquipmentId | null | undefined): string {
    return id ? EQUIPMENT[id].name : "—";
  }

  private drawBar(x: number, y: number, width: number, ratio: number, color: string): void {
    this.ctx.fillStyle = "#222a3e";
    this.ctx.fillRect(x, y, width, 5);
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, Math.round(width * Math.max(0, Math.min(1, ratio))), 5);
  }

  private drawFrame(x: number, y: number, width: number, height: number): void {
    this.ctx.strokeStyle = "#8398b5";
    this.ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
    this.ctx.strokeStyle = "#354660";
    this.ctx.strokeRect(x + 3.5, y + 3.5, width - 7, height - 7);
  }

  private wrapText(text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number): void {
    const words = text.split(" ");
    let line = "";
    let lineY = y;
    let lines = 1;
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (this.ctx.measureText(candidate).width > maxWidth && line) {
        this.ctx.fillText(line, x, lineY);
        if (lines >= maxLines) return;
        line = word;
        lineY += lineHeight;
        lines += 1;
      } else line = candidate;
    }
    if (line) this.ctx.fillText(line, x, lineY);
  }

  private truncate(text: string, limit: number): string {
    return text.length <= limit ? text : `${text.slice(0, limit - 1)}…`;
  }

  private drawScanlines(): void {
    this.ctx.fillStyle = "rgba(3, 7, 16, .06)";
    for (let y = 0; y < HEIGHT; y += 2) this.ctx.fillRect(0, y, WIDTH, 1);
  }
}
