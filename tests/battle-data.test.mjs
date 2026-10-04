import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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
  const source = await readFile(new URL("../src/battle/battleData.ts", import.meta.url), "utf8");
  const enemyIds = new Set(["prism-mite", "glint-hopper", "dust-sentinel", "vault-stalker", "phase-warden", "rift-hunter", "storm-colossus", "relay-wasp", "circuit-hound", "coil-knight", "aegis-specter", "signal-wraith", "saltwire-crab", "reef-drone", "tidal-stalker", "abyss-sentinel", "burrow-maw", "cave-skitter", "blind-drake", "rogue-borer"]);
  const formationSource = source.slice(source.indexOf("export const FORMATIONS"));
  const formations = [...formationSource.matchAll(/^  "([a-z-]+)": (?:\{[^\n]*enemyIds: \[([^\]]+)\]|\{[\s\S]*?enemyIds: \[([^\]]+)\])/gm)];
  enemyIds.add("cipher-drone");
  enemyIds.add("archive-custodian");
  assert.equal(formations.length, 51);
  for (const match of formations) {
    const members = (match[2] ?? match[3]).match(/"([a-z-]+)"/g)?.map((id) => id.slice(1, -1)) ?? [];
    assert.ok(members.length >= 1 && members.length <= 3, `${match[1]} has an invalid group size`);
    members.forEach((enemyId) => assert.ok(enemyIds.has(enemyId), `${match[1]} references ${enemyId}`));
  }
  assert.ok(formations.some((match) => ((match[2] ?? match[3]).match(/"([a-z-]+)"/g)?.length ?? 0) === 3));
});
