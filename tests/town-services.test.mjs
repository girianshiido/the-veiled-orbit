import assert from "node:assert/strict";
import test from "node:test";
import { revivalCost, TownServiceSystem } from "../src/town/TownServiceSystem.ts";

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

function member(id, hp, mp) {
  return {
    id,
    name: id === "ash" ? "ASH" : "IONE",
    role: "TEST",
    level: 1,
    experience: 0,
    hp,
    maxHp: id === "ash" ? 34 : 25,
    mp,
    maxMp: id === "ash" ? 12 : 18,
    attack: 1,
    defense: 1,
    agility: 1,
    spells: [id === "ash" ? "arc-bolt" : "mend"],
    equipment: {
      weapon: id === "ash" ? "relay-blade" : "archive-rod",
      armor: id === "ash" ? "field-suit" : "woven-mantle",
      shield: null,
      core: null,
    },
  };
}

function service(kind, price = 0, destinationMap = "", destinationName = "", requiredFlag = "") {
  return {
    id: 1,
    name: kind,
    x: 0,
    y: 0,
    width: 16,
    height: 16,
    kind,
    text: "A village service.",
    emptyText: "",
    flag: "",
    credits: 0,
    tonics: 0,
    price,
    destinationMap,
    destinationName,
    requiredFlag,
  };
}

function press(input, system, action) {
  input.press(action);
  system.update();
}

test("opening a shop discards the direction used to cross its threshold", () => {
  const input = new TestInput();
  input.press("up");
  const ash = member("ash", 34, 12);
  const system = new TownServiceSystem(input, () => undefined);
  system.open(
    service("item-shop", 8),
    { activeMemberIds: ["ash"], roster: [ash] },
    { credits: 20, tonics: 0, returnBeacons: 0, gear: [] },
  );
  system.update();
  assert.equal(system.view().selectedChoice, 0);
});

test("the inn restores living members but cannot revive a dead member", () => {
  const input = new TestInput();
  const ash = member("ash", 3, 1);
  const ione = member("ione", 0, 0);
  const party = { activeMemberIds: ["ash", "ione"], roster: [ash, ione] };
  const inventory = { credits: 30, tonics: 0, returnBeacons: 0, gear: [] };
  let changes = 0;
  const system = new TownServiceSystem(input, () => { changes += 1; });
  system.open(service("inn", 12), party, inventory);
  press(input, system, "confirm");
  assert.equal(inventory.credits, 18);
  assert.equal(ash.hp, ash.maxHp);
  assert.equal(ione.hp, 0);
  assert.equal(ash.mp, ash.maxMp);
  assert.equal(ione.mp, 0);
  assert.equal(changes, 1);
});

test("the regeneration clinic revives a member for a level-based fee without changing MP", () => {
  const input = new TestInput();
  const ash = member("ash", 34, 12);
  const ione = member("ione", 0, 4);
  ione.level = 3;
  const party = { activeMemberIds: ["ash", "ione"], roster: [ash, ione] };
  const inventory = { credits: 50, tonics: 0, returnBeacons: 0, gear: [] };
  let changes = 0;
  const system = new TownServiceSystem(input, () => { changes += 1; });
  system.open(service("revival-shop"), party, inventory);
  press(input, system, "confirm");
  assert.deepEqual(system.view().choices.map((choice) => choice.label), ["RESTORE IONE", "BACK"]);
  assert.equal(system.view().choices[0].price, revivalCost(ione.level));
  press(input, system, "confirm");
  assert.equal(inventory.credits, 5);
  assert.equal(ione.hp, ione.maxHp);
  assert.equal(ione.mp, 4);
  assert.equal(changes, 1);
});

test("the item shop buys repeatable tonics and rejects an unaffordable purchase", () => {
  const input = new TestInput();
  const ash = member("ash", 34, 12);
  const party = { activeMemberIds: ["ash"], roster: [ash] };
  const inventory = { credits: 10, tonics: 1, returnBeacons: 0, gear: [] };
  const system = new TownServiceSystem(input, () => undefined);
  system.open(service("item-shop", 8), party, inventory);
  press(input, system, "confirm");
  assert.equal(system.view().mode, "buy");
  press(input, system, "confirm");
  assert.equal(inventory.credits, 2);
  assert.equal(inventory.tonics, 2);
  press(input, system, "confirm");
  assert.equal(inventory.credits, 2);
  assert.equal(inventory.tonics, 2);
  assert.match(system.view().feedback, /Not enough/);
});

