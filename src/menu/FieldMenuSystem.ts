import type { InputManager } from "../core/InputManager";
import { canEquip, EQUIPMENT } from "../progression/equipmentData.ts";
import { SPELLS } from "../progression/spellData.ts";
import type {
  EquipmentId,
  EquipmentLoadout,
  InventoryState,
  PartyMemberProgress,
  PartyState,
  SpellId,
} from "../types/game";

export type FieldMenuTab = "STATUS" | "TECH" | "ITEMS" | "EQUIP";
export type FieldMenuMode = "browse" | "tech-spells" | "tech-targets" | "items" | "transit-destinations" | "equip-slots" | "equip-options";
export type EquipmentSlot = keyof EquipmentLoadout;

export interface FieldItemChoice {
  id: "field-tonic" | "return-beacon" | "transit-beacon";
  label: string;
  count: number;
  description: string;
}

export interface FieldTransitChoice {
  mapId: string;
  name: string;
}

export interface FieldSpellChoice {
  id: SpellId;
  label: string;
  cost: number;
  description: string;
  usableInField: boolean;
}

export interface EquipmentMenuChoice {
  equipmentId: EquipmentId | null;
  label: string;
  action: "current" | "storage" | "remove";
}

export interface FieldMenuView {
  tabs: readonly FieldMenuTab[];
  selectedTab: number;
  members: readonly PartyMemberProgress[];
  selectedMember: number;
  inventory: InventoryState;
  feedback: string;
  mode: FieldMenuMode;
  spells: readonly FieldSpellChoice[];
  selectedSpell: number;
  selectedSpellTarget: number;
  items: readonly FieldItemChoice[];
  selectedItem: number;
  transitDestinations: readonly FieldTransitChoice[];
  selectedTransitDestination: number;
  equipmentSlots: readonly EquipmentSlot[];
  selectedEquipmentSlot: number;
  equipmentOptions: readonly EquipmentMenuChoice[];
  selectedEquipmentOption: number;
}

const TABS: readonly FieldMenuTab[] = ["STATUS", "TECH", "ITEMS", "EQUIP"];
const EQUIPMENT_SLOTS: readonly EquipmentSlot[] = ["weapon", "armor", "shield", "core"];

export class FieldMenuSystem {
  private readonly input: InputManager;
  private readonly onChange: () => void;
  private readonly onEscapeLabyrinth: () => boolean;
  private party: PartyState | null = null;
  private inventory: InventoryState | null = null;
  private selectedTab = 0;
  private selectedMember = 0;
  private mode: FieldMenuMode = "browse";
  private selectedItem = 0;
  private selectedSpell = 0;
  private selectedSpellTarget = 0;
  private selectedTransitDestination = 0;
  private selectedEquipmentSlot = 0;
  private selectedEquipmentOption = 0;
  private feedback = "";
  private readonly availableTransitDestinations: () => readonly FieldTransitChoice[];
  private readonly onTransit: (mapId: string) => boolean;

  constructor(
    input: InputManager,
    onChange: () => void,
    onEscapeLabyrinth: () => boolean = () => false,
    availableTransitDestinations: () => readonly FieldTransitChoice[] = () => [],
    onTransit: (mapId: string) => boolean = () => false,
  ) {
    this.input = input;
    this.onChange = onChange;
    this.onEscapeLabyrinth = onEscapeLabyrinth;
    this.availableTransitDestinations = availableTransitDestinations;
    this.onTransit = onTransit;
  }

  public get active(): boolean {
    return this.party !== null && this.inventory !== null;
  }

  public open(party: PartyState, inventory: InventoryState): void {
    this.input.clearPresses();
    this.party = party;
    this.inventory = inventory;
    this.selectedTab = 0;
    this.selectedMember = 0;
    this.mode = "browse";
    this.selectedItem = 0;
    this.selectedSpell = 0;
    this.selectedSpellTarget = 0;
    this.selectedTransitDestination = 0;
    this.selectedEquipmentSlot = 0;
    this.selectedEquipmentOption = 0;
    this.feedback = "Review the pathfinder team.";
  }

