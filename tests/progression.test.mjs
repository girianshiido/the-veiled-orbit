import assert from "node:assert/strict";
import test from "node:test";
import { createAsh, createIone, createNox, createSera } from "../src/battle/battleData.ts";
import { canEquip, EQUIPMENT, effectiveStats, isCarbineEquipment } from "../src/progression/equipmentData.ts";
import { experienceForNextLevel, grantExperience, knownSpellsAtLevel, statsForLevel } from "../src/progression/levelData.ts";
import { FieldMenuSystem } from "../src/menu/FieldMenuSystem.ts";

class TestInput {
  pressed = new Set();

  press(action) {
    this.pressed.add(action);
  }

  consumePress(action) {
    if (!this.pressed.has(action)) return false;
    this.pressed.delete(action);
    return true;
  }

  clearPresses() {
    this.pressed.clear();
  }
}

function member(id, hp, maxHp) {
  return {
    id,
    name: id === "ash" ? "ASH" : "IONE",
    role: id === "ash" ? "PATHFINDER" : "ARCHIVE ADEPT",
    level: 1,
    experience: 0,
    hp,
    maxHp,
    mp: 12,
    maxMp: 12,
    attack: 10,
    defense: 5,
    agility: 8,
    spells: [id === "ash" ? "arc-bolt" : "mend"],
    equipment: id === "ash"
      ? { weapon: "relay-blade", armor: "field-suit", shield: null, core: null }
      : { weapon: "archive-rod", armor: "woven-mantle", shield: null, core: null },
  };
}

test("equipment bonuses contribute to battle statistics", () => {
  const ash = member("ash", 20, 34);
  assert.deepEqual(effectiveStats(ash), { attack: 13, defense: 7, agility: 8 });
  ash.equipment.core = "echo-core";
  assert.deepEqual(effectiveStats(ash), { attack: 15, defense: 9, agility: 8 });
});

test("equipment restrictions separate Ash and Ione weapon families", () => {
  assert.equal(canEquip("ash", "pulse-saber"), true);
  assert.equal(canEquip("ash", "ion-whip"), false);
  assert.equal(canEquip("ione", "pulse-saber"), false);
  assert.equal(canEquip("ione", "ion-whip"), true);
  assert.equal(canEquip("ash", "signal-shield"), true);
  assert.equal(canEquip("ione", "signal-shield"), true);
  assert.equal(canEquip("ash", "vault-edge"), true);
  assert.equal(canEquip("ione", "vault-edge"), false);
  assert.equal(canEquip("ash", "phase-lash"), false);
  assert.equal(canEquip("ione", "phase-lash"), true);
  assert.equal(canEquip("ash", "vault-aegis"), true);
  assert.equal(canEquip("ione", "memory-prism"), true);
  assert.equal(canEquip("nox", "pulse-saber"), true);
  assert.equal(canEquip("nox", "ion-whip"), false);
  assert.equal(canEquip("nox", "vault-aegis"), true);
  assert.equal(canEquip("ash", "starforged-saber"), true);
  assert.equal(canEquip("ione", "resonance-lash"), true);
  assert.equal(canEquip("nox", "arc-carbine"), true);
  assert.equal(canEquip("ash", "arc-carbine"), false);
  assert.equal(canEquip("ione", "frontier-mail"), false);
  assert.equal(canEquip("nox", "frontier-mail"), true);
  assert.equal(canEquip("nox", "phase-weave"), false);
  assert.equal(canEquip("nox", "storm-shield"), true);
});

test("Nox's carbine rewards form a clear upgrade path", () => {
  const carbines = ["arc-carbine", "relay-carbine", "storm-carbine", "harbor-carbine"]
    .map((id) => EQUIPMENT[id]);
  assert.deepEqual(carbines.map((weapon) => weapon.attack), [12, 15, 18, 21]);
  assert.deepEqual(carbines.map((weapon) => weapon.agility), [3, 5, 6, 7]);
  assert.equal(isCarbineEquipment("arc-carbine"), true);
  assert.equal(isCarbineEquipment("relay-carbine"), true);
  assert.equal(isCarbineEquipment("storm-carbine"), true);
  assert.equal(isCarbineEquipment("harbor-carbine"), true);
  assert.equal(isCarbineEquipment("pulse-saber"), false);
  assert.equal(isCarbineEquipment(null), false);
});

