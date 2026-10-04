import assert from "node:assert/strict";
import test from "node:test";

import { musicFileForTheme, musicThemeForMap, musicThemeForService } from "../src/audio/AudioManager.ts";

test("exploration maps select village, world and dungeon themes", () => {
  assert.equal(musicThemeForMap("lumen-hollow"), "village");
  assert.equal(musicThemeForMap("glass-steppe"), "world");
  assert.equal(musicThemeForMap("echo-vault"), "dungeon");
  assert.equal(musicThemeForMap("windscar-cliffs"), "world");
  assert.equal(musicThemeForMap("cradle-workshop"), "dungeon");
  assert.equal(musicThemeForMap("skyglass-relay"), "village");
});

test("each village service selects its own musical identity", () => {
  const services = [
    "inn",
    "item-shop",
    "weapon-shop",
    "armor-shop",
    "save-shop",
    "revival-shop",
    "teleport",
    "party-house",
  ];
  services.forEach((kind) => assert.equal(musicThemeForService(kind), kind));
  assert.equal(musicThemeForService("message"), null);
});

test("rendered themes resolve to OGG assets", () => {
  assert.equal(musicFileForTheme("battle"), "./assets/audio/music/battle.ogg");
  assert.equal(musicFileForTheme("party-house"), "./assets/audio/music/party-house.ogg");
});
