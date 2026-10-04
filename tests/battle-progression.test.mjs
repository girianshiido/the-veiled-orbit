import assert from "node:assert/strict";
import test from "node:test";
import { applyVictoryProgress } from "../src/battle/BattleProgression.ts";

function member(id, hp, mp, experience = 0) {
  return {
    id,
    name: id === "ash" ? "ASH" : "IONE",
    role: "TEST",
    level: 1,
    experience,
    hp,
    maxHp: 30,
    mp,
    maxMp: 20,
    attack: 8,
    defense: 5,
    agility: 7,
    spells: [id === "ash" ? "arc-bolt" : "mend"],
    equipment: { weapon: null, armor: null, shield: null, core: null },
  };
}

test("a defeated member earns no experience and remains dead without recovering MP", () => {
  const ash = member("ash", 12, 7, 3);
  const ione = member("ione", 0, 4, 5);
  const results = applyVictoryProgress([ash, ione], 10);
  assert.equal(ash.experience, 13);
  assert.equal(results[0].earnedExperience, 10);
  assert.equal(ione.experience, 5);
  assert.equal(ione.hp, 0);
  assert.equal(ione.mp, 4);
  assert.equal(results[1].earnedExperience, 0);
});

test("battle experience is shared between surviving party members", () => {
  const ash = member("ash", 12, 7, 0);
  const ione = member("ione", 18, 9, 0);
  const results = applyVictoryProgress([ash, ione], 11);
  assert.deepEqual(results.map((member) => member.earnedExperience), [6, 5]);
  assert.equal(ash.experience, 6);
  assert.equal(ione.experience, 5);
});