test("the item shop buys and resells Return Beacons", () => {
  const input = new TestInput();
  const ash = member("ash", 34, 12);
  const party = { activeMemberIds: ["ash"], roster: [ash] };
  const inventory = { credits: 30, tonics: 0, returnBeacons: 0, gear: [] };
  const system = new TownServiceSystem(input, () => undefined);
  system.open(service("item-shop", 8), party, inventory);
  press(input, system, "confirm");
  press(input, system, "down");
  press(input, system, "confirm");
  assert.equal(inventory.credits, 12);
  assert.equal(inventory.returnBeacons, 1);
  press(input, system, "menu");
  press(input, system, "down");
  press(input, system, "confirm");
  press(input, system, "confirm");
  assert.equal(inventory.credits, 21);
  assert.equal(inventory.returnBeacons, 0);
});

test("later item shops charge more for tonics and Return Beacons", () => {
  const input = new TestInput();
  const ash = member("ash", 34, 12);
  const system = new TownServiceSystem(input, () => undefined);
  system.open(
    { ...service("item-shop", 16), name: "vesper-item-shop" },
    { activeMemberIds: ["ash"], roster: [ash] },
    { credits: 100, tonics: 0, returnBeacons: 0, gear: [] },
  );
  press(input, system, "confirm");
  assert.deepEqual(system.view().choices.map((choice) => choice.price), [16, 36, 96, null]);
});

test("Transit Beacons cost more than Return Beacons and can be resold", () => {
  const input = new TestInput();
  const ash = member("ash", 34, 12);
  const party = { activeMemberIds: ["ash"], roster: [ash] };
  const inventory = { credits: 100, tonics: 0, returnBeacons: 0, transitBeacons: 0, gear: [] };
  const system = new TownServiceSystem(input, () => undefined);
  system.open(service("item-shop", 8), party, inventory);
  press(input, system, "confirm");
  const prices = system.view().choices.map((choice) => choice.price);
  assert.ok(prices[2] > prices[1]);
  press(input, system, "down");
  press(input, system, "down");
  press(input, system, "confirm");
  assert.equal(inventory.transitBeacons, 1);
  assert.equal(inventory.credits, 52);
  press(input, system, "menu");
  press(input, system, "down");
  press(input, system, "confirm");
  press(input, system, "confirm");
  assert.equal(inventory.transitBeacons, 0);
  assert.equal(inventory.credits, 76);
});

test("a weapon purchase selects an active wielder and stores replaced gear", () => {
  const input = new TestInput();
  const ash = member("ash", 34, 12);
  const party = { activeMemberIds: ["ash"], roster: [ash] };
  const inventory = { credits: 100, tonics: 0, returnBeacons: 0, gear: [] };
  const system = new TownServiceSystem(input, () => undefined);
  system.open(service("weapon-shop"), party, inventory);
  press(input, system, "confirm");
  press(input, system, "confirm");
  assert.equal(system.view().mode, "target");
  press(input, system, "confirm");
  assert.equal(ash.equipment.weapon, "pulse-saber");
  assert.deepEqual(inventory.gear, ["relay-blade"]);
  assert.equal(inventory.credits, 58);
});

test("an incompatible shop weapon can be purchased for storage but not equipped", () => {
  const input = new TestInput();
  const ash = member("ash", 34, 12);
  const party = { activeMemberIds: ["ash"], roster: [ash] };
  const inventory = { credits: 100, tonics: 0, returnBeacons: 0, gear: [] };
  const system = new TownServiceSystem(input, () => undefined);
  system.open(service("weapon-shop"), party, inventory);
  press(input, system, "confirm");
  press(input, system, "down");
  press(input, system, "confirm");
  assert.deepEqual(system.view().choices.map((choice) => choice.label), ["STORE ONLY", "BACK"]);
  press(input, system, "confirm");
  assert.equal(ash.equipment.weapon, "relay-blade");
  assert.deepEqual(inventory.gear, ["ion-whip"]);
  assert.equal(inventory.credits, 44);
});

