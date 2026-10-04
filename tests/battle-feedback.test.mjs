import assert from "node:assert/strict";
import test from "node:test";

import { BattleSystem } from "../src/battle/BattleSystem.ts";
import { createAsh, createDefaultInventory, createIone, createNox } from "../src/battle/battleData.ts";


class FakeInput {
  presses = new Set();

  press(action) {
    this.presses.add(action);
  }

  clearPresses() {
    this.presses.clear();
  }

  consumePress(action) {
    if (!this.presses.has(action)) return false;
    this.presses.delete(action);
    return true;
  }
}


function commandReadyBattle(member = createAsh()) {
  const input = new FakeInput();
  const battle = new BattleSystem(input);
  const party = { activeMemberIds: [member.id], roster: [member] };
  battle.start(party, createDefaultInventory(), "prism-mite", () => {});
  battle.update(1);
  assert.equal(battle.view()?.acceptingCommand, true);
  return { battle, input, member };
}


test("enemy damage produces a targeted number and defeat fade marker", () => {
  const ash = createAsh();
  ash.attack = 999;
  const { battle, input } = commandReadyBattle(ash);

  input.press("confirm");
  battle.update(0);
  assert.equal(battle.view()?.animation, "hero-strike");

  battle.update(1);
  const impact = battle.view();
  assert.equal(impact?.animation, "enemy-hit");
  assert.equal(impact?.popups.length, 1);
  assert.match(impact?.popups[0]?.text ?? "", /^-\d+$/);
  assert.equal(impact?.popups[0]?.tone, "damage");
  assert.equal(impact?.popups[0]?.targetEnemyId, "prism-mite-0");
  assert.deepEqual(impact?.defeatedEnemyIds, ["prism-mite-0"]);

  battle.update(1);
  const victory = battle.view();
  assert.equal(victory?.animation, "victory");
  assert.equal(victory?.message, "Hostile formation dispersed.");

  battle.update(1);
  assert.ok(battle.view()?.results);
});

test("Nox fires an equipped carbine instead of closing to melee range", () => {
  const nox = createNox();
  nox.equipment.weapon = "relay-carbine";
  const { battle, input } = commandReadyBattle(nox);
  input.press("confirm");
  battle.update(0);
  assert.equal(battle.view()?.animation, "hero-strike");
  assert.equal(battle.view()?.animationMemberId, "nox");
  assert.equal(battle.view()?.message, "NOX fires his carbine.");
});


test("confirm pressed during victory cannot dismiss the results screen", () => {
  const ash = createAsh();
  ash.attack = 999;
  const input = new FakeInput();
  const battle = new BattleSystem(input);
  const party = { activeMemberIds: [ash.id], roster: [ash] };
  let outcome = null;
  battle.start(party, createDefaultInventory(), "prism-mite", (value) => { outcome = value; });
  battle.update(1);
  input.press("confirm");
  battle.update(0);
  battle.update(1);
  assert.equal(battle.view()?.animation, "enemy-hit");
  input.press("confirm");
  battle.update(1);
  assert.equal(battle.view()?.animation, "victory");
  input.press("confirm");
  battle.update(1);
  assert.ok(battle.view()?.results);
  assert.equal(battle.active, true);
  assert.equal(outcome, null);
  battle.update(0);
  assert.equal(battle.active, true);
  input.press("confirm");
  battle.update(0);
  assert.equal(battle.active, false);
  assert.equal(outcome, "victory");
});


test("a Field Tonic produces a green healing number over its target", () => {
  const ash = createAsh();
  ash.hp = 8;
  const { battle, input } = commandReadyBattle(ash);

  input.press("down");
  battle.update(0);
  input.press("down");
  battle.update(0);
  input.press("confirm");
  battle.update(0);

  const healing = battle.view();
  assert.equal(healing?.animation, "hero-cast");
  assert.deepEqual(healing?.popups, [{
    text: "+16",
    tone: "heal",
    targetMemberId: "ash",
  }]);
  assert.equal(ash.hp, 24);
});


test("Arc Bolt stops rendering when its single impact phase begins", () => {
  const { battle, input } = commandReadyBattle();

  input.press("down");
  battle.update(0);
  input.press("confirm");
  battle.update(0);
  input.press("confirm");
  battle.update(0);

  assert.equal(battle.view()?.animation, "hero-cast");
  assert.equal(battle.view()?.effect, "arc-bolt");

  battle.update(1);
  assert.equal(battle.view()?.animation, "enemy-hit");
  assert.equal(battle.view()?.effect, "none");
});


test("B walks back through previously chosen party commands", () => {
  const ash = createAsh();
  const ione = createIone();
  const nox = createNox();
  const input = new FakeInput();
  const battle = new BattleSystem(input);
  battle.start(
    { activeMemberIds: [ash.id, ione.id, nox.id], roster: [ash, ione, nox] },
    createDefaultInventory(),
    "prism-mite",
    () => {},
  );
  battle.update(1);

  input.press("confirm");
  battle.update(0);
  assert.equal(battle.view()?.activeMemberId, "ione");
  input.press("right");
  battle.update(0);
  input.press("confirm");
  battle.update(0);
  assert.equal(battle.view()?.activeMemberId, "nox");

  input.press("menu");
  battle.update(0);
  assert.equal(battle.view()?.activeMemberId, "ione");
  assert.equal(battle.view()?.selectedAction, 3);

  input.press("menu");
  battle.update(0);
  assert.equal(battle.view()?.activeMemberId, "ash");
  assert.equal(battle.view()?.selectedAction, 0);

  input.press("menu");
  battle.update(0);
  assert.equal(battle.view()?.activeMemberId, "ash");
  assert.match(battle.view()?.message ?? "", /no earlier command/i);
});
