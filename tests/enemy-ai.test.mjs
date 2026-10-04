import assert from "node:assert/strict";
import test from "node:test";

import { BattleSystem } from "../src/battle/BattleSystem.ts";
import { createAsh, createDefaultInventory, createIone } from "../src/battle/battleData.ts";

class FakeInput {
  presses = new Set();
  clearPresses() { this.presses.clear(); }
  consumePress(action) {
    if (!this.presses.has(action)) return false;
    this.presses.delete(action);
    return true;
  }
}

function readyBattle(formationId, members = [createAsh()]) {
  const battle = new BattleSystem(new FakeInput());
  battle.start(
    { activeMemberIds: members.map((member) => member.id), roster: members },
    createDefaultInventory(),
    formationId,
    () => {},
  );
  battle.update(1);
  return battle;
}

test("Prism Mite telegraphs its disruptive identity through SHOCK", () => {
  const ash = createAsh();
  const battle = readyBattle("prism-mite", [ash]);
  const enemy = battle.enemies[0];
  enemy.actionsTaken = 2;

  battle.executeEnemyCommand(enemy);
  assert.equal(battle.view()?.animation, "enemy-cast");
  assert.equal(battle.view()?.effect, "shock");
  assert.match(battle.view()?.message ?? "", /PRISM STING/);

  battle.update(1);
  assert.deepEqual(battle.view()?.memberStatuses.ash, [{ id: "shock", turns: 2 }]);
});

test("Dust Sentinel can protect a formation with BARRIER", () => {
  const battle = readyBattle("dust-escort");
  const sentinel = battle.enemies[0];
  sentinel.actionsTaken = 1;

  battle.executeEnemyCommand(sentinel);
  assert.equal(battle.view()?.effect, "barrier");
  assert.match(battle.view()?.message ?? "", /SENTINEL VEIL/);
  assert.deepEqual(battle.enemies[0].statuses, [{ id: "barrier", turns: 3 }]);
});

test("Storm Colossus announces STORM SURGE one action before striking everyone", () => {
  const ash = createAsh();
  const ione = createIone();
  const battle = readyBattle("storm-colossus", [ash, ione]);
  const colossus = battle.enemies[0];
  colossus.actionsTaken = 3;

  battle.executeEnemyCommand(colossus);
  assert.equal(battle.view()?.enemies[0]?.intent, "STORM SURGE");
  assert.match(battle.view()?.message ?? "", /prepares STORM SURGE/);

  const ashBefore = ash.hp;
  const ioneBefore = ione.hp;
  battle.executeEnemyCommand(colossus);
  assert.equal(battle.view()?.enemies[0]?.intent, null);
  assert.equal(battle.view()?.effect, "storm");
  assert.match(battle.view()?.message ?? "", /unleashes STORM SURGE/);
  battle.update(1);
  assert.ok(ash.hp < ashBefore);
  assert.ok(ione.hp < ioneBefore);
});

test("Mira's Archive Guardian is a reinforced boss with PHASE NOVA", () => {
  const battle = readyBattle("archive-guardian");
  const guardian = battle.enemies[0];
  assert.equal(battle.view()?.formationName, "ARCHIVE GUARDIAN");
  assert.ok(guardian.definition.maxHp > 86);
  guardian.actionsTaken = 3;
  battle.executeEnemyCommand(guardian);
  assert.equal(battle.view()?.enemies[0]?.intent, "PHASE NOVA");
});