  public update(): void {
    if (!this.party || !this.inventory) return;
    if (this.input.consumePress("menu")) {
      this.back();
      return;
    }
    if (this.mode === "browse") this.updateBrowse();
    else if (this.mode === "tech-spells") this.updateTechSpells();
    else if (this.mode === "tech-targets") this.updateTechTargets();
    else if (this.mode === "items") this.updateItems();
    else if (this.mode === "transit-destinations") this.updateTransitDestinations();
    else if (this.mode === "equip-slots") this.updateEquipmentSlots();
    else this.updateEquipmentOptions();
  }

  public view(): FieldMenuView | null {
    if (!this.party || !this.inventory) return null;
    return {
      tabs: TABS,
      selectedTab: this.selectedTab,
      members: this.activeMembers(),
      selectedMember: this.selectedMember,
      inventory: this.inventory,
      feedback: this.feedback,
      mode: this.mode,
      spells: this.spellChoices(),
      selectedSpell: this.selectedSpell,
      selectedSpellTarget: this.selectedSpellTarget,
      items: this.itemChoices(),
      selectedItem: this.selectedItem,
      transitDestinations: this.availableTransitDestinations(),
      selectedTransitDestination: this.selectedTransitDestination,
      equipmentSlots: EQUIPMENT_SLOTS,
      selectedEquipmentSlot: this.selectedEquipmentSlot,
      equipmentOptions: this.equipmentChoices(),
      selectedEquipmentOption: this.selectedEquipmentOption,
    };
  }

  private updateBrowse(): void {
    if (this.input.consumePress("left")) this.changeTab(-1);
    if (this.input.consumePress("right")) this.changeTab(1);
    if (this.input.consumePress("up")) this.changeMember(-1);
    if (this.input.consumePress("down")) this.changeMember(1);
    if (this.input.consumePress("confirm")) this.confirmBrowse();
  }

  private updateItems(): void {
    const count = this.itemChoices().length;
    if (this.input.consumePress("up")) this.selectedItem = (this.selectedItem - 1 + count) % count;
    if (this.input.consumePress("down")) this.selectedItem = (this.selectedItem + 1) % count;
    if (this.input.consumePress("confirm")) this.useSelectedItem();
  }

  private updateTechSpells(): void {
    const choices = this.spellChoices();
    if (choices.length === 0) return;
    if (this.input.consumePress("up")) this.selectedSpell = (this.selectedSpell - 1 + choices.length) % choices.length;
    if (this.input.consumePress("down")) this.selectedSpell = (this.selectedSpell + 1) % choices.length;
    if (this.input.consumePress("confirm")) this.confirmFieldSpell();
  }

  private updateTechTargets(): void {
    const members = this.activeMembers();
    if (members.length === 0) return;
    if (this.input.consumePress("up")) this.selectedSpellTarget = (this.selectedSpellTarget - 1 + members.length) % members.length;
    if (this.input.consumePress("down")) this.selectedSpellTarget = (this.selectedSpellTarget + 1) % members.length;
    if (this.input.consumePress("confirm")) this.castFieldSpell();
  }

  private updateEquipmentSlots(): void {
    if (this.input.consumePress("up")) {
      this.selectedEquipmentSlot = (this.selectedEquipmentSlot - 1 + EQUIPMENT_SLOTS.length) % EQUIPMENT_SLOTS.length;
    }
    if (this.input.consumePress("down")) {
      this.selectedEquipmentSlot = (this.selectedEquipmentSlot + 1) % EQUIPMENT_SLOTS.length;
    }
    if (this.input.consumePress("confirm")) {
      this.mode = "equip-options";
      this.selectedEquipmentOption = 0;
      this.feedback = `Choose ${this.currentSlot().toUpperCase()} equipment.`;
    }
  }

