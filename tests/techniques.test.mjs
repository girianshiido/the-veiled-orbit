import assert from "node:assert/strict";
import test from "node:test";

import { BattleSystem } from "../src/battle/BattleSystem.ts";
import { createAsh, createDefaultInventory, createIone, createNox } from "../src/battle/battleData.ts";
import { SPELLS } from "../src/progression/spellData.ts";

class FakeInput {
  presses = new Set();
  press(action) { this.presses.add(action); }
  clearPresses() { this.presses.clear(); }
  consumePress(action) {
    if (!this.presses.has(action)) return false;
    this.presses.delete(action);
    return true;
  }
}

function readyBattle(members) {
  const input = new FakeInput();
  const battle = new BattleSystem(input);
  battle.start({ activeMemberIds: members.map((member) => member.id), roster: members }, createDefaultInventory(), "prism-mite", () => {});
  battle.update(1);
  return { battle, input };
}

function openTechniqueMenu(battle, input) {
  input.press("down");
  battle.update(0);
  input.press("confirm");
  battle.update(0);
  assert.equal(battle.view()?.actions[1], "TECH");
  assert.equal(battle.view()?.choosingSpell, true);
}

test("all three heroes own a distinct starting technique", () => {
  assert.deepEqual(createAsh().spells, ["arc-bolt"]);
  assert.deepEqual(createIone().spells, ["mend"]);
  assert.deepEqual(createNox().spells, ["pulse-round"]);
  assert.equal(SPELLS["pulse-round"].defensePiercing, 0.45);
});

test("Guard Pulse targets a chosen ally and applies a visible barrier", () => {
  const ash = createAsh();
  const ione = createIone();
  ash.spells = ["guard-pulse"];
  const { battle, input } = readyBattle([ash, ione]);
  openTechniqueMenu(battle, input);

  input.press("confirm");
  battle.update(0);
  assert.equal(battle.view()?.targetingMember, true);
  assert.equal(battle.view()?.selectedMemberId, "ash");
  input.press("right");
  battle.update(0);
  assert.equal(battle.view()?.selectedMemberId, "ione");
  input.press("confirm");
  battle.update(0);

  input.press("right");
  battle.update(0);
  input.press("confirm");
  battle.update(0);
  battle.update(1);
  battle.update(1);
  assert.deepEqual(battle.view()?.memberStatuses.ione, [{ id: "barrier", turns: 2 }]);
});

test("Signal Break weakens an enemy without dealing artificial damage", () => {
  const ione = createIone();
  ione.spells = ["signal-break"];
  const { battle, input } = readyBattle([ione]);
  openTechniqueMenu(battle, input);
  input.press("confirm");
  battle.update(0);
  battle.update(1);
  assert.equal(battle.view()?.enemies[0]?.hp, battle.view()?.enemies[0]?.definition.maxHp);
  assert.deepEqual(battle.view()?.enemies[0]?.statuses, [{ id: "weaken", turns: 3 }]);
});

test("Overclock is a self-targeted Nox technique", () => {
  const nox = createNox();
  nox.spells = ["overclock"];
  const { battle, input } = readyBattle([nox]);
  openTechniqueMenu(battle, input);
  input.press("confirm");
  battle.update(0);
  battle.update(1);
  assert.deepEqual(battle.view()?.memberStatuses.nox, [{ id: "overclock", turns: 3 }]);
});
