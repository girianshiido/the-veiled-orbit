import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const THEMES = [
  "title", "world", "village", "dungeon", "battle", "victory", "game-over",
  "inn", "item-shop", "weapon-shop", "armor-shop", "save-shop",
  "revival-shop", "teleport", "party-house",
];

test("every music theme ships with an OGG render and editable MIDI source", async () => {
  for (const theme of THEMES) {
    const oggPath = new URL(`../public/assets/audio/music/${theme}.ogg`, import.meta.url);
    const midiPath = new URL(`../music/midi/${theme}.mid`, import.meta.url);
    const [oggHead, midiHead, oggInfo] = await Promise.all([
      readFile(oggPath).then((data) => data.subarray(0, 4).toString("ascii")),
      readFile(midiPath).then((data) => data.subarray(0, 4).toString("ascii")),
      stat(oggPath),
    ]);
    assert.equal(oggHead, "OggS", `${theme} is not an OGG stream`);
    assert.equal(midiHead, "MThd", `${theme} is not a MIDI score`);
    assert.ok(oggInfo.size > 100_000, `${theme} render is unexpectedly small`);
  }
});