test("Tideglass sells costly upgrades for each current party member", () => {
  assert.equal(canEquip("ash", "tidebreaker-saber"), true);
  assert.equal(canEquip("ione", "tidebreaker-saber"), false);
  assert.equal(canEquip("ione", "mooncurrent-lash"), true);
  assert.equal(canEquip("nox", "mooncurrent-lash"), false);
  assert.equal(canEquip("nox", "harbor-carbine"), true);
  assert.equal(canEquip("ash", "harbor-carbine"), false);
  assert.ok(EQUIPMENT["tidebreaker-saber"].price >= 1400);
  assert.ok(EQUIPMENT["mooncurrent-lash"].price >= 1400);
  assert.ok(EQUIPMENT["harbor-carbine"].price >= 1400);
  assert.deepEqual(EQUIPMENT["deepwater-aegis"].allowedMembers, ["ash", "ione", "nox", "sera"]);
});

test("field menu lists stored gear, equips compatible items, removes gear and uses items", () => {
  const input = new TestInput();
  const ash = member("ash", 20, 34);
  const ione = member("ione", 10, 25);
  const party = { activeMemberIds: ["ash", "ione"], roster: [ash, ione] };
  const inventory = { credits: 0, tonics: 2, returnBeacons: 1, transitBeacons: 0, gear: ["echo-core", "pulse-saber", "ion-whip"] };
  let changes = 0;
  const menu = new FieldMenuSystem(input, () => { changes += 1; });
  menu.open(party, inventory);

  for (let index = 0; index < 3; index += 1) {
    input.press("right");
    menu.update();
  }
  input.press("confirm");
  menu.update();
  assert.equal(menu.view().mode, "equip-slots");
  input.press("confirm");
  menu.update();
  assert.deepEqual(menu.view().equipmentOptions.map((choice) => choice.equipmentId), [
    "relay-blade",
    "pulse-saber",
    null,
  ]);
  input.press("down");
  menu.update();
  input.press("confirm");
  menu.update();
  assert.equal(ash.equipment.weapon, "pulse-saber");
  assert.ok(inventory.gear.includes("relay-blade"));
  assert.ok(inventory.gear.includes("ion-whip"));

  input.press("menu");
  menu.update();
  input.press("menu");
  menu.update();
  input.press("down");
  menu.update();
  input.press("confirm");
  menu.update();
  input.press("confirm");
  menu.update();
  assert.deepEqual(menu.view().equipmentOptions.map((choice) => choice.equipmentId), [
    "archive-rod",
    "ion-whip",
    null,
  ]);
  input.press("down");
  menu.update();
  input.press("confirm");
  menu.update();
  assert.equal(ione.equipment.weapon, "ion-whip");

  input.press("down");
  menu.update();
  input.press("down");
  menu.update();
  input.press("confirm");
  menu.update();
  assert.equal(ione.equipment.weapon, null);
  assert.ok(inventory.gear.includes("ion-whip"));

  input.press("menu");
  menu.update();
  input.press("menu");
  menu.update();
  input.press("left");
  menu.update();
  input.press("confirm");
  menu.update();
  assert.equal(menu.view().mode, "items");
  assert.deepEqual(menu.view().items.map((item) => item.label), ["FIELD TONIC", "RETURN BEACON", "TRANSIT BEACON"]);
  input.press("confirm");
  menu.update();
  assert.equal(ione.hp, 25);
  assert.equal(inventory.tonics, 1);
  assert.equal(changes, 4);

  input.press("menu");
  menu.update();
  assert.equal(menu.active, true);
  input.press("menu");
  menu.update();
  assert.equal(menu.active, false);
});

