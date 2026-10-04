import assert from "node:assert/strict";
import test from "node:test";
import { EncounterDirector } from "../src/world/EncounterDirector.ts";

function mapWithZones() {
  return {
    id: "test-field",
    encounterZones: [
      {
        id: 1,
        name: "west",
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        biome: "grass",
        minDistance: 1,
        maxDistance: 1,
        entries: [
          { formationId: "mite-cluster", weight: 1 },
          { formationId: "glint-pair", weight: 1 },
        ],
      },
      {
        id: 2,
        name: "east",
        x: 100,
        y: 0,
        width: 100,
        height: 100,
        biome: "glass",
        minDistance: 1,
        maxDistance: 1,
        entries: [{ formationId: "dust-escort", weight: 1 }],
      },
    ],
  };
}

test("encounter director changes weighted tables at biome boundaries", () => {
  const rolls = [0, 0.75, 0, 0, 0, 0];
  const director = new EncounterDirector(() => rolls.shift() ?? 0);
  const map = mapWithZones();

  assert.equal(director.update(map, 20, 20, 2), "glint-pair");
  assert.equal(director.update(map, 150, 20, 2), "dust-escort");
  assert.equal(director.update(map, 250, 20, 20), null, "safe space outside every zone should not encounter enemies");
});

test("reaching Vesper reinforces the northern world with larger familiar groups", () => {
  const director = new EncounterDirector(() => 0);
  const map = {
    id: "glass-steppe",
    encounterZones: [{
      id: 1,
      name: "northwest",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      biome: "verdant-west",
      minDistance: 1,
      maxDistance: 1,
      entries: [{ formationId: "prism-mite", weight: 1 }],
    }],
  };
  assert.equal(director.update(map, 20, 20, 2), "prism-mite");
  director.reset();
  assert.equal(director.update(map, 20, 20, 2, new Set(["village.vesper-crossing.visited"])), "mite-cluster");
});
