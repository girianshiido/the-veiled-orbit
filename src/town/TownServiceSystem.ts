import type { InputManager } from "../core/InputManager";
import { canEquip, EQUIPMENT, effectiveStats } from "../progression/equipmentData.ts";
import { experienceForNextLevel } from "../progression/levelData.ts";
import type {
  EquipmentId,
  Interaction,
  InteractionKind,
  InventoryState,
  PartyMemberProgress,
  PartyState,
} from "../types/game";

type ServiceMode = "main" | "buy" | "sell" | "target" | "slots" | "party" | "companions" | "profiles" | "revive";

interface ServiceChoiceInternal {
  label: string;
  price: number | null;
  action: string;
  itemId?: EquipmentId;
}

export interface TownServiceChoice {
  label: string;
  price: number | null;
}

export interface TownServiceView {
  title: string;
  description: string;
  choices: readonly TownServiceChoice[];
  selectedChoice: number;
  credits: number;
  feedback: string;
  mode: ServiceMode;
  serviceKind: InteractionKind;
  portraitLabel: string;
  identity: TownIdentityView | null;
}

export interface TownIdentityView {
  id: PartyMemberProgress["id"];
  name: string;
  role: string;
  description: string;
  active: boolean;
  level: number;
  experience: number;
  nextLevel: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  agility: number;
}

const IDENTITY_DESCRIPTIONS: Record<PartyMemberProgress["id"], string> = {
  ash: "A young pathfinder from Lumen Hollow. He follows the signal that awakened beneath the old roads.",
  ione: "An Archive adept who reads memory echoes and restores allies through disciplined resonance magic.",
  nox: "A swift bridge scout who knows the southern routes, unstable crossings and storm-beaten frontiers.",
  sera: "Tideglass's agile warden. Her returning discs sweep enemy groups while current magic controls the pace of battle.",
};

const BASE_WEAPON_STOCK: readonly EquipmentId[] = ["pulse-saber", "ion-whip"];
const BASE_ARMOR_STOCK: readonly EquipmentId[] = ["guard-plate", "signal-shield"];
const VESPER_WEAPON_STOCK: readonly EquipmentId[] = ["starforged-saber", "resonance-lash", "arc-carbine"];
const VESPER_ARMOR_STOCK: readonly EquipmentId[] = ["frontier-mail", "phase-weave", "storm-shield"];
const TIDEGLASS_WEAPON_STOCK: readonly EquipmentId[] = ["tidebreaker-saber", "mooncurrent-lash", "harbor-carbine", "harbor-disc"];
const TIDEGLASS_ARMOR_STOCK: readonly EquipmentId[] = ["pelagic-mail", "current-weave", "tidal-jacket", "deepwater-aegis"];
const CAIRN_WEAPON_STOCK: readonly EquipmentId[] = ["tidebreaker-saber", "mooncurrent-lash", "harbor-carbine", "meridian-disc"];
const CAIRN_ARMOR_STOCK: readonly EquipmentId[] = ["pelagic-mail", "current-weave", "tidal-jacket", "meridian-guard"];
const RETURN_BEACON_SELL_PRICE = 9;
const TRANSIT_BEACON_SELL_PRICE = 24;
const REVIVAL_COST_PER_LEVEL = 15;
export const revivalCost = (level: number, rate = REVIVAL_COST_PER_LEVEL): number => (
  Math.max(1, Math.floor(level)) * Math.max(1, Math.floor(rate))
);
const SERVICE_KINDS = new Set<InteractionKind>([
  "inn",
  "item-shop",
  "weapon-shop",
  "armor-shop",
  "save-shop",
  "revival-shop",
  "teleport",
  "party-house",
]);