test("Aster marks up familiar equipment while Vesper sells costly specialist weapons", () => {
  const input = new TestInput();
  const ash = member("ash", 34, 12);
  const ione = member("ione", 25, 18);
  const nox = { ...member("ash", 30, 10), id: "nox", name: "NOX" };
  const party = { activeMemberIds: ["ash", "ione", "nox"], roster: [ash, ione, nox] };
  const inventory = { credits: 2000, tonics: 0, returnBeacons: 0, gear: [] };
  const system = new TownServiceSystem(input, () => undefined);

  system.open({ ...service("weapon-shop"), name: "aster-weapon-shop" }, party, inventory);
  press(input, system, "confirm");
  assert.deepEqual(system.view().choices.map((choice) => choice.price), [53, 70, null]);

  system.open({ ...service("weapon-shop"), name: "vesper-weapon-shop" }, party, inventory);
  press(input, system, "confirm");
  assert.deepEqual(system.view().choices.map((choice) => choice.label), [
    "STARFORGED SABER",
    "RESONANCE LASH",
    "ARC CARBINE",
    "BACK",
  ]);
  assert.deepEqual(system.view().choices.map((choice) => choice.price), [620, 680, 760, null]);
  press(input, system, "down");
  press(input, system, "down");
  press(input, system, "confirm");
  assert.deepEqual(system.view().choices.map((choice) => choice.label), ["NOX", "STORE ONLY", "BACK"]);

  system.open({ ...service("weapon-shop"), name: "tideglass-weapon-shop" }, party, inventory);
  press(input, system, "confirm");
  assert.deepEqual(system.view().choices.map((choice) => choice.label), [
    "TIDEBREAKER SABER",
    "MOONCURRENT LASH",
    "HARBOR CARBINE",
    "HARBOR DISC",
    "BACK",
  ]);
  assert.deepEqual(system.view().choices.map((choice) => choice.price), [1480, 1540, 1620, 1180, null]);
});

test("the memory counter saves freely in the selected reusable slot", () => {
  const input = new TestInput();
  const ash = member("ash", 34, 12);
  const party = { activeMemberIds: ["ash"], roster: [ash] };
  const inventory = { credits: 17, tonics: 0, returnBeacons: 0, gear: [] };
  const slots = [];
  const timestamps = new Map();
  const savedAt = new Date(2026, 7, 11, 9, 43, 12).getTime();
  const system = new TownServiceSystem(
    input,
    () => undefined,
    (slot) => {
      slots.push(slot);
      timestamps.set(slot, savedAt);
      return true;
    },
    undefined,
    undefined,
    (slot) => timestamps.get(slot) ?? null,
  );
  system.open(service("save-shop"), party, inventory);
  press(input, system, "confirm");
  assert.deepEqual(system.view().choices.map((choice) => choice.label), [
    "SLOT 1  EMPTY",
    "SLOT 2  EMPTY",
    "SLOT 3  EMPTY",
    "BACK",
  ]);
  press(input, system, "down");
  press(input, system, "confirm");
  assert.deepEqual(slots, [2]);
  assert.equal(inventory.credits, 17);
  assert.match(system.view().choices[1].label, /^SLOT 2  \d{2}\/\d{2} \d{2}:\d{2}$/);
  assert.match(system.view().feedback, /^SLOT 2 RECORDED · \d{2}\/\d{2}\/2026 \d{2}:\d{2}:\d{2}$/);
});

test("Ash is locked while recruited companions can wait at home or rejoin", () => {
  const input = new TestInput();
  const ash = member("ash", 34, 12);
  const ione = member("ione", 25, 18);
  const party = { activeMemberIds: ["ash", "ione"], roster: [ash, ione] };
  const inventory = { credits: 0, tonics: 0, returnBeacons: 0, gear: [] };
  const system = new TownServiceSystem(input, () => undefined);
  system.open(service("party-house"), party, inventory);
  press(input, system, "down");
  press(input, system, "down");
  press(input, system, "confirm");
  press(input, system, "down");
  press(input, system, "confirm");
  assert.deepEqual(party.activeMemberIds, ["ash"]);
  press(input, system, "confirm");
  assert.deepEqual(party.activeMemberIds, ["ash", "ione"]);
  press(input, system, "up");
  press(input, system, "confirm");
  assert.deepEqual(party.activeMemberIds, ["ash", "ione"]);
  assert.match(system.view().feedback, /must remain/);
});

test("Ash's house exposes illustrated identity records with current equipped stats", () => {
  const input = new TestInput();
  const ash = member("ash", 21, 7);
  const ione = member("ione", 25, 18);
  ione.level = 4;
  ione.experience = 33;
  const party = { activeMemberIds: ["ash"], roster: [ash, ione] };
  const inventory = { credits: 0, tonics: 0, returnBeacons: 0, gear: [] };
  const system = new TownServiceSystem(input, () => undefined);
  system.open(service("party-house"), party, inventory);

  assert.deepEqual(system.view().choices.map((choice) => choice.label), [
    "IDENTITY FILES", "TALK", "FORM PARTY", "GOOD BYE",
  ]);
  press(input, system, "confirm");
  assert.equal(system.view().mode, "profiles");
  assert.equal(system.view().identity.id, "ash");
  assert.equal(system.view().identity.hp, 21);
  assert.ok(system.view().identity.attack > ash.attack, "equipment must contribute to the displayed attack");
  assert.equal(system.view().identity.active, true);

  press(input, system, "down");
  assert.equal(system.view().identity.id, "ione");
  assert.equal(system.view().identity.level, 4);
  assert.equal(system.view().identity.experience, 33);
  assert.equal(system.view().identity.active, false);
  assert.match(system.view().identity.description, /Archive adept/);
});

