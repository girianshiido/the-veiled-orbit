import assert from "node:assert/strict";
import test from "node:test";
import { resolveInteraction } from "../src/world/InteractionResolver.ts";

test("a persistent cache grants its reward exactly once", () => {
  const cache = {
    id: 1,
    name: "test-cache",
    x: 0,
    y: 0,
    width: 16,
    height: 16,
    kind: "cache",
    text: "The cache opens.",
    emptyText: "The cache is empty.",
    flag: "cache.test.claimed",
    credits: 45,
    tonics: 2,
    returnBeacons: 1,
    equipmentId: "vault-edge",
  };
  const inventory = { credits: 5, tonics: 1, returnBeacons: 0, gear: [] };
  const flags = new Set();

  const first = resolveInteraction(cache, inventory, flags);
  assert.equal(first.changed, true);
  assert.deepEqual(inventory, { credits: 50, tonics: 3, returnBeacons: 1, gear: ["vault-edge"] });
  assert.match(first.text, /RETURN BEACON/);
  assert.match(first.text, /VAULT EDGE/);
  assert.ok(flags.has("cache.test.claimed"));

  const second = resolveInteraction(cache, inventory, flags);
  assert.equal(second.changed, false);
  assert.equal(second.text, "The cache is empty.");
  assert.deepEqual(inventory, { credits: 50, tonics: 3, returnBeacons: 1, gear: ["vault-edge"] });
});

test("a sealed cache waits for its story flag before granting equipment", () => {
  const cache = {
    kind: "cache",
    flag: "cache.tower-aegis",
    requiredFlag: "tower.signal-wraith-defeated",
    text: "The cache opens.",
    emptyText: "The interference field seals this cache.",
    credits: 0,
    tonics: 0,
    returnBeacons: 0,
    equipmentId: "tower-aegis",
  };
  const inventory = { credits: 0, tonics: 0, returnBeacons: 0, gear: [] };
  const flags = new Set();
  const sealed = resolveInteraction(cache, inventory, flags);
  assert.equal(sealed.changed, false);
  assert.equal(inventory.gear.length, 0);
  flags.add("tower.signal-wraith-defeated");
  const opened = resolveInteraction(cache, inventory, flags);
  assert.equal(opened.changed, true);
  assert.deepEqual(inventory.gear, ["tower-aegis"]);
});

test("a restored control array reports its stable state instead of its missing-specialist warning", () => {
  const console = {
    kind: "control-console",
    flag: "tower.west-restored",
    requiredFlag: "party.nox-recruited",
    text: "Nox restores the array.",
    emptyText: "The array is too specialized to repair without Nox.",
  };
  const inventory = { credits: 0, tonics: 0, returnBeacons: 0, gear: [] };
  const flags = new Set(["party.nox-recruited"]);
  const restored = resolveInteraction(console, inventory, flags);
  assert.equal(restored.changed, true);
  assert.ok(flags.has("tower.west-restored"));
  const repeat = resolveInteraction(console, inventory, flags);
  assert.equal(repeat.changed, false);
  assert.match(repeat.text, /Southern transmission is stable/);
});