export class TownServiceSystem {
  private readonly input: InputManager;
  private readonly onChange: () => void;
  private readonly onSave: (slot: number) => boolean;
  private readonly onTravel: (mapId: string) => void;
  private readonly onClose: (interaction: Interaction) => void;
  private readonly onReadSave: (slot: number) => number | null;
  private interaction: Interaction | null = null;
  private party: PartyState | null = null;
  private inventory: InventoryState | null = null;
  private worldFlags: ReadonlySet<string> = new Set();
  private selectedChoice = 0;
  private mode: ServiceMode = "main";
  private pendingItem: EquipmentId | null = null;
  private pendingPrice = 0;
  private feedback = "";

  constructor(
    input: InputManager,
    onChange: () => void,
    onSave: (slot: number) => boolean = () => false,
    onTravel: (mapId: string) => void = () => undefined,
    onClose: (interaction: Interaction) => void = () => undefined,
    onReadSave: (slot: number) => number | null = () => null,
  ) {
    this.input = input;
    this.onChange = onChange;
    this.onSave = onSave;
    this.onTravel = onTravel;
    this.onClose = onClose;
    this.onReadSave = onReadSave;
  }

  public get active(): boolean {
    return this.interaction !== null;
  }

  public open(
    interaction: Interaction,
    party: PartyState,
    inventory: InventoryState,
    worldFlags: ReadonlySet<string> = new Set(),
  ): void {
    if (!SERVICE_KINDS.has(interaction.kind)) return;
    this.input.clearPresses();
    this.interaction = interaction;
    this.party = party;
    this.inventory = inventory;
    this.worldFlags = worldFlags;
    this.mode = "main";
    this.pendingItem = null;
    this.pendingPrice = 0;
    this.selectedChoice = 0;
    this.feedback = this.greeting(interaction.kind);
  }

  public update(): void {
    if (!this.interaction || !this.inventory) return;
    if (this.input.consumePress("menu")) {
      if (this.mode === "main") this.close();
      else this.returnToMain();
      return;
    }
    const choices = this.choices();
    if (this.input.consumePress("up")) {
      this.selectedChoice = (this.selectedChoice - 1 + choices.length) % choices.length;
    }
    if (this.input.consumePress("down")) {
      this.selectedChoice = (this.selectedChoice + 1) % choices.length;
    }
    if (!this.input.consumePress("confirm")) return;
    const choice = choices[this.selectedChoice];
    if (!choice) return;
    if (this.mode === "main") this.confirmMain(choice.action);
    else if (this.mode === "buy") this.confirmBuy(choice);
    else if (this.mode === "sell") this.confirmSell(choice);
    else if (this.mode === "target") this.confirmTarget(choice.action);
    else if (this.mode === "slots") this.confirmSlot(choice.action);
    else if (this.mode === "party") this.confirmParty(choice.action);
    else if (this.mode === "companions") this.confirmCompanion(choice.action);
    else if (this.mode === "profiles") this.confirmProfile(choice.action);
    else this.confirmRevive(choice.action);
  }

  public view(): TownServiceView | null {
    if (!this.interaction || !this.inventory) return null;
    const identity = this.selectedIdentity();
    return {
      title: this.title(this.interaction.kind),
      description: this.interaction.text,
      choices: this.choices(),
      selectedChoice: this.selectedChoice,
      credits: this.inventory.credits,
      feedback: this.feedback,
      mode: this.mode,
      serviceKind: this.interaction.kind,
      portraitLabel: this.portraitLabel(this.interaction.kind),
      identity,
    };
  }

