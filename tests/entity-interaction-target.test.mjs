import assert from "node:assert/strict";
import test from "node:test";
import { nearestInteractionEntity } from "../src/world/EntityInteractionTarget.ts";

test("the closest villager receives the conversation when Mira stands beside her father", () => {
  const mayor = { name: "Mayor Orren", x: 208, y: 160 };
  const mira = { name: "Mira", x: 224, y: 160 };
  assert.equal(nearestInteractionEntity([mayor, mira], 234, 168)?.name, "Mira");
  assert.equal(nearestInteractionEntity([mayor, mira], 214, 168)?.name, "Mayor Orren");
});

test("a shuttle is boarded from its southern ramp, never through its nose or wings", () => {
  const ship = { name: "Atmospheric Shuttle", spriteId: "cradle-shuttle", x: 160, y: 160 };
  assert.equal(nearestInteractionEntity([ship],168,184),ship);
  assert.equal(nearestInteractionEntity([ship],168,150),undefined);
  assert.equal(nearestInteractionEntity([ship],152,168),undefined);
});
