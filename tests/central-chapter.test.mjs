import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { synchronizeCentralQuestFlags, centralChapterDialogue } from "../src/world/CentralTowerQuest.ts";
import { resolveInteraction } from "../src/world/InteractionResolver.ts";
import { DIALOGUES } from "../src/dialogue/dialogues.ts";
import { ENEMIES, FORMATIONS, createAsh, createIone, createNox, createSera, createDefaultInventory } from "../src/battle/battleData.ts";
import { BattleSystem } from "../src/battle/BattleSystem.ts";
import { EQUIPMENT, canEquip, isCarbineEquipment } from "../src/progression/equipmentData.ts";
import { statsForLevel } from "../src/progression/levelData.ts";

const maps = new URL("../public/assets/maps/", import.meta.url);
const readMap = async (id) => JSON.parse(await readFile(new URL(`${id}.json`, maps), "utf8"));
const props = (o) => Object.fromEntries((o.properties ?? []).map((p) => [p.name, p.value]));
const layer = (map, name) => map.layers.find((l) => l.name === name).objects;

function reachable(map, start, flags = new Set()) {
  const blocked = new Set();
  const collision = map.layers.find((l) => l.name === "collision").data;
  layer(map, "interactions").filter((o) => props(o).interactionKind === "barrier" && !flags.has(props(o).requiredFlag)).forEach((o) => {
    for (let y = o.y / 16; y < (o.y + o.height) / 16; y++) for (let x = o.x / 16; x < (o.x + o.width) / 16; x++) blocked.add(`${x},${y}`);
  });
  const queue = [start], visited = new Set([start.join(",")]);
  for (let index = 0; index < queue.length; index++) {
    const [x, y] = queue[index];
    for (const [nx, ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]) {
      const key = `${nx},${ny}`;
      if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height || collision[ny * map.width + nx] || blocked.has(key) || visited.has(key)) continue;
      visited.add(key); queue.push([nx,ny]);
    }
  }
  return visited;
}

test("Meridian key unlocks the central vestibule without introducing random combat", async () => {
  const map = await readMap("central-control-entry");
  assert.equal(layer(map, "encounters").length, 0);
  assert.equal(reachable(map, [12,15]).has("12,1"), false);
  assert.equal(reachable(map, [12,15], new Set(["array.meridian-core-read"])).has("12,1"), true);
});

test("both side relays are reachable, and neither alone can bypass the upper seal", async () => {
  const map = await readMap("central-control-galleries");
  const flags = new Set();
  const inventory = createDefaultInventory();
  const relays = layer(map, "interactions").filter((o) => props(o).interactionKind === "control-console");
  const before = reachable(map, [20,31], flags);
  assert.ok(before.size > 300);
  for (const relay of relays) assert.ok(before.has(`${relay.x / 16},${relay.y / 16 + 1}`));
  assert.equal(before.has("20,1"), false);
  for (const [index, relay] of relays.entries()) {
    const interaction = { ...props(relay), kind: props(relay).interactionKind };
    assert.equal(resolveInteraction(interaction, inventory, flags).changed, true);
    synchronizeCentralQuestFlags(flags);
    assert.equal(flags.has("relay.central-gate-open"), index === 1);
    assert.equal(reachable(map, [20,31], flags).has("20,1"), index === 1);
    assert.equal(resolveInteraction(interaction, inventory, flags).text, interaction.restoredText);
  }
});

test("all chapter transitions land on clear tiles and have routes to the return stairs", async () => {
  const flags = new Set(["array.meridian-core-read", "relay.central-gate-open", "tower.archive-custodian-defeated"]);
  for (const id of ["central-control-entry", "central-control-galleries", "central-control-archives", "central-control-core"]) {
    const map = await readMap(id);
    for (const trigger of layer(map, "triggers")) {
      const p = props(trigger), target = await readMap(p.targetMap);
      const collision = target.layers.find((l) => l.name === "collision").data;
      assert.equal(collision[p.targetY * target.width + p.targetX], 0, `${id}:${trigger.name} landing is blocked`);
    }
    const start = id.endsWith("entry") ? [12,15] : id.endsWith("galleries") ? [20,31] : id.endsWith("archives") ? [17,25] : [13,19];
    const visited = reachable(map, start, flags);
    for (const t of layer(map, "triggers")) assert.ok(visited.has(`${Math.floor((t.x + t.width / 2) / 16)},${Math.floor(t.y / 16)}`), `${id}:${t.name} is unreachable`);
    for (const o of layer(map, "interactions").filter((o) => props(o).interactionKind !== "barrier")) {
      assert.ok(visited.has(`${o.x / 16},${o.y / 16 + 1}`), `${id}:${o.name} has no southern approach`);
    }
  }
});

test("Custodian seals the archive until victory; core dialogue and one-time loot then become available", async () => {
  const map = await readMap("central-control-core");
  const flags = new Set();
  assert.equal(layer(map, "encounters").length, 0);
  const guardian = layer(map, "entities")[0], p = props(guardian);
  assert.equal(FORMATIONS[p.battleFormation].boss, true);
  assert.equal(p.hiddenFlag, p.defeatFlag);
  assert.equal(reachable(map, [13,19], flags).has("13,6"), false);
  const core = layer(map, "interactions").find((o) => props(o).interactionKind === "control-console");
  const interaction = { ...props(core), kind: "control-console" };
  const inventory = createDefaultInventory();
  assert.equal(resolveInteraction(interaction, inventory, flags).changed, false);
  flags.add(p.defeatFlag);
  assert.equal(reachable(map, [13,19], flags).has("13,6"), true);
  assert.equal(resolveInteraction(interaction, inventory, flags).changed, true);
  assert.ok(flags.has("quest.central-archive-read"));
  assert.ok(DIALOGUES[interaction.dialogueId]);
  for (const o of layer(map, "interactions").filter((o) => props(o).interactionKind === "cache")) {
    const cache = { ...props(o), kind: "cache" };
    assert.equal(resolveInteraction(cache, inventory, flags).changed, true);
    const credits = inventory.credits;
    assert.equal(resolveInteraction(cache, inventory, flags).changed, false);
    assert.equal(inventory.credits, credits);
  }
});

