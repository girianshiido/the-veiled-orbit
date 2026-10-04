import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { BattleSystem } from "../src/battle/BattleSystem.ts";
import { createDefaultInventory, createSera } from "../src/battle/battleData.ts";

const mapDirectory = new URL("../public/assets/maps/", import.meta.url);
const readMap = async (id) => JSON.parse(await readFile(new URL(`${id}.json`, mapDirectory), "utf8"));
const properties = (object) => new Map((object.properties ?? []).map((entry) => [entry.name, entry.value]));

class TestInput {
  pressed = new Set();
  consumePress(action) { if (!this.pressed.has(action)) return false; this.pressed.delete(action); return true; }
  clearPresses() { this.pressed.clear(); }
}

test("Sera waits at Undertide Passage and joins the roster rather than the active party", async () => {
  const southwake = await readMap("southern-landing");
  const sera = southwake.layers.find((layer) => layer.name === "entities").objects.find((entity) => entity.name === "Captain Sera Venn");
  assert.equal(properties(sera).get("spriteId"), "sera-venn");
  assert.equal(properties(sera).get("recruitMemberId"), "sera");
  assert.equal(properties(sera).get("recruitFlag"), "party.sera-recruited");
  assert.equal(properties(sera).get("hiddenFlag"), "party.sera-recruited");
  const passage = southwake.layers.find((layer) => layer.name === "triggers").objects.find((trigger) => trigger.name === "undertide-west-mouth");
  assert.equal(properties(passage).get("targetMap"), "undertide-passage");
});

test("the free ferry remains available on both sides of the southern route", async () => {
  const maps = await Promise.all(["glass-steppe", "southern-landing", "meridian-basin"].map(readMap));
  const ferries = maps.map((map) => map.layers.find((layer) => layer.name === "entities").objects
    .find((entity) => properties(entity).get("spriteId") === "ferry-boat"));
  assert.ok(ferries.every(Boolean));
  assert.equal(properties(ferries[0]).get("travelMap"), "southern-landing");
  assert.equal(properties(ferries[1]).get("travelMap"), "glass-steppe");
  assert.equal(properties(ferries[2]).get("travelMap"), "glass-steppe");
});

test("Undertide Passage is a large connected one-floor labyrinth without a boss", async () => {
  const map = await readMap("undertide-passage");
  assert.ok(map.width >= 50 && map.height >= 34);
  const collision = map.layers.find((layer) => layer.name === "collision").data;
  const transitions = map.layers.find((layer) => layer.name === "triggers").objects;
  assert.equal(transitions.length, 2);
  const tileOf = (transition) => [Math.floor((transition.x + transition.width / 2) / 16), Math.floor((transition.y + transition.height / 2) / 16)];
  const starts = transitions.map(tileOf);
  const queue = [starts[0]];
  const visited = new Set([starts[0].join(",")]);
  while (queue.length) {
    const [x, y] = queue.shift();
    for (const [nextX, nextY] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (nextX < 0 || nextY < 0 || nextX >= map.width || nextY >= map.height) continue;
      if (collision[nextY * map.width + nextX] !== 0) continue;
      const key = `${nextX},${nextY}`;
      if (visited.has(key)) continue;
      visited.add(key); queue.push([nextX, nextY]);
    }
  }
  assert.ok(visited.has(starts[1].join(",")), "both cave mouths must share one traversable network");
  assert.ok(visited.size >= 360, "the cave should offer a substantial labyrinth");
  const caches = map.layers.find((layer) => layer.name === "interactions").objects;
  assert.deepEqual(caches.map((cache) => properties(cache).get("equipmentId")).filter(Boolean).sort(), ["cavern-weave", "undertide-ring"]);
  assert.equal(map.layers.find((layer) => layer.name === "entities").objects.length, 0, "the cave has no scripted boss");
});

test("the isolated basin leads to Cairn Meridian and the active Meridian Array", async () => {
  const basin = await readMap("meridian-basin");
  const destinations = basin.layers.find((layer) => layer.name === "triggers").objects.map((trigger) => properties(trigger).get("targetMap"));
  assert.ok(destinations.includes("undertide-passage"));
  assert.ok(destinations.includes("cairn-meridian"));
  assert.ok(destinations.includes("meridian-array"));
  const cairn = await readMap("cairn-meridian");
  assert.equal(cairn.layers.find((layer) => layer.name === "encounters").objects.length, 0);
  assert.ok(cairn.layers.find((layer) => layer.name === "interactions").objects.some((object) => properties(object).get("interactionKind") === "save-shop"));
});

test("Meridian Array is a connected second labyrinth with a core objective and reward", async () => {
  const map = await readMap("meridian-array");
  const collision = map.layers.find((layer) => layer.name === "collision").data;
  const start = [3, 25];
  const queue = [start];
  const visited = new Set([start.join(",")]);
  while (queue.length) {
    const [x, y] = queue.shift();
    for (const [nextX, nextY] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (nextX < 0 || nextY < 0 || nextX >= map.width || nextY >= map.height) continue;
      if (collision[nextY * map.width + nextX] !== 0) continue;
      const key = `${nextX},${nextY}`;
      if (visited.has(key)) continue;
      visited.add(key); queue.push([nextX, nextY]);
    }
  }
  assert.ok(visited.has("38,5"), "the Array core chamber must be reachable");
  const interactions = map.layers.find((layer) => layer.name === "interactions").objects;
  assert.ok(interactions.some((object) => properties(object).get("interactionKind") === "control-console"));
  assert.ok(interactions.some((object) => properties(object).get("equipmentId") === "meridian-guard"));
  assert.equal(map.layers.find((layer) => layer.name === "entities").objects.length, 0, "no fifth recruit waits in this labyrinth");
});

test("Sera's normal attack sweeps every living enemy", () => {
  const input = new TestInput();
  const battle = new BattleSystem(input);
  const sera = createSera();
  battle.start({ activeMemberIds: ["sera"], roster: [sera] }, createDefaultInventory(), "skitter-nest", () => undefined);
  // Complete arrival and select ATTACK. Sera never opens single-target selection.
  battle.update(2);
  input.pressed.add("confirm");
  battle.update(0);
  assert.equal(battle.view().targetingEnemy, false);
  for (let step = 0; step < 5; step += 1) battle.update(2);
  assert.ok(battle.view().enemies.every((enemy) => enemy.hp < enemy.definition.maxHp));
});
