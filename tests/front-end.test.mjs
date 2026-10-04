import assert from "node:assert/strict";
import test from "node:test";
import { FrontEndSystem } from "../src/menu/FrontEndSystem.ts";

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
}

test("NEW GAME plays the Ash introduction before starting", () => {
  const input = new TestInput();
  const frontEnd = new FrontEndSystem(input, () => [1, 2, 3].map((slot) => ({ slot, savedAt: null })));
  frontEnd.openTitle();
  assert.equal(frontEnd.view().titleChoices[frontEnd.view().selectedChoice], "NEW GAME");
  input.press("confirm");
  assert.equal(frontEnd.update(), null);
  assert.equal(frontEnd.view().mode, "intro");
  assert.match(frontEnd.view().introPages[1], /Lumen Hollow/);
  for (let page = 0; page < 3; page += 1) {
    input.press("confirm");
    assert.equal(frontEnd.update(), null);
  }
  input.press("confirm");
  assert.deepEqual(frontEnd.update(), { kind: "new-game" });
});

test("CONTINUE selects an existing timestamped village record", () => {
  const input = new TestInput();
  const frontEnd = new FrontEndSystem(input, () => [
    { slot: 1, savedAt: null },
    { slot: 2, savedAt: 1234 },
    { slot: 3, savedAt: null },
  ]);
  frontEnd.openTitle();
  input.press("confirm");
  assert.equal(frontEnd.update(), null);
  assert.equal(frontEnd.view().mode, "continue");
  assert.equal(frontEnd.view().slots[frontEnd.view().selectedSlot].slot, 2);
  input.press("confirm");
  assert.deepEqual(frontEnd.update(), { kind: "continue", slot: 2 });
});

test("GAME OVER returns to the title without changing save data", () => {
  const input = new TestInput();
  const frontEnd = new FrontEndSystem(input, () => [{ slot: 1, savedAt: 99 }]);
  frontEnd.openGameOver();
  assert.equal(frontEnd.view().mode, "game-over");
  input.press("confirm");
  assert.equal(frontEnd.update(), null);
  assert.equal(frontEnd.view().mode, "title");
  assert.equal(frontEnd.view().slots[0].savedAt, 99);
});