test("new weapons improve southern gear and retain character identities", () => {
  for (const [member, next, previous] of [["ash","dawn-saber","tidebreaker-saber"],["ione","prism-lash","mooncurrent-lash"],["nox","cipher-carbine","harbor-carbine"],["sera","horizon-disc","meridian-disc"]]) {
    assert.ok(canEquip(member, next));
    assert.ok(EQUIPMENT[next].attack > EQUIPMENT[previous].attack);
  }
  assert.equal(isCarbineEquipment("cipher-carbine"), true);
  assert.equal(centralChapterDialogue("vesper-engineer", new Set()), null);
  assert.equal(centralChapterDialogue("vesper-engineer", new Set(["array.meridian-core-read"])), "rhea-meridian-key");
  assert.equal(centralChapterDialogue("vesper-engineer", new Set(["array.meridian-core-read", "quest.central-archive-read"])), "rhea-archive-after");
});

test("Custodian warns one action before its group attack", () => {
  const input = { clearPresses() {}, consumePress() { return false; } };
  const ash = createAsh(), ione = createIone();
  const battle = new BattleSystem(input);
  battle.start({ activeMemberIds: ["ash","ione"], roster: [ash,ione] }, createDefaultInventory(), "archive-custodian", () => {});
  battle.update(1);
  const boss = battle.enemies[0];
  assert.ok(boss.definition.maxHp > ENEMIES["archive-custodian"].maxHp);
  boss.actionsTaken = 2;
  battle.executeEnemyCommand(boss);
  assert.equal(boss.intent, "PHASE NOVA");
  assert.match(battle.view().message, /prepares PHASE NOVA/);
  battle.update(0.91);
  assert.match(battle.view().message, /DEFEND/);
  battle.executeEnemyCommand(boss);
  assert.equal(boss.intent, null);
  assert.equal(battle.view().effect, "weaken");
});

test("an equipped level-22 quartet can finish the real Custodian battle and receive rewards", () => {
  const members = [createAsh(),createIone(),createNox(),createSera()];
  const weapons = ["dawn-saber","prism-lash","cipher-carbine","horizon-disc"];
  members.forEach((member,index) => {
    Object.assign(member, statsForLevel(member.id,22));
    member.level = 22; member.hp = member.maxHp; member.mp = member.maxMp;
    member.equipment.weapon = weapons[index];
    member.equipment.shield = "meridian-guard";
    member.equipment.armor = index === 0 || index === 2 ? "pelagic-mail" : "current-weave";
  });
  const input = { pressed: new Set(), clearPresses() { this.pressed.clear(); }, consumePress(action) { return this.pressed.delete(action); } };
  const inventory = createDefaultInventory();
  const before = inventory.credits;
  inventory.tonics = 15;
  const battle = new BattleSystem(input);
  let outcome = null, sawWarning = false, sawResults = false;
  // Fix random damage variation, not the combat rules or enemy AI.
  const random = Math.random;
  Math.random = () => 0.5;
  try {
    battle.start({ activeMemberIds: members.map((member) => member.id), roster: members }, inventory, "archive-custodian", (result) => { outcome = result; });
    for (let tick = 0; tick < 3000 && battle.active; tick++) {
      const view = battle.view();
      if (view?.enemies.some((enemy) => enemy.intent === "PHASE NOVA")) sawWarning = true;
      if (view?.results) sawResults = true;
      if (view?.acceptingCommand) {
        const charged = view.enemies.some((enemy) => enemy.intent !== null);
        if (view.activeMemberId === "ione" && members.some((member) => member.hp > 0 && member.hp < member.maxHp * 0.65) && inventory.tonics > 0) input.pressed.add("up");
        else if (charged) input.pressed.add("right");
        input.pressed.add("confirm");
      } else if (view?.results) input.pressed.add("confirm");
      battle.update(0.15);
    }
    assert.equal(outcome, "victory");
    assert.ok(sawWarning, "the boss must survive long enough to demonstrate its charged attack");
    assert.ok(sawResults);
    assert.ok(members.every((member) => member.hp > 0));
    assert.ok(inventory.credits > before);
  } finally { Math.random = random; }
});

test("new map conversations and terminal chains resolve completely", async () => {
  for (const id of ["central-control-entry","central-control-galleries","central-control-archives","central-control-core","meridian-array"]) {
    const map = await readMap(id);
    for (const object of [...layer(map,"entities"),...layer(map,"narrative"),...layer(map,"interactions")]) {
      const p = props(object);
      for (const key of ["dialogueId","dialogueAfterId","dialogueMiddleId","victoryDialogueId"]) {
        let next = p[key], visited = new Set();
        while (next) {
          assert.ok(DIALOGUES[next], `${id}:${object.name} references missing dialogue ${next}`);
          assert.ok(!visited.has(next), `${object.name} contains a dialogue loop`);
          visited.add(next); next = DIALOGUES[next].next;
        }
      }
    }
  }
});
