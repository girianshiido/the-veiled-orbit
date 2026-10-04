import { knownSpellsAtLevel, statsForLevel } from "../progression/levelData.ts";
import { SPELLS } from "../progression/spellData.ts";
import type { Direction, EquipmentId, PartyMemberProgress, SaveData, SpellId } from "../types/game";

// This key is deliberately version-independent. Save schema changes are
// migrated in place so an engine update never makes a playthrough disappear.
const SAVE_PREFIX = "science-fantasy-jrpg-manual-save-slot-";
const SAVE_SLOTS = [1, 2, 3] as const;
const DIRECTIONS = new Set<Direction>(["down", "left", "right", "up"]);
const EQUIPMENT_IDS = new Set<EquipmentId>([
  "relay-blade",
  "archive-rod",
  "field-suit",
  "woven-mantle",
  "pulse-saber",
  "ion-whip",
  "guard-plate",
  "signal-shield",
  "echo-core",
  "vault-edge",
  "phase-lash",
  "vault-aegis",
  "memory-prism",
  "starforged-saber",
  "resonance-lash",
  "arc-carbine",
  "frontier-mail",
  "phase-weave",
  "storm-shield",
  "relay-carbine",
  "scout-coil",
  "sun-edge",
  "oracle-loop",
  "storm-carbine",
  "tower-aegis",
  "tidebreaker-saber",
  "mooncurrent-lash",
  "harbor-carbine",
  "pelagic-mail",
  "current-weave",
  "deepwater-aegis",
  "harbor-disc", "tidal-jacket", "undertide-ring", "cavern-weave", "meridian-disc", "meridian-guard",
  "cipher-carbine", "prism-lash", "dawn-saber", "horizon-disc", "aurora-mantle",
  "aeroweave-mail", "vector-core", "skyglass-guard",
]);
const SPELL_IDS = new Set<SpellId>(Object.keys(SPELLS) as SpellId[]);

export class SaveManager {
  public constructor() {
    this.migrateLegacySaves();
  }

  public async restoreBackups(): Promise<void> {
    for (const slot of SAVE_SLOTS) {
      const localSave = this.loadSlot(slot);
      const candidates = [`/__save-backup?slot=${slot}`];
      for (const url of candidates) {
        try {
          const response = await fetch(url);
          if (!response.ok) continue;
          const migrated = this.migrateValue(await response.json());
          if (!migrated || !this.isValid(migrated)) continue;
          if (!localSave || migrated.savedAt > localSave.savedAt) {
            localStorage.setItem(`${SAVE_PREFIX}${slot}`, JSON.stringify(migrated));
          }
          break;
        } catch {
          // The production build has no development backup endpoint.
        }
      }
    }
  }

  public load(): SaveData | null {
    return SAVE_SLOTS
      .map((slot) => this.loadSlot(slot))
      .filter((save): save is SaveData => save !== null)
      .sort((left, right) => right.savedAt - left.savedAt)[0] ?? null;
  }

  public loadSlot(slot: number): SaveData | null {
    try {
      if (!SAVE_SLOTS.includes(slot as 1 | 2 | 3)) return null;
      const raw = localStorage.getItem(`${SAVE_PREFIX}${slot}`);
      if (!raw) return null;
      const value = this.migrateValue(JSON.parse(raw));
      if (!value || !this.isValid(value)) return null;
      localStorage.setItem(`${SAVE_PREFIX}${slot}`, JSON.stringify(value));
      return value;
    } catch {
      return null;
    }
  }