  private updateTransitDestinations(): void {
    const choices = this.availableTransitDestinations();
    if (choices.length === 0) {
      this.mode = "items";
      this.feedback = "No visited village can answer here.";
      return;
    }
    if (this.input.consumePress("up")) {
      this.selectedTransitDestination = (this.selectedTransitDestination - 1 + choices.length) % choices.length;
    }
    if (this.input.consumePress("down")) {
      this.selectedTransitDestination = (this.selectedTransitDestination + 1) % choices.length;
    }
    if (!this.input.consumePress("confirm")) return;
    const destination = choices[this.selectedTransitDestination];
    if (!destination || !this.inventory || this.inventory.transitBeacons <= 0) return;
    if (!this.onTransit(destination.mapId)) {
      this.feedback = "The TRANSIT BEACON cannot establish a route here.";
      return;
    }
    this.inventory.transitBeacons -= 1;
    this.feedback = `Travelling to ${destination.name}.`;
    this.onChange();
    this.close();
  }

  private updateEquipmentOptions(): void {
    const count = this.equipmentChoices().length;
    if (this.input.consumePress("up")) {
      this.selectedEquipmentOption = (this.selectedEquipmentOption - 1 + count) % count;
    }
    if (this.input.consumePress("down")) {
      this.selectedEquipmentOption = (this.selectedEquipmentOption + 1) % count;
    }
    if (this.input.consumePress("confirm")) this.equipSelectedOption();
  }

  private confirmBrowse(): void {
    const member = this.currentMember();
    if (!member) return;
    const tab = TABS[this.selectedTab];
    if (tab === "ITEMS") {
      this.mode = "items";
      this.selectedItem = 0;
      this.feedback = `Choose an item for ${member.name}.`;
    } else if (tab === "EQUIP") {
      this.mode = "equip-slots";
      this.selectedEquipmentSlot = 0;
      this.feedback = `Choose an equipment slot for ${member.name}.`;
    } else if (tab === "TECH") {
      this.mode = "tech-spells";
      this.selectedSpell = 0;
      this.feedback = `Choose a technique for ${member.name}.`;
    } else {
      this.feedback = `${member.name} · ${member.role}`;
    }
  }

  private confirmFieldSpell(): void {
    const caster = this.currentMember();
    const choice = this.spellChoices()[this.selectedSpell];
    if (!caster || !choice) return;
    const spell = SPELLS[choice.id];
    if (!choice.usableInField) {
      this.feedback = `${spell.name} can only be used in battle.`;
      return;
    }
    if (caster.hp <= 0) {
      this.feedback = `${caster.name} needs a REGENERATION CLINIC.`;
      return;
    }
    if (caster.mp < spell.cost) {
      this.feedback = `${caster.name} needs ${spell.cost} MP.`;
      return;
    }
    if (spell.target === "all-allies") {
      this.castFieldSpell();
      return;
    }
    this.mode = "tech-targets";
    this.selectedSpellTarget = Math.min(this.selectedMember, this.activeMembers().length - 1);
    this.feedback = `Choose an ally for ${spell.name}.`;
  }

  private castFieldSpell(): void {
    const caster = this.currentMember();
    const choice = this.spellChoices()[this.selectedSpell];
    if (!caster || !choice) return;
    const spell = SPELLS[choice.id];
    if (!choice.usableInField || caster.hp <= 0 || caster.mp < spell.cost) return;
    const targets = spell.target === "all-allies"
      ? this.activeMembers().filter((member) => member.hp > 0 && member.hp < member.maxHp)
      : [this.activeMembers()[this.selectedSpellTarget]].filter((member): member is PartyMemberProgress => (
        !!member && member.hp > 0 && member.hp < member.maxHp
      ));
    if (targets.length === 0) {
      this.feedback = spell.target === "all-allies" ? "Everyone is already at full HP." : "That ally cannot receive field healing.";
      return;
    }
    let restored = 0;
    targets.forEach((target) => {
      const amount = Math.min(spell.power, target.maxHp - target.hp);
      target.hp += amount;
      restored += amount;
    });
    caster.mp -= spell.cost;
    this.mode = "tech-spells";
    const targetName = targets[0]?.name ?? "That ally";
    this.feedback = spell.target === "all-allies"
      ? `${spell.name} restored ${restored} HP to the party.`
      : `${targetName} recovered ${restored} HP.`;
    this.onChange();
  }