  private confirmMain(action: string): void {
    if (action === "goodbye") {
      this.close();
      return;
    }
    if (action === "talk-party") {
      this.mode = "companions";
      this.selectedChoice = 0;
      this.feedback = "Choose a companion.";
      return;
    }
    if (action === "profiles") {
      this.mode = "profiles";
      this.selectedChoice = 0;
      this.feedback = "Choose a recruited identity record.";
      return;
    }
    if (action === "form-party") {
      this.mode = "party";
      this.selectedChoice = 0;
      this.feedback = "Ash must remain. Up to four may travel.";
      return;
    }
    if (action === "talk") {
      this.feedback = this.talkText();
      return;
    }
    if (action === "buy" || action === "sell") {
      this.mode = action;
      this.selectedChoice = 0;
      this.feedback = action === "buy" ? "Choose an item." : "Choose something from storage.";
      return;
    }
    if (action === "rest") {
      this.rest();
      return;
    }
    if (action === "save") {
      this.mode = "slots";
      this.selectedChoice = 0;
      this.feedback = "Choose a memory slot.";
      return;
    }
    if (action === "revive") {
      this.mode = "revive";
      this.selectedChoice = 0;
      this.feedback = this.deadMembers().length > 0
        ? "Choose a lost signal to restore."
        : "No party signals are lost.";
      return;
    }
    if (!action.startsWith("travel:")) return;
    const destination = this.transitDestinations().find((candidate) => candidate.mapId === action.slice(7));
    if (!destination) {
      this.feedback = "No other village is linked to this gate yet.";
      return;
    }
    if (!this.inventory || this.inventory.credits < this.interaction!.price) {
      this.feedback = "Not enough CREDITS.";
      return;
    }
    this.inventory.credits -= this.interaction!.price;
    this.onChange();
    this.close();
    this.onTravel(destination.mapId);
  }

  private confirmBuy(choice: ServiceChoiceInternal): void {
    if (choice.action === "back") {
      this.returnToMain();
      return;
    }
    if (!this.inventory || !this.interaction) return;
    if (this.inventory.credits < (choice.price ?? 0)) {
      this.feedback = "Not enough CREDITS.";
      return;
    }
    if (choice.action === "buy-tonic") {
      this.inventory.credits -= choice.price ?? 0;
      this.inventory.tonics += 1;
      this.feedback = "Acquired 1 FIELD TONIC.";
      this.onChange();
      return;
    }
    if (choice.action === "buy-return-beacon") {
      this.inventory.credits -= choice.price ?? 0;
      this.inventory.returnBeacons += 1;
      this.feedback = "Acquired 1 RETURN BEACON.";
      this.onChange();
      return;
    }
    if (choice.action === "buy-transit-beacon") {
      this.inventory.credits -= choice.price ?? 0;
      this.inventory.transitBeacons += 1;
      this.feedback = "Acquired 1 TRANSIT BEACON.";
      this.onChange();
      return;
    }
    if (!choice.itemId) return;
    this.pendingItem = choice.itemId;
    this.pendingPrice = choice.price ?? EQUIPMENT[choice.itemId].price;
    this.mode = "target";
    this.selectedChoice = 0;
    this.feedback = `Who will equip ${EQUIPMENT[choice.itemId].name}?`;
  }

  private confirmTarget(memberId: string): void {
    if (!this.pendingItem || !this.inventory) return;
    if (memberId === "back") {
      this.mode = "buy";
      this.selectedChoice = 0;
      this.pendingItem = null;
      this.pendingPrice = 0;
      return;
    }
    const item = EQUIPMENT[this.pendingItem];
    const price = this.pendingPrice || item.price;
    if (memberId === "storage") {
      if (this.inventory.credits < price) return;
      this.inventory.credits -= price;
      this.inventory.gear.push(item.id);
      this.feedback = `${item.name} was placed in storage.`;
      this.pendingItem = null;
      this.pendingPrice = 0;
      this.mode = "main";
      this.selectedChoice = 0;
      this.onChange();
      return;
    }
    const member = this.activeMembers().find((candidate) => candidate.id === memberId);
    if (!member || !canEquip(member.id, item.id) || this.inventory.credits < price) return;
    const previous = member.equipment[item.slot];
    if (previous) this.inventory.gear.push(previous);
    member.equipment[item.slot] = item.id;
    this.inventory.credits -= price;
    this.feedback = `${member.name} equipped ${item.name}.`;
    this.pendingItem = null;
    this.pendingPrice = 0;
    this.mode = "main";
    this.selectedChoice = 0;
    this.onChange();
  }