  public save(data: SaveData, slot: number): void {
    if (!SAVE_SLOTS.includes(slot as 1 | 2 | 3)) throw new Error(`Invalid save slot: ${slot}`);
    localStorage.setItem(`${SAVE_PREFIX}${slot}`, JSON.stringify(data));
    if (typeof fetch === "function") {
      void fetch(`/__save-backup?slot=${slot}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).catch(() => undefined);
    }
  }

  private migrateLegacySaves(): void {
    try {
      const legacy: Array<{ key: string; slot: number; savedAt: number; save: SaveData }> = [];
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (!key?.startsWith("science-fantasy-jrpg-") || key.startsWith(SAVE_PREFIX)) continue;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const save = this.migrateValue(JSON.parse(raw));
        if (!save || !this.isValid(save)) continue;
        const match = key.match(/slot-(\d+)$/);
        const slot = Number(match?.[1] ?? 1);
        legacy.push({ key, slot: SAVE_SLOTS.includes(slot as 1 | 2 | 3) ? slot : 1, savedAt: save.savedAt, save });
      }
      legacy.sort((left, right) => left.savedAt - right.savedAt).forEach(({ slot, save }) => {
        const existing = this.loadSlot(slot);
        if (!existing || existing.savedAt < save.savedAt) localStorage.setItem(`${SAVE_PREFIX}${slot}`, JSON.stringify(save));
      });
    } catch {
      // Storage can be unavailable in private browser contexts; the game still runs without loading a save.
    }
  }

  private migrateValue(value: unknown): SaveData | null {
    if (!value || typeof value !== "object") return null;
    const source = value as Record<string, unknown>;
    const clone = JSON.parse(JSON.stringify(source)) as Partial<SaveData>;
    clone.version = 13;
    clone.savedAt = typeof clone.savedAt === "number" ? clone.savedAt : Date.now();
    clone.worldFlags = Array.isArray(clone.worldFlags) ? clone.worldFlags.filter((flag): flag is string => typeof flag === "string") : [];
    if (!clone.inventory || typeof clone.inventory !== "object") return null;
    clone.inventory.returnBeacons = Number.isFinite(clone.inventory.returnBeacons) ? clone.inventory.returnBeacons : 0;
    clone.inventory.transitBeacons = Number.isFinite(clone.inventory.transitBeacons) ? clone.inventory.transitBeacons : 0;
    clone.inventory.gear = Array.isArray(clone.inventory.gear)
      ? clone.inventory.gear.filter((id): id is EquipmentId => EQUIPMENT_IDS.has(id as EquipmentId))
      : [];
    if (!clone.party || !Array.isArray(clone.party.roster)) return null;
    for (const member of clone.party.roster) {
      if (!member.equipment) {
        member.equipment = { weapon: null, armor: null, shield: null, core: null };
      } else {
        member.equipment.weapon ??= null;
        member.equipment.armor ??= null;
        member.equipment.shield ??= null;
        member.equipment.core ??= null;
      }
      const preservedSpells = Array.isArray(member.spells)
        ? member.spells.filter((spell) => SPELL_IDS.has(spell))
        : [];
      const level = Math.max(1, Math.floor(member.level));
      const oldMaxHp = Number.isFinite(member.maxHp) ? member.maxHp : 1;
      const oldMaxMp = Number.isFinite(member.maxMp) ? member.maxMp : 0;
      const oldHp = Number.isFinite(member.hp) ? member.hp : oldMaxHp;
      const oldMp = Number.isFinite(member.mp) ? member.mp : oldMaxMp;
      const hpDamage = Math.max(0, oldMaxHp - oldHp);
      const mpSpent = Math.max(0, oldMaxMp - oldMp);
      const stats = statsForLevel(member.id, level);
      member.level = level;
      member.maxHp = stats.maxHp;
      member.maxMp = stats.maxMp;
      member.hp = oldHp <= 0 ? 0 : Math.max(1, Math.min(stats.maxHp, stats.maxHp - hpDamage));
      member.mp = Math.max(0, Math.min(stats.maxMp, stats.maxMp - mpSpent));
      member.attack = stats.attack;
      member.defense = stats.defense;
      member.agility = stats.agility;
      member.spells = [...new Set([...preservedSpells, ...knownSpellsAtLevel(member.id, level)])];
    }
    return clone as SaveData;
  }

  private isValid(value: unknown): value is SaveData {
    if (!value || typeof value !== "object") return false;
    const save = value as Partial<SaveData>;
    const player = save.player;
    const party = save.party;
    const inventory = save.inventory;
    if (save.version !== 13
      || typeof save.mapId !== "string"
      || typeof save.savedAt !== "number"
      || !player
      || typeof player.x !== "number"
      || typeof player.y !== "number"
      || !DIRECTIONS.has(player.direction as Direction)) return false;
    if (!Array.isArray(save.worldFlags) || !save.worldFlags.every((flag) => typeof flag === "string")) return false;
    if (!party || !Array.isArray(party.activeMemberIds) || !Array.isArray(party.roster)) return false;
    if (party.activeMemberIds.length < 1 || party.activeMemberIds.length > 4 || !party.activeMemberIds.includes("ash")) return false;
    if (!party.roster.every((member) => this.isValidMember(member))) return false;
    if (!party.activeMemberIds.every((id) => party.roster.some((member) => member.id === id))) return false;
    return !!inventory
      && typeof inventory.credits === "number"
      && typeof inventory.tonics === "number"
      && typeof inventory.returnBeacons === "number"
      && typeof inventory.transitBeacons === "number"
      && Array.isArray(inventory.gear)
      && inventory.gear.every((id) => EQUIPMENT_IDS.has(id));
  }

  private isValidMember(value: unknown): value is PartyMemberProgress {
    if (!value || typeof value !== "object") return false;
    const member = value as Partial<PartyMemberProgress>;
    const equipment = member.equipment;
    return (member.id === "ash" || member.id === "ione" || member.id === "nox" || member.id === "sera")
      && typeof member.name === "string"
      && typeof member.role === "string"
      && Array.isArray(member.spells)
      && member.spells.every((spell) => typeof spell === "string" && SPELL_IDS.has(spell))
      && !!equipment
      && [equipment.weapon, equipment.armor, equipment.shield, equipment.core]
        .every((id) => id === null || (typeof id === "string" && EQUIPMENT_IDS.has(id as EquipmentId)))
      && [member.level, member.experience, member.hp, member.maxHp, member.mp, member.maxMp,
        member.attack, member.defense, member.agility]
        .every((stat) => typeof stat === "number" && Number.isFinite(stat));
  }
}
