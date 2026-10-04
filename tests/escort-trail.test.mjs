import assert from "node:assert/strict";
import test from "node:test";
import { EscortTrail } from "../src/world/EscortTrail.ts";

const player = (x, y, direction = "right") => ({ x, y, direction, frame: 1, animationTime: 0 });

test("Mira follows Ash's recorded route through a corner instead of cutting through its inside", () => {
  const trail = new EscortTrail();
  trail.reset(player(0, 0));
  for (let x = 1; x <= 20; x += 1) trail.record(player(x, 0, "right"));
  for (let y = 1; y <= 5; y += 1) trail.record(player(20, y, "down"));
  const follower = trail.follower(true);
  assert.deepEqual({ x: follower.x, y: follower.y }, { x: 11, y: 0 });
  assert.equal(trail.follower(false), null);
});

test("resetting the trail prevents Mira from walking through a map transition", () => {
  const trail = new EscortTrail();
  trail.reset(player(10, 10));
  trail.record(player(20, 10));
  trail.reset(player(300, 180, "up"));
  assert.deepEqual({ x: trail.follower(true).x, y: trail.follower(true).y }, { x: 300, y: 194 });
});
