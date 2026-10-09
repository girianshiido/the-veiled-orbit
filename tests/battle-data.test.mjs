import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ENEMIES, FORMATIONS } from "../src/battle/battleData.ts";

function definition(source, enemyId) {
  const match = source.match(new RegExp(`  "${enemyId}": \\{([\\s\\S]*?)\\n  \\},`));
  assert.ok(match, `missing enemy definition ${enemyId}`);
  const block = match[1];
  const number = (property) => Number(block.match(new RegExp(`${property}: (\\d+)`))?.[1]);
  const theme = block.match(/battleTheme: "([a-z-]+)"/)?.[1];
  return { maxHp: number("maxHp"), attack: number("attack"), defense: number("defense"), agility: number("agility"), experience: number("experience"), credits: number("credits"), theme };
}

test("the first enemy roster has distinct tactical profiles and rewards", async () => {
  const source = await readFile(new URL("../src/battle/battleData.ts", import.meta.url), "utf8");
  const mite = definition(source, "prism-mite");
  const hopper = definition(source, "glint-hopper");
  const sentinel = definition(source, "dust-sentinel");
  const stalker = definition(source, "vault-stalker");
  const warden = definition(source, "phase-warden");
  const hunter = definition(source, "rift-hunter");
  const colossus = definition(source, "storm-colossus");
  const wasp = definition(source, "relay-wasp");
  const hound = definition(source, "circuit-hound");
  const knight = definition(source, "coil-knight");
  const specter = definition(source, "aegis-specter");
  const wraith = definition(source, "signal-wraith");
  assert.ok(hopper.agility > mite.agility);
  assert.ok(hopper.maxHp < mite.maxHp);
  assert.ok(sentinel.defense > mite.defense);
  assert.ok(sentinel.experience > mite.experience);
  assert.ok(sentinel.credits > mite.credits);
  assert.ok(stalker.maxHp > sentinel.maxHp);
  assert.ok(stalker.agility > sentinel.agility);
  assert.ok(warden.maxHp > stalker.maxHp);
  assert.ok(warden.defense > sentinel.defense);
  assert.ok(warden.experience > stalker.experience);
  assert.ok(hunter.attack > warden.attack);
  assert.ok(colossus.attack > hunter.attack);
  assert.ok(colossus.maxHp > warden.maxHp);
  assert.ok(wasp.agility > hound.agility);
  assert.ok(hound.attack > wasp.attack);
  assert.ok(knight.defense > hound.defense);
  assert.ok(specter.agility > knight.agility);
  assert.ok(specter.experience > knight.experience);
  assert.ok(wraith.attack > knight.attack);
  assert.ok(wraith.experience > knight.experience);
  assert.equal(new Set([mite.theme, hopper.theme, sentinel.theme]).size, 3);
});

test("battle formations combine one to three known enemies", async () => {
  const formations = Object.values(FORMATIONS);
  assert.ok(formations.length >= 57);
  for (const formation of formations) {
    assert.ok(formation.enemyIds.length >= 1 && formation.enemyIds.length <= 3, `${formation.id} has an invalid group size`);
    formation.enemyIds.forEach(id => assert.ok(ENEMIES[id], `${formation.id} references ${id}`));
  }
  assert.ok(formations.some(formation => formation.enemyIds.length === 3));
});