  private confirmSlot(action: string): void {
    if (action === "back") {
      this.returnToMain();
      return;
    }
    const slot = Number(action.replace("slot-", ""));
    if (!Number.isInteger(slot)) return;
    if (!this.onSave(slot)) {
      this.feedback = "Saving is disabled in this debug session.";
      return;
    }
    const timestamp = this.onReadSave(slot) ?? Date.now();
    this.feedback = `SLOT ${slot} RECORDED · ${this.formatFullTimestamp(timestamp)}`;
  }

  private confirmParty(action: string): void {
    if (!this.party) return;
    if (action === "back") {
      this.returnToMain();
      return;
    }
    const member = this.party.roster.find((candidate) => candidate.id === action);
    if (!member) return;
    if (member.id === "ash") {
      this.feedback = "Ash must remain in the active party.";
      return;
    }
    const index = this.party.activeMemberIds.indexOf(member.id);
    if (index >= 0) {
      this.party.activeMemberIds.splice(index, 1);
      this.feedback = `${member.name} will remain at Ash's house.`;
      this.onChange();
      return;
    }
    if (this.party.activeMemberIds.length >= 4) {
      this.feedback = "The active party is already full.";
      return;
    }
    this.party.activeMemberIds.push(member.id);
    this.feedback = `${member.name} joined the active party.`;
    this.onChange();
  }

  private confirmCompanion(action: string): void {
    if (action === "back") {
      this.returnToMain();
      return;
    }
    const member = this.party?.roster.find((candidate) => candidate.id === action);
    if (!member) return;
    this.feedback = member.id === "ione"
      ? "Ione: The Archive signal is clearer from here."
      : member.id === "nox"
        ? "Nox: Say the word when you need a fast route south."
        : `${member.name}: We should prepare before leaving.`;
  }

  private confirmProfile(action: string): void {
    if (action === "back") {
      this.returnToMain();
      return;
    }
    const member = this.party?.roster.find((candidate) => candidate.id === action);
    if (member) this.feedback = `${member.name}'s current identity record.`;
  }

  private confirmRevive(action: string): void {
    if (action === "back") {
      this.returnToMain();
      return;
    }
    if (!this.party || !this.inventory || !action.startsWith("revive:")) return;
    const member = this.party.roster.find((candidate) => candidate.id === action.slice(7));
    if (!member || member.hp > 0) {
      this.feedback = "That signal is already stable.";
      return;
    }
    const cost = revivalCost(member.level, this.interaction?.price || REVIVAL_COST_PER_LEVEL);
    if (this.inventory.credits < cost) {
      this.feedback = `Restoring ${member.name} requires ${cost} CREDITS.`;
      return;
    }
    this.inventory.credits -= cost;
    member.hp = member.maxHp;
    this.selectedChoice = 0;
    this.feedback = `${member.name}'s signal has been restored.`;
    this.onChange();
  }

  private confirmSell(choice: ServiceChoiceInternal): void {
    if (!this.inventory || !this.interaction) return;
    if (choice.action === "back") {
      this.returnToMain();
      return;
    }
    if (choice.action === "sell-tonic") {
      if (this.inventory.tonics <= 0) return;
      this.inventory.tonics -= 1;
      this.inventory.credits += 4;
      this.feedback = "Sold 1 FIELD TONIC for 4 CREDITS.";
      this.onChange();
      return;
    }
    if (choice.action === "sell-return-beacon") {
      if (this.inventory.returnBeacons <= 0) return;
      this.inventory.returnBeacons -= 1;
      this.inventory.credits += RETURN_BEACON_SELL_PRICE;
      this.feedback = `Sold 1 RETURN BEACON for ${RETURN_BEACON_SELL_PRICE} CREDITS.`;
      this.onChange();
      return;
    }
    if (choice.action === "sell-transit-beacon") {
      if (this.inventory.transitBeacons <= 0) return;
      this.inventory.transitBeacons -= 1;
      this.inventory.credits += TRANSIT_BEACON_SELL_PRICE;
      this.feedback = `Sold 1 TRANSIT BEACON for ${TRANSIT_BEACON_SELL_PRICE} CREDITS.`;
      this.onChange();
      return;
    }
    if (!choice.itemId) return;
    const index = this.inventory.gear.indexOf(choice.itemId);
    if (index < 0) return;
    const value = Math.max(1, Math.floor(EQUIPMENT[choice.itemId].price / 2));
    this.inventory.gear.splice(index, 1);
    this.inventory.credits += value;
    this.feedback = `Sold ${EQUIPMENT[choice.itemId].name} for ${value} CREDITS.`;
    this.onChange();
    this.selectedChoice = 0;
  }