test("a Return Beacon is consumed only when the party can leave a labyrinth", () => {
  const input = new TestInput();
  const ash = member("ash", 34, 34);
  const party = { activeMemberIds: ["ash"], roster: [ash] };
  const inventory = { credits: 0, tonics: 0, returnBeacons: 1, transitBeacons: 0, gear: [] };
  let canEscape = false;
  let changes = 0;
  const menu = new FieldMenuSystem(input, () => { changes += 1; }, () => canEscape);
  menu.open(party, inventory);
  input.press("right"); menu.update();
  input.press("right"); menu.update();
  input.press("confirm"); menu.update();
  input.press("down"); menu.update();
  input.press("confirm"); menu.update();
  assert.equal(inventory.returnBeacons, 1);
  assert.match(menu.view().feedback, /only answer inside a labyrinth/);
  canEscape = true;
  input.press("confirm"); menu.update();
  assert.equal(inventory.returnBeacons, 0);
  assert.equal(changes, 1);
  assert.equal(menu.active, false);
});

test("a Field Tonic cannot revive a dead party member", () => {
  const input = new TestInput();
  const ash = member("ash", 0, 34);
  const inventory = { credits: 0, tonics: 1, returnBeacons: 0, transitBeacons: 0, gear: [] };
  const menu = new FieldMenuSystem(input, () => undefined);
  menu.open({ activeMemberIds: ["ash"], roster: [ash] }, inventory);
  input.press("right"); menu.update();
  input.press("right"); menu.update();
  input.press("confirm"); menu.update();
  input.press("confirm"); menu.update();
  assert.equal(ash.hp, 0);
  assert.equal(inventory.tonics, 1);
  assert.match(menu.view().feedback, /REGENERATION CLINIC/);
});

test("field healing techniques spend MP and support single or party targets", () => {
  const input = new TestInput();
  const ash = member("ash", 20, 40);
  const ione = member("ione", 20, 25);
  ione.mp = 30;
  ione.maxMp = 30;
  ione.spells = ["mend", "renewal-wave"];
  const inventory = { credits: 0, tonics: 0, returnBeacons: 0, transitBeacons: 0, gear: [] };
  let changes = 0;
  const menu = new FieldMenuSystem(input, () => { changes += 1; });
  menu.open({ activeMemberIds: ["ash", "ione"], roster: [ash, ione] }, inventory);

  input.press("right"); menu.update();
  input.press("down"); menu.update();
  input.press("confirm"); menu.update();
  assert.equal(menu.view().mode, "tech-spells");
  input.press("confirm"); menu.update();
  assert.equal(menu.view().mode, "tech-targets");
  input.press("up"); menu.update();
  input.press("confirm"); menu.update();
  assert.equal(ash.hp, 32);
  assert.equal(ione.mp, 25);

  input.press("down"); menu.update();
  input.press("confirm"); menu.update();
  assert.equal(ash.hp, 40);
  assert.equal(ione.hp, 25);
  assert.equal(ione.mp, 14);
  assert.equal(changes, 2);
});

test("experience can grant several levels and teaches milestone techniques", () => {
  const ash = member("ash", 1, 34);
  ash.mp = 0;
  const advances = grantExperience(ash, 60);
  assert.equal(ash.level, 3);
  assert.equal(ash.experience, 5);
  assert.equal(ash.maxHp, 44);
  assert.equal(ash.maxMp, 16);
  assert.equal(ash.hp, ash.maxHp);
  assert.equal(ash.mp, ash.maxMp);
  assert.deepEqual(ash.spells, ["arc-bolt", "guard-pulse"]);
  assert.equal(advances.length, 2);
  assert.equal(advances[0].learnedSpell, null);
  assert.equal(advances[1].learnedSpell, "guard-pulse");
  assert.equal(experienceForNextLevel(ash.level), 58);

  const ione = member("ione", 10, 25);
  grantExperience(ione, 18);
  assert.deepEqual(ione.spells, ["mend", "static-field"]);
});

test("level thresholds remain readable while party sharing slows group progression", () => {
  assert.equal(experienceForNextLevel(1), 18);
  assert.equal(experienceForNextLevel(2), 37);
  assert.equal(experienceForNextLevel(15), 466);
});

