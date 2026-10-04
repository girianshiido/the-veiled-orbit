import assert from "node:assert/strict";
import test from "node:test";
import { DialogueSystem } from "../src/dialogue/DialogueSystem.ts";

class TestInput {
  pressed = new Set();

  consumePress(action) {
    if (!this.pressed.has(action)) return false;
    this.pressed.delete(action);
    return true;
  }

  clearPresses() {
    this.pressed.clear();
  }
}

test("both shuttle confirmations board only when accepted", () => {
  for (const id of ["board-skyglass-shuttle", "board-cradle-return-shuttle"]) {
    const input = new TestInput(), dialogue = new DialogueSystem(input);
    let trips = 0;
    dialogue.start(id, () => { trips++; });
    dialogue.update(100);
    input.pressed.add("down"); dialogue.update(0);
    input.pressed.add("confirm"); dialogue.update(0);
    assert.equal(trips, 0);
    dialogue.start(id, () => { trips++; });
    dialogue.update(100);
    input.pressed.add("confirm"); dialogue.update(0);
    assert.equal(trips, 1);
  }
});

test("the ferry confirmation travels only when Cross the sea is chosen", () => {
  const input = new TestInput();
  const dialogue = new DialogueSystem(input);
  let departures = 0;

  dialogue.start("board-southern-ferry", () => { departures += 1; });
  dialogue.update(100);
  input.pressed.add("down");
  dialogue.update(0);
  input.pressed.add("confirm");
  dialogue.update(0);
  assert.equal(departures, 0);
  assert.equal(dialogue.active, false);

  dialogue.start("board-southern-ferry", () => { departures += 1; });
  dialogue.update(100);
  input.pressed.add("confirm");
  dialogue.update(0);
  assert.equal(departures, 1);
  assert.equal(dialogue.active, false);
});
