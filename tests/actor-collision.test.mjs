import assert from "node:assert/strict";
import test from "node:test";
import {
  entityCollisionRect,
  movementBlockedByRect,
  playerCollisionRect,
  playerDungeonTerrainCollisionRect,
  playerSceneryCollisionRect,
  playerTerrainCollisionRect,
  rectanglesOverlap,
} from "../src/world/ActorCollision.ts";

test("an NPC body blocks the player while edge contact remains possible", () => {
  const player = playerCollisionRect(0, 0);
  assert.equal(rectanglesOverlap(player, entityCollisionRect(7, 0)), true);
  assert.equal(rectanglesOverlap(player, entityCollisionRect(8, 0)), false);
});

test("an interlocked player can move out of an NPC but never farther through it", () => {
  const npc = entityCollisionRect(7, 0);
  const trapped = playerCollisionRect(0, 0);
  const fartherInside = playerCollisionRect(1, 0);
  const firstEscapeStep = playerCollisionRect(-1, 0);
  const tangentialStep = playerCollisionRect(0, 1);
  assert.equal(movementBlockedByRect(trapped, fartherInside, npc), true);
  assert.equal(movementBlockedByRect(trapped, tangentialStep, npc), true);
  assert.equal(movementBlockedByRect(trapped, firstEscapeStep, npc), false);
  assert.equal(movementBlockedByRect(firstEscapeStep, playerCollisionRect(-2, 0), npc), false);
});

test("precise building footprints keep the full width of Ash's boots outside", () => {
  assert.deepEqual(playerSceneryCollisionRect(0, 0), { left: 3, top: 13, right: 12, bottom: 16 });
  assert.equal(rectanglesOverlap(
    playerSceneryCollisionRect(0, 0),
    { left: 12, top: 13, right: 20, bottom: 16 },
  ), false);
});

test("moving NPC bodies cannot overlap each other", () => {
  const firstNpc = entityCollisionRect(24, 40);
  const blockedStep = entityCollisionRect(35, 40);
  const freeStep = entityCollisionRect(36, 40);
  assert.equal(rectanglesOverlap(firstNpc, blockedStep), true);
  assert.equal(rectanglesOverlap(firstNpc, freeStep), false);
});

test("tile scenery collides with Ash's feet rather than his head and torso", () => {
  const feet = playerTerrainCollisionRect(0, 0);
  const facadeAboveFeet = { left: 0, top: 0, right: 16, bottom: 13 };
  const solidBase = { left: 0, top: 15, right: 16, bottom: 16 };

  assert.deepEqual(feet, { left: 5, top: 13, right: 7, bottom: 16 });
  assert.equal(rectanglesOverlap(feet, facadeAboveFeet), false);
  assert.equal(rectanglesOverlap(feet, solidBase), true);
  assert.equal(rectanglesOverlap(feet, { left: 0, top: 13, right: 5, bottom: 16 }), false);
});

test("dungeon scenery blocks Ash's full movement body", () => {
  const body = playerDungeonTerrainCollisionRect(0, 0);
  assert.deepEqual(body, { left: 1, top: 3, right: 11, bottom: 16 });
  assert.equal(rectanglesOverlap(body, { left: 0, top: 3, right: 16, bottom: 13 }), true);
  assert.equal(rectanglesOverlap(body, { left: 11, top: 0, right: 16, bottom: 16 }), false);
});