  private rest(): void {
    if (!this.interaction || !this.inventory || !this.party) return;
    if (this.inventory.credits < this.interaction.price) {
      this.feedback = "Not enough CREDITS.";
      return;
    }
    const members = this.activeMembers().filter((member) => member.hp > 0);
    if (members.length === 0) {
      this.feedback = "Lost signals require a REGENERATION CLINIC.";
      return;
    }
    if (members.every((member) => member.hp === member.maxHp && member.mp === member.maxMp)) {
      this.feedback = this.deadMembers().length > 0
        ? "Living members are well. Lost signals need the clinic."
        : "The party is already fully restored.";
      return;
    }
    this.inventory.credits -= this.interaction.price;
    members.forEach((member) => {
      member.hp = member.maxHp;
      member.mp = member.maxMp;
    });
    this.feedback = "The resonance beds restored the party.";
    this.onChange();
  }

  private choices(): ServiceChoiceInternal[] {
    if (!this.interaction) return [];
    if (this.mode === "buy") return this.buyChoices();
    if (this.mode === "sell") return this.sellChoices();
    if (this.mode === "target") return [
      ...this.activeMembers()
        .filter((member) => !this.pendingItem || canEquip(member.id, this.pendingItem))
        .map((member) => ({ label: member.name, price: null, action: member.id })),
      { label: "STORE ONLY", price: null, action: "storage" },
      { label: "BACK", price: null, action: "back" },
    ];
    if (this.mode === "slots") return [
      ...[1, 2, 3].map((slot) => ({ label: this.slotLabel(slot), price: null, action: `slot-${slot}` })),
      { label: "BACK", price: null, action: "back" },
    ];
    if (this.mode === "party") return [
      ...this.party!.roster.map((member) => ({
        label: `${member.name} · ${member.id === "ash" ? "LOCKED" : this.party!.activeMemberIds.includes(member.id) ? "ACTIVE" : "WAITING"}`,
        price: null,
        action: member.id,
      })),
      { label: "DONE", price: null, action: "back" },
    ];
    if (this.mode === "companions") return [
      ...this.party!.roster.filter((member) => member.id !== "ash").map((member) => ({
        label: member.name,
        price: null,
        action: member.id,
      })),
      { label: "BACK", price: null, action: "back" },
    ];
    if (this.mode === "profiles") return [
      ...this.party!.roster.map((member) => ({
        label: member.name,
        price: null,
        action: member.id,
      })),
      { label: "BACK", price: null, action: "back" },
    ];
    if (this.mode === "revive") return [
      ...this.deadMembers().map((member) => ({
        label: `RESTORE ${member.name}`,
        price: revivalCost(member.level, this.interaction?.price || REVIVAL_COST_PER_LEVEL),
        action: `revive:${member.id}`,
      })),
      { label: "BACK", price: null, action: "back" },
    ];
    if (this.interaction.kind === "inn") return [
      { label: "REST", price: this.interaction.price, action: "rest" },
      { label: "TALK", price: null, action: "talk" },
      { label: "GOOD BYE", price: null, action: "goodbye" },
    ];
    if (this.interaction.kind === "save-shop") return [
      { label: "SAVE", price: 0, action: "save" },
      { label: "TALK", price: null, action: "talk" },
      { label: "GOOD BYE", price: null, action: "goodbye" },
    ];
    if (this.interaction.kind === "revival-shop") return [
      { label: "RESTORE SIGNAL", price: null, action: "revive" },
      { label: "TALK", price: null, action: "talk" },
      { label: "GOOD BYE", price: null, action: "goodbye" },
    ];
    if (this.interaction.kind === "teleport") return [
      ...this.transitDestinations().map((destination) => ({
        label: `TO ${destination.name}`,
        price: this.interaction!.price,
        action: `travel:${destination.mapId}`,
      })),
      { label: "TALK", price: null, action: "talk" },
      { label: "GOOD BYE", price: null, action: "goodbye" },
    ];
    if (this.interaction.kind === "party-house") return [
      { label: "IDENTITY FILES", price: null, action: "profiles" },
      { label: "TALK", price: null, action: "talk-party" },
      { label: "FORM PARTY", price: null, action: "form-party" },
      { label: "GOOD BYE", price: null, action: "goodbye" },
    ];
    return [
      { label: "BUY", price: null, action: "buy" },
      { label: "SELL", price: null, action: "sell" },
      { label: "TALK", price: null, action: "talk" },
      { label: "GOOD BYE", price: null, action: "goodbye" },
    ];
  }

