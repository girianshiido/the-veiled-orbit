import assert from "node:assert/strict";
import test from "node:test";
import { BattleSystem } from "../src/battle/BattleSystem.ts";
import { createDefaultInventory, createDefaultParty } from "../src/battle/battleData.ts";

class TestInput {
  pressed = new Set();
  clearCount = 0;

  consumePress(action) {
    if (!this.pressed.has(action)) return false;
    this.pressed.delete(action);
    return true;
  }

  clearPresses() {
    this.pressed.clear();
    this.clearCount += 1;
  }
}

test("starting a battle discards the direction that triggered the encounter", () => {
  const input = new TestInput();
  input.pressed.add("up");
  const battle = new BattleSystem(input);
  battle.start(createDefaultParty(), createDefaultInventory(), "prism-mite", () => undefined);
  battle.update(1);
  battle.update(0);
  assert.equal(input.clearCount, 2);
  assert.equal(battle.view().selectedAction, 0);
});

test("confirm pressed during the arrival animation cannot preselect a battle command", () => {
  const input = new TestInput();
  const battle = new BattleSystem(input);
  battle.start(createDefaultParty(), createDefaultInventory(), "prism-mite", () => undefined);
  input.pressed.add("confirm");
  battle.update(1);
  battle.update(0);
  assert.equal(battle.view().selectedAction, 0);
  assert.equal(battle.view().targetingEnemy, false);
  assert.equal(input.pressed.has("confirm"), false);
});
