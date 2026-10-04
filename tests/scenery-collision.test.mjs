import assert from "node:assert/strict";
import test from "node:test";
import { sceneryBlocksFeet, sceneryFootprintRect } from "../src/world/SceneryCollision.ts";

const memory = {
  x: 240, y: 144, width: 80, height: 80,
  footprintX: 10, footprintY: 64, footprintWidth: 59, footprintHeight: 16,
};
test("building footprints use their visible pixel width instead of whole tiles", () => {
  assert.deepEqual(sceneryFootprintRect(memory), { left: 250, top: 208, right: 309, bottom: 224 });
  assert.equal(sceneryBlocksFeet(memory, { left: 310, top: 208, right: 312, bottom: 211 }), false);
  assert.equal(sceneryBlocksFeet(memory, { left: 308, top: 208, right: 310, bottom: 211 }), true);
});

test("the painted service threshold remains physically solid", () => {
  assert.equal(sceneryBlocksFeet(memory, { left: 279, top: 208, right: 281, bottom: 211 }), true);
  assert.equal(sceneryBlocksFeet(memory, { left: 268, top: 208, right: 270, bottom: 211 }), true);
});

test("a world village transition landmark never blocks movement at its footprint", () => {
  const village = { ...memory, blocksMovement: false };
  assert.equal(sceneryBlocksFeet(village, { left: 268, top: 208, right: 280, bottom: 216 }), false);
});

test("the cropped Vesper armor shop can be brushed past on both sides", () => {
  const armorShop = {
    x: 256, y: 128, width: 64, height: 80,
    footprintX: 4, footprintY: 64, footprintWidth: 44, footprintHeight: 16,
  };
  assert.deepEqual(sceneryFootprintRect(armorShop), { left: 260, top: 192, right: 304, bottom: 208 });
  assert.equal(sceneryBlocksFeet(armorShop, { left: 251, top: 196, right: 260, bottom: 199 }), false);
  assert.equal(sceneryBlocksFeet(armorShop, { left: 304, top: 196, right: 313, bottom: 199 }), false);
});