  private useSelectedItem(): void {
    const member = this.currentMember();
    const item = this.itemChoices()[this.selectedItem];
    if (!member || !item || !this.inventory) return;
    if (item.id === "field-tonic") {
      if (item.count <= 0) {
        this.feedback = "No FIELD TONICS remain.";
        return;
      }
      if (member.hp <= 0) {
        this.feedback = `${member.name} needs a REGENERATION CLINIC.`;
        return;
      }
      if (member.hp >= member.maxHp) {
        this.feedback = `${member.name}'s HP is already full.`;
        return;
      }
      const restored = Math.min(16, member.maxHp - member.hp);
      member.hp += restored;
      this.inventory.tonics -= 1;
      this.feedback = `${member.name} recovered ${restored} HP.`;
      this.onChange();
      return;
    }
    if (item.id === "return-beacon") {
      if (item.count <= 0) {
        this.feedback = "No RETURN BEACONS remain.";
        return;
      }
      if (!this.onEscapeLabyrinth()) {
        this.feedback = "RETURN BEACONS only answer inside a labyrinth.";
        return;
      }
      this.inventory.returnBeacons -= 1;
      this.feedback = "The RETURN BEACON opens a route to the entrance.";
      this.onChange();
      this.close();
      return;
    }
    if (item.id === "transit-beacon") {
      if (item.count <= 0) {
        this.feedback = "No TRANSIT BEACONS remain.";
        return;
      }
      const destinations = this.availableTransitDestinations();
      if (destinations.length === 0) {
        this.feedback = "TRANSIT BEACONS work outside labyrinths and only reach visited villages.";
        return;
      }
      this.mode = "transit-destinations";
      this.selectedTransitDestination = 0;
      this.feedback = "Choose a registered village.";
    }
  }

  private equipSelectedOption(): void {
    const member = this.currentMember();
    const choice = this.equipmentChoices()[this.selectedEquipmentOption];
    if (!member || !choice || !this.inventory) return;
    const slot = this.currentSlot();
    const previous = member.equipment[slot];
    if (choice.action === "current") {
      this.feedback = `${choice.label.replace(" · EQUIPPED", "")} is already equipped.`;
      return;
    }
    if (choice.action === "remove") {
      if (!previous) {
        this.feedback = `${slot.toUpperCase()} is already empty.`;
        return;
      }
      member.equipment[slot] = null;
      this.inventory.gear.push(previous);
      this.feedback = `${member.name} removed ${EQUIPMENT[previous].name}.`;
      this.selectedEquipmentOption = 0;
      this.onChange();
      return;
    }
    const equipmentId = choice.equipmentId;
    if (!equipmentId || !canEquip(member.id, equipmentId) || EQUIPMENT[equipmentId].slot !== slot) return;
    const inventoryIndex = this.inventory.gear.indexOf(equipmentId);
    if (inventoryIndex < 0) {
      this.feedback = `${EQUIPMENT[equipmentId].name} is no longer in storage.`;
      return;
    }
    this.inventory.gear.splice(inventoryIndex, 1);
    if (previous) this.inventory.gear.push(previous);
    member.equipment[slot] = equipmentId;
    this.feedback = `${member.name} equipped ${EQUIPMENT[equipmentId].name}.`;
    this.selectedEquipmentOption = 0;
    this.onChange();
  }

