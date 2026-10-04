import assert from "node:assert/strict";
import test from "node:test";
import { SaveManager } from "../src/core/SaveManager.ts";

const PREFIX = "science-fantasy-jrpg-manual-save-slot-";

class MemoryStorage {
  values = new Map();

  get length() {
    return this.values.size;
  }

  key(index) {
    return [...this.values.keys()][index] ?? null;
  }

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

function saveData(savedAt, mapId = "lumen-hollow") {
  return {
    version: 13,
    mapId,
    player: { x: 146, y: 96, direction: "up" },
    worldFlags: [],
    party: {
      activeMemberIds: ["ash"],
      roster: [{
        id: "ash",
        name: "ASH",
        role: "PATHFINDER",
        level: 1,
        experience: 0,
        hp: 34,
        maxHp: 34,
        mp: 12,
        maxMp: 12,
        attack: 10,
        defense: 5,
        agility: 8,
        spells: ["arc-bolt"],
        equipment: { weapon: "relay-blade", armor: "field-suit", shield: null, core: null },
      }],
    },
    inventory: { credits: 0, tonics: 2, returnBeacons: 1, gear: ["echo-core"] },
    savedAt,
  };
}

test.beforeEach(() => {
  globalThis.localStorage = new MemoryStorage();
  globalThis.fetch = async () => ({ ok: false });
});

test("central chapter equipment and relay progress survive a manual save round trip", () => {
  const data = saveData(100, "central-control-archives");
  data.inventory.gear = ["cipher-carbine", "prism-lash", "dawn-saber", "horizon-disc", "aurora-mantle"];
  data.worldFlags = ["array.meridian-core-read", "relay.central-west-online", "relay.central-east-online"];
  data.party.roster[0].equipment.weapon = "dawn-saber";
  const manager = new SaveManager();
  manager.save(data, 3);
  const loaded = new SaveManager().loadSlot(3);
  assert.deepEqual(loaded.inventory.gear, data.inventory.gear);
  assert.deepEqual(loaded.worldFlags, data.worldFlags);
  assert.equal(loaded.party.roster[0].equipment.weapon, "dawn-saber");
  assert.equal(loaded.mapId, data.mapId);
});

test("launch equipment and flight progress survive saves without changing older slots", () => {
  const manager = new SaveManager();
  manager.save(saveData(50), 1);
  const oldSlot = localStorage.getItem(`${PREFIX}1`);
  const data = saveData(200, "skyglass-relay");
  data.inventory.gear = ["aeroweave-mail", "vector-core", "skyglass-guard"];
  data.party.roster[0].equipment.armor = "aeroweave-mail";
  data.party.roster[0].equipment.core = "vector-core";
  data.party.roster[0].equipment.shield = "skyglass-guard";
  data.worldFlags = ["quest.cradle-coupler-recovered", "quest.cradle-reactor-online", "cradle.warden-defeated", "quest.launch-cradle-online", "village.skyglass-relay.visited"];
  manager.save(data, 3);
  const loaded = new SaveManager().loadSlot(3);
  assert.deepEqual(loaded.inventory.gear, data.inventory.gear);
  assert.deepEqual(loaded.party.roster[0].equipment, data.party.roster[0].equipment);
  assert.deepEqual(loaded.worldFlags, data.worldFlags);
  assert.equal(loaded.mapId, "skyglass-relay");
  assert.equal(localStorage.getItem(`${PREFIX}1`), oldSlot);
});

test("three manual slots are reusable and startup restores the newest one", () => {
  const saves = new SaveManager();
  saves.save(saveData(100, "lumen-hollow"), 1);
  saves.save(saveData(300, "aster-reach"), 2);
  saves.save(saveData(200, "glass-steppe"), 3);
  assert.equal(saves.loadSlot(1).mapId, "lumen-hollow");
  assert.equal(saves.loadSlot(2).mapId, "aster-reach");
  assert.equal(saves.load().mapId, "aster-reach");

  saves.save(saveData(400, "lumen-hollow"), 2);
  assert.equal(saves.loadSlot(2).mapId, "lumen-hollow");
  assert.equal(saves.load().savedAt, 400);
});

test("old save formats are migrated without deleting their source", () => {
  const old = saveData(100);
  old.version = 6;
  localStorage.setItem("science-fantasy-jrpg-manual-save-v6-slot-1", JSON.stringify(old));
  const incomplete = saveData(200);
  delete incomplete.party.roster[0].equipment.shield;
  localStorage.setItem("science-fantasy-jrpg-manual-save-v12-slot-2", JSON.stringify(incomplete));
  const saves = new SaveManager();
  assert.equal(saves.loadSlot(1).version, 13);
  assert.equal(saves.loadSlot(2).party.roster[0].equipment.shield, null);
  assert.ok(localStorage.getItem("science-fantasy-jrpg-manual-save-v6-slot-1"));
  assert.ok(localStorage.getItem("science-fantasy-jrpg-manual-save-v12-slot-2"));
});
