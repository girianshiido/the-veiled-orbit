import assert from "node:assert/strict";
import test from "node:test";
import { isWithinServiceDoor, saveCounterExitPosition, serviceDoorExitPosition, serviceDoorThreshold } from "../src/world/ServiceDoor.ts";

const door = { x: 104, y: 80, width: 16, height: 16 };

test("shop doors use their visible rectangle and accept symmetric off-centre approaches", () => {
  assert.deepEqual(serviceDoorThreshold(door), { left: 104, right: 120, top: 80, bottom: 96 });
  assert.equal(isWithinServiceDoor(door, 96, 96, "right"), true);
  assert.equal(isWithinServiceDoor(door, 128, 96, "left"), true);
  assert.equal(isWithinServiceDoor(door, 95, 96, "right"), false);
  assert.equal(isWithinServiceDoor(door, 129, 96, "left"), false);
  assert.equal(isWithinServiceDoor(door, 112, 98, "up"), true);
  assert.equal(isWithinServiceDoor(door, 112, 101, "up"), true);
  assert.equal(isWithinServiceDoor(door, 112, 102, "up"), false);
  assert.equal(isWithinServiceDoor(door, 112, 95, "up"), false);
});

test("shop doors reject an approach from behind", () => {
  assert.equal(isWithinServiceDoor(door, 112, 95, "down"), false);
  assert.equal(isWithinServiceDoor(door, 112, 96, "down"), false);
  assert.equal(isWithinServiceDoor(door, 112, 98, "down"), false);
});

test("lateral entry requires approaching the door rather than leaving its centre", () => {
  assert.equal(isWithinServiceDoor(door, 112, 99, "left"), false);
  assert.equal(isWithinServiceDoor(door, 112, 99, "right"), false);
  assert.equal(isWithinServiceDoor(door, 100, 99, "right"), true);
  assert.equal(isWithinServiceDoor(door, 124, 99, "left"), true);
});

test("leaving a shop keeps Ash close enough to re-enter deliberately", () => {
  const position = serviceDoorExitPosition(door, 12, 15);
  assert.deepEqual(position, { x: 106, y: 84 });
  assert.equal(position.x + 6, 112);
  assert.equal(position.y + 15, 99);
  assert.equal(isWithinServiceDoor(door, position.x + 6, position.y + 15, "up"), true);
});

test("loading a village record places Ash outside its memory counter", () => {
  const counter = { ...door, kind: "save-shop" };
  const position = saveCounterExitPosition([{ ...door, kind: "item-shop" }, counter], 12, 15);
  assert.deepEqual(position, { x: 106, y: 84 });
  assert.equal(isWithinServiceDoor(counter, position.x + 6, position.y + 15, "up"), true);
});