  private buyChoices(): ServiceChoiceInternal[] {
    if (!this.interaction) return [];
    if (this.interaction.kind === "item-shop") return [
      { label: "FIELD TONIC", price: this.interaction.price, action: "buy-tonic" },
      { label: "RETURN BEACON", price: this.returnBeaconPrice(), action: "buy-return-beacon" },
      { label: "TRANSIT BEACON", price: this.transitBeaconPrice(), action: "buy-transit-beacon" },
      { label: "BACK", price: null, action: "back" },
    ];
    const stock = this.equipmentStock();
    return [
      ...stock.map((itemId) => ({ label: EQUIPMENT[itemId].name, price: this.equipmentPrice(itemId), action: "buy-gear", itemId })),
      { label: "BACK", price: null, action: "back" },
    ];
  }

  private sellChoices(): ServiceChoiceInternal[] {
    if (!this.interaction || !this.inventory) return [];
    if (this.interaction.kind === "item-shop") return [
      ...(this.inventory.tonics > 0
        ? [{ label: `FIELD TONIC ×${this.inventory.tonics}`, price: 4, action: "sell-tonic" }]
        : []),
      ...(this.inventory.returnBeacons > 0
        ? [{ label: `RETURN BEACON ×${this.inventory.returnBeacons}`, price: RETURN_BEACON_SELL_PRICE, action: "sell-return-beacon" }]
        : []),
      ...(this.inventory.transitBeacons > 0
        ? [{ label: `TRANSIT BEACON ×${this.inventory.transitBeacons}`, price: TRANSIT_BEACON_SELL_PRICE, action: "sell-transit-beacon" }]
        : []),
      { label: "BACK", price: null, action: "back" },
    ];
    const allowedSlots = this.interaction.kind === "weapon-shop" ? new Set(["weapon"]) : new Set(["armor", "shield"]);
    const items = this.inventory.gear.filter((itemId) => allowedSlots.has(EQUIPMENT[itemId].slot));
    return [
      ...items.map((itemId) => ({
        label: EQUIPMENT[itemId].name,
        price: Math.max(1, Math.floor(EQUIPMENT[itemId].price / 2)),
        action: "sell-gear",
        itemId,
      })),
      { label: "BACK", price: null, action: "back" },
    ];
  }

  private title(kind: InteractionKind): string {
    if (kind === "weapon-shop") return "WEAPON SHOP";
    if (kind === "armor-shop") return "ARMOR & SHIELD SHOP";
    if (kind === "item-shop") return "ITEM SHOP";
    if (kind === "save-shop") return "MEMORY COUNTER";
    if (kind === "revival-shop") return "REGENERATION CLINIC";
    if (kind === "teleport") return "TRANSIT GATE";
    if (kind === "party-house") return "ASH'S HOUSE";
    return "HOLLOW INN";
  }