test("paid transit deducts its fare and opens the linked village", () => {
  const input = new TestInput();
  const ash = member("ash", 34, 12);
  const party = { activeMemberIds: ["ash"], roster: [ash] };
  const inventory = { credits: 30, tonics: 0, returnBeacons: 0, gear: [] };
  const journeys = [];
  const system = new TownServiceSystem(input, () => undefined, () => false, (mapId) => journeys.push(mapId));
  const link = service("teleport", 25, "aster-reach", "ASTER REACH", "village.aster-reach.visited");
  system.open(link, party, inventory, new Set(["village.aster-reach.visited"]));
  press(input, system, "confirm");
  assert.equal(inventory.credits, 5);
  assert.deepEqual(journeys, ["aster-reach"]);
  assert.equal(system.active, false);
});

test("transit hides villages that have not yet been visited", () => {
  const input = new TestInput();
  const ash = member("ash", 34, 12);
  const party = { activeMemberIds: ["ash"], roster: [ash] };
  const inventory = { credits: 99, tonics: 0, returnBeacons: 0, gear: [] };
  const journeys = [];
  const link = service("teleport", 25, "aster-reach", "ASTER REACH", "village.aster-reach.visited");
  const system = new TownServiceSystem(input, () => undefined, () => false, (mapId) => journeys.push(mapId));
  system.open(link, party, inventory, new Set(["village.lumen-hollow.visited"]));
  assert.deepEqual(system.view().choices.map((choice) => choice.label), ["TALK", "GOOD BYE"]);
  press(input, system, "confirm");
  assert.deepEqual(journeys, []);
  assert.equal(inventory.credits, 99);
  assert.match(system.view().feedback, /reached on foot/);
});

test("a transit gate lists every discovered destination and hides the others", () => {
  const input = new TestInput();
  const ash = member("ash", 34, 12);
  const party = { activeMemberIds: ["ash"], roster: [ash] };
  const inventory = { credits: 99, tonics: 0, returnBeacons: 0, gear: [] };
  const link = service(
    "teleport",
    25,
    "lumen-hollow,vesper-crossing",
    "LUMEN HOLLOW|VESPER CROSSING",
    "village.lumen-hollow.visited|village.vesper-crossing.visited",
  );
  const system = new TownServiceSystem(input, () => undefined);
  system.open(link, party, inventory, new Set(["village.lumen-hollow.visited"]));
  assert.deepEqual(system.view().choices.map((choice) => choice.label), ["TO LUMEN HOLLOW", "TALK", "GOOD BYE"]);
  system.open(link, party, inventory, new Set([
    "village.lumen-hollow.visited",
    "village.vesper-crossing.visited",
  ]));
  assert.deepEqual(system.view().choices.map((choice) => choice.label), [
    "TO LUMEN HOLLOW",
    "TO VESPER CROSSING",
    "TALK",
    "GOOD BYE",
  ]);
});

test("Skyglass joins older transit gates after discovery and never lists itself", () => {
  const input = new TestInput(), system = new TownServiceSystem(input, () => undefined);
  const party = { activeMemberIds: ["ash"], roster: [member("ash",34,12)] };
  const inventory = { credits: 999, tonics: 0, returnBeacons: 0, gear: [] };
  const flags = new Set(["village.lumen-hollow.visited"]);
  const link = service("teleport",25,"lumen-hollow","LUMEN HOLLOW","village.lumen-hollow.visited");
  system.open(link,party,inventory,flags);
  assert.ok(!system.view().choices.some(c=>c.label==="TO SKYGLASS RELAY"));
  flags.add("village.skyglass-relay.visited");
  system.open(link,party,inventory,flags);
  assert.ok(system.view().choices.some(c=>c.label==="TO SKYGLASS RELAY"));
  system.open({...link,name:"skyglass-transit-service"},party,inventory,flags);
  assert.ok(!system.view().choices.some(c=>c.label==="TO SKYGLASS RELAY"));
});

test("leaving a service reports its door so the player can be placed outside", () => {
  const input = new TestInput();
  const ash = member("ash", 34, 12);
  const party = { activeMemberIds: ["ash"], roster: [ash] };
  const inventory = { credits: 0, tonics: 0, returnBeacons: 0, gear: [] };
  const closed = [];
  const interaction = service("party-house");
  const system = new TownServiceSystem(
    input,
    () => undefined,
    () => false,
    () => undefined,
    (door) => closed.push(door),
  );
  system.open(interaction, party, inventory);
  press(input, system, "menu");
  assert.deepEqual(closed, [interaction]);
  assert.equal(system.active, false);
});