test("new recruits close part of the level gap naturally without an experience bonus", () => {
  const veteran = member("ash", 34, 34);
  veteran.level = 7;
  const recruit = member("nox", 30, 30);

  grantExperience(veteran, 500);
  grantExperience(recruit, 500);

  assert.equal(veteran.level, 9);
  assert.equal(recruit.level, 7);
  assert.equal(veteran.level - recruit.level, 2);
});

test("the revised growth curve avoids runaway level fifteen statistics", () => {
  const ash = createAsh();
  const ione = createIone();
  const nox = createNox();
  const experienceToLevelFifteen = Array.from(
    { length: 14 },
    (_, index) => experienceForNextLevel(index + 1),
  ).reduce((total, value) => total + value, 0);

  grantExperience(ash, experienceToLevelFifteen);
  grantExperience(ione, experienceToLevelFifteen);
  grantExperience(nox, experienceToLevelFifteen);

  assert.equal(experienceToLevelFifteen, 2709);
  assert.deepEqual(
    { level: ash.level, hp: ash.maxHp, mp: ash.maxMp, attack: ash.attack, defense: ash.defense },
    { level: 15, hp: 108, mp: 43, attack: 28, defense: 15 },
  );
  assert.deepEqual(
    { level: ione.level, hp: ione.maxHp, mp: ione.maxMp, attack: ione.attack, defense: ione.defense },
    { level: 15, hp: 81, mp: 64, attack: 22, defense: 11 },
  );
  assert.deepEqual(ash.spells, ["arc-bolt", "guard-pulse", "flare-lance", "solar-wave"]);
  assert.deepEqual(ione.spells, ["mend", "static-field", "signal-break", "renewal-wave", "aegis-veil"]);
  assert.deepEqual(nox.spells, ["pulse-round", "shock-round", "scattershot", "armor-piercer", "overclock"]);
});

test("level twenty-five curves keep all four characters mechanically distinct", () => {
  assert.deepEqual(statsForLevel("ash", 25), { maxHp: 162, maxMp: 66, attack: 41, defense: 21, agility: 32 });
  assert.deepEqual(statsForLevel("ione", 25), { maxHp: 121, maxMp: 98, attack: 34, defense: 16, agility: 42 });
  assert.deepEqual(statsForLevel("nox", 25), { maxHp: 130, maxMp: 64, attack: 41, defense: 17, agility: 46 });
  assert.deepEqual(statsForLevel("sera", 25), { maxHp: 107, maxMp: 100, attack: 25, defense: 16, agility: 47 });
  assert.equal(knownSpellsAtLevel("ash", 25).at(-1), "nova-drive");
  assert.equal(knownSpellsAtLevel("ione", 25).at(-1), "restoration-wave");
  assert.equal(knownSpellsAtLevel("nox", 25).at(-1), "zero-volley");
  assert.equal(knownSpellsAtLevel("sera", 25).at(-1), "horizon-current");
  assert.equal(createSera().spells[0], "quick-current");
});

test("a Transit Beacon chooses a visited village and is consumed only after travel starts", () => {
  const input = new TestInput();
  const ash = member("ash", 34, 34);
  const inventory = { credits: 0, tonics: 0, returnBeacons: 0, transitBeacons: 1, gear: [] };
  let destination = null;
  let changes = 0;
  const menu = new FieldMenuSystem(
    input,
    () => { changes += 1; },
    () => false,
    () => [
      { mapId: "lumen-hollow", name: "LUMEN HOLLOW" },
      { mapId: "vesper-crossing", name: "VESPER CROSSING" },
    ],
    (mapId) => { destination = mapId; return true; },
  );
  menu.open({ activeMemberIds: ["ash"], roster: [ash] }, inventory);
  input.press("right"); menu.update();
  input.press("right"); menu.update();
  input.press("confirm"); menu.update();
  input.press("down"); menu.update();
  input.press("down"); menu.update();
  input.press("confirm"); menu.update();
  assert.equal(menu.view().mode, "transit-destinations");
  input.press("down"); menu.update();
  input.press("confirm"); menu.update();
  assert.equal(destination, "vesper-crossing");
  assert.equal(inventory.transitBeacons, 0);
  assert.equal(changes, 1);
  assert.equal(menu.active, false);
});