  private greeting(kind: InteractionKind): string {
    if (kind === "save-shop") return "Recording a journey is free.";
    if (kind === "revival-shop") return "Lost party signals can be restored here.";
    if (kind === "teleport") return "Registered villages can share this gate.";
    if (kind === "party-house") return "The recruited team gathers here.";
    if (kind === "inn") return "Restores all active party HP and MP.";
    return "Welcome. Take your time.";
  }

  private talkText(): string {
    if (!this.interaction) return "";
    if (this.interaction.kind === "weapon-shop") return "A tuned weapon breaks hostile signals cleanly.";
    if (this.interaction.kind === "armor-shop") return "A shield is often worth more than a faster strike.";
    if (this.interaction.kind === "save-shop") return "Your memory will wait here until you return.";
    if (this.interaction.kind === "revival-shop") return `Restoration costs ${this.interaction.price || REVIVAL_COST_PER_LEVEL} CREDITS per level.`;
    if (this.interaction.kind === "teleport") return this.transitDestinations().length > 0
      ? "The remote beacon is registered and ready."
      : "Only villages reached on foot can be registered here.";
    if (this.interaction.kind === "party-house") return "Everyone not travelling waits here between routes.";
    if (this.interaction.kind === "inn") return "The beds were built for travellers crossing the glass storms.";
    return "Return Beacons escape labyrinths. Transit Beacons reach visited villages from the open world.";
  }

  private activeMembers(): PartyMemberProgress[] {
    if (!this.party) return [];
    return this.party.activeMemberIds
      .map((id) => this.party?.roster.find((member) => member.id === id))
      .filter((member): member is PartyMemberProgress => !!member);
  }

  private equipmentStock(): readonly EquipmentId[] {
    if (!this.interaction) return [];
    const vesper = this.interaction.name.startsWith("vesper-");
    const tideglass = this.interaction.name.startsWith("tideglass-");
    const cairn = this.interaction.name.startsWith("cairn-");
    if (cairn) return this.interaction.kind === "weapon-shop" ? CAIRN_WEAPON_STOCK : CAIRN_ARMOR_STOCK;
    if (tideglass) return this.interaction.kind === "weapon-shop" ? TIDEGLASS_WEAPON_STOCK : TIDEGLASS_ARMOR_STOCK;
    if (this.interaction.kind === "weapon-shop") return vesper ? VESPER_WEAPON_STOCK : BASE_WEAPON_STOCK;
    return vesper ? VESPER_ARMOR_STOCK : BASE_ARMOR_STOCK;
  }

  private equipmentPrice(itemId: EquipmentId): number {
    if (this.interaction?.name.startsWith("cairn-")) return Math.ceil(EQUIPMENT[itemId].price * 1.15);
    if (!this.interaction?.name.startsWith("aster-")) return EQUIPMENT[itemId].price;
    return Math.ceil(EQUIPMENT[itemId].price * 1.25);
  }

  private returnBeaconPrice(): number {
    return Math.max(18, Math.round((this.interaction?.price ?? 8) * 2.25));
  }

  private transitBeaconPrice(): number {
    return Math.max(48, Math.round((this.interaction?.price ?? 8) * 6));
  }

  private deadMembers(): PartyMemberProgress[] {
    return this.party?.roster.filter((member) => member.hp <= 0) ?? [];
  }

  private selectedIdentity(): TownIdentityView | null {
    if (this.mode !== "profiles" || !this.party) return null;
    const choice = this.choices()[this.selectedChoice];
    const member = this.party.roster.find((candidate) => candidate.id === choice?.action);
    if (!member) return null;
    const stats = effectiveStats(member);
    return {
      id: member.id,
      name: member.name,
      role: member.role,
      description: IDENTITY_DESCRIPTIONS[member.id],
      active: this.party.activeMemberIds.includes(member.id),
      level: member.level,
      experience: member.experience,
      nextLevel: experienceForNextLevel(member.level),
      hp: member.hp,
      maxHp: member.maxHp,
      mp: member.mp,
      maxMp: member.maxMp,
      attack: stats.attack,
      defense: stats.defense,
      agility: stats.agility,
    };
  }