  private itemChoices(): FieldItemChoice[] {
    return [
      {
        id: "field-tonic",
        label: "FIELD TONIC",
        count: this.inventory?.tonics ?? 0,
        description: "Restores 16 HP.",
      },
      {
        id: "return-beacon",
        label: "RETURN BEACON",
        count: this.inventory?.returnBeacons ?? 0,
        description: "Escapes instantly from a labyrinth.",
      },
      {
        id: "transit-beacon",
        label: "TRANSIT BEACON",
        count: this.inventory?.transitBeacons ?? 0,
        description: "Outside labyrinths, travels to a visited village.",
      },
    ];
  }

  private spellChoices(): FieldSpellChoice[] {
    const member = this.currentMember();
    if (!member) return [];
    return member.spells.map((id) => {
      const spell = SPELLS[id];
      return {
        id,
        label: spell.name,
        cost: spell.cost,
        description: spell.description,
        usableInField: spell.kind === "heal" && (spell.target === "ally" || spell.target === "all-allies"),
      };
    });
  }

  private equipmentChoices(): EquipmentMenuChoice[] {
    const member = this.currentMember();
    if (!member || !this.inventory) return [];
    const slot = this.currentSlot();
    const current = member.equipment[slot];
    const choices: EquipmentMenuChoice[] = [];
    if (current) {
      choices.push({ equipmentId: current, label: `${EQUIPMENT[current].name} · EQUIPPED`, action: "current" });
    }
    const compatible = [...new Set(this.inventory.gear.filter((equipmentId) => (
      EQUIPMENT[equipmentId].slot === slot && canEquip(member.id, equipmentId)
    )))];
    compatible.forEach((equipmentId) => {
      const count = this.inventory!.gear.filter((candidate) => candidate === equipmentId).length;
      choices.push({
        equipmentId,
        label: `${EQUIPMENT[equipmentId].name}${count > 1 ? ` ×${count}` : ""}`,
        action: "storage",
      });
    });
    choices.push({ equipmentId: null, label: current ? "REMOVE EQUIPMENT" : "LEAVE EMPTY", action: "remove" });
    return choices;
  }

  private changeTab(direction: -1 | 1): void {
    this.selectedTab = (this.selectedTab + direction + TABS.length) % TABS.length;
    this.feedback = this.defaultFeedback(TABS[this.selectedTab] ?? "STATUS");
  }

  private changeMember(direction: -1 | 1): void {
    const members = this.activeMembers();
    this.selectedMember = (this.selectedMember + direction + members.length) % members.length;
    this.feedback = `${members[this.selectedMember]?.name ?? "PARTY"} selected.`;
  }

  private currentMember(): PartyMemberProgress | undefined {
    return this.activeMembers()[this.selectedMember];
  }

  private currentSlot(): EquipmentSlot {
    return EQUIPMENT_SLOTS[this.selectedEquipmentSlot] ?? "weapon";
  }

  private activeMembers(): PartyMemberProgress[] {
    if (!this.party) return [];
    return this.party.activeMemberIds
      .map((id) => this.party?.roster.find((member) => member.id === id))
      .filter((member): member is PartyMemberProgress => !!member);
  }

  private defaultFeedback(tab: FieldMenuTab): string {
    if (tab === "TECH") return "Review learned techniques.";
    if (tab === "ITEMS") return "Press A to open the item list.";
    if (tab === "EQUIP") return "Press A to choose an equipment slot.";
    return "Review the pathfinder team.";
  }

  private back(): void {
    if (this.mode === "equip-options") {
      this.mode = "equip-slots";
      this.feedback = "Choose another equipment slot.";
    } else if (this.mode === "tech-targets") {
      this.mode = "tech-spells";
      this.feedback = "Choose a technique.";
    } else if (this.mode === "tech-spells") {
      this.mode = "browse";
      this.feedback = this.defaultFeedback("TECH");
    } else if (this.mode === "transit-destinations") {
      this.mode = "items";
      this.feedback = "Choose an item.";
    } else if (this.mode !== "browse") {
      this.mode = "browse";
      this.feedback = this.defaultFeedback(TABS[this.selectedTab] ?? "STATUS");
    } else {
      this.close();
    }
  }

  private close(): void {
    this.party = null;
    this.inventory = null;
  }
}