  private portraitLabel(kind: InteractionKind): string {
    if (kind === "party-house") return "HOME ARCHIVE";
    if (kind === "save-shop") return "MEMORY KEEPER";
    if (kind === "revival-shop") return "CLINICIAN";
    if (kind === "teleport") return "GATE OPERATOR";
    if (kind === "inn") return "INNKEEPER";
    if (kind === "weapon-shop") return "WEAPONSMITH";
    if (kind === "armor-shop") return "ARMORER";
    return "SUPPLY KEEPER";
  }

  private transitDestinations(): Array<{ mapId: string; name: string; requiredFlag: string }> {
    if (!this.interaction || this.interaction.kind !== "teleport") return [];
    const mapIds = this.interaction.destinationMap.split(",").map((value) => value.trim()).filter(Boolean);
    const names = this.interaction.destinationName.split("|").map((value) => value.trim());
    const requiredFlags = this.interaction.requiredFlag.split("|").map((value) => value.trim());
    const configured = mapIds.map((mapId, index) => ({
      mapId,
      name: names[index] || mapId.toUpperCase(),
      requiredFlag: requiredFlags[index] ?? "",
    }));
    // Older village map files predate the southern beacon. Once Tideglass has
    // been reached on foot, every existing gate can discover that new signal.
    const tideglass = { mapId: "tideglass-harbor", name: "TIDEGLASS HARBOR", requiredFlag: "village.tideglass-harbor.visited" };
    const cairn = { mapId: "cairn-meridian", name: "CAIRN MERIDIAN", requiredFlag: "village.cairn-meridian.visited" };
    const skyglass = { mapId: "skyglass-relay", name: "SKYGLASS RELAY", requiredFlag: "village.skyglass-relay.visited" };
    const currentVillage = this.interaction.name.startsWith("tideglass-")
      ? tideglass.mapId
      : this.interaction.name.startsWith("cairn-") ? cairn.mapId
      : this.interaction.name.startsWith("skyglass-") ? skyglass.mapId : "";
    const unique = new Map([...configured, tideglass, cairn, skyglass].map((destination) => [destination.mapId, destination]));
    return [...unique.values()].filter((destination) => destination.mapId !== currentVillage
      && (!destination.requiredFlag || this.worldFlags.has(destination.requiredFlag)));
  }

  private slotLabel(slot: number): string {
    const timestamp = this.onReadSave(slot);
    return timestamp === null
      ? `SLOT ${slot}  EMPTY`
      : `SLOT ${slot}  ${this.formatShortTimestamp(timestamp)}`;
  }

  private formatShortTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return `${this.pad(date.getDate())}/${this.pad(date.getMonth() + 1)} ${this.pad(date.getHours())}:${this.pad(date.getMinutes())}`;
  }

  private formatFullTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return `${this.pad(date.getDate())}/${this.pad(date.getMonth() + 1)}/${date.getFullYear()} ${this.pad(date.getHours())}:${this.pad(date.getMinutes())}:${this.pad(date.getSeconds())}`;
  }

  private pad(value: number): string {
    return String(value).padStart(2, "0");
  }

  private returnToMain(): void {
    this.mode = "main";
    this.pendingItem = null;
    this.pendingPrice = 0;
    this.selectedChoice = 0;
    this.feedback = "What do you need?";
  }

  private close(): void {
    const interaction = this.interaction;
    this.interaction = null;
    this.party = null;
    this.inventory = null;
    this.worldFlags = new Set();
    this.pendingItem = null;
    this.pendingPrice = 0;
    if (interaction) this.onClose(interaction);
  }
}
