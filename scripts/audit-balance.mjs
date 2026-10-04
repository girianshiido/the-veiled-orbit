import { readFile } from "node:fs/promises";
import { ENEMIES, FORMATIONS } from "../src/battle/battleData.ts";
import { experienceForNextLevel, statsForLevel } from "../src/progression/levelData.ts";

const mapIds = ["glass-steppe", "echo-vault"];

function propertyMap(object) {
  return new Map((object.properties ?? []).map((property) => [property.name, property.value]));
}

function formationReward(formationId) {
  const formation = FORMATIONS[formationId];
  if (!formation) throw new Error(`Unknown formation: ${formationId}`);
  return formation.enemyIds.reduce((reward, enemyId) => ({
    experience: reward.experience + ENEMIES[enemyId].experience,
    credits: reward.credits + ENEMIES[enemyId].credits,
  }), { experience: 0, credits: 0 });
}

function weightedReward(table) {
  const entries = table.split(",").map((entry) => {
    const [formationId, rawWeight] = entry.split(":");
    return { formationId, weight: Number(rawWeight), reward: formationReward(formationId) };
  });
  const totalWeight = entries.reduce((total, entry) => total + entry.weight, 0);
  return entries.reduce((average, entry) => ({
    experience: average.experience + entry.reward.experience * entry.weight / totalWeight,
    credits: average.credits + entry.reward.credits * entry.weight / totalWeight,
  }), { experience: 0, credits: 0 });
}

let cumulativeExperience = 0;
console.log("LEVEL CURVE");
for (let level = 1; level <= 25; level += 1) {
  const next = experienceForNextLevel(level);
  console.log(`LV${String(level).padStart(2, "0")} total=${String(cumulativeExperience).padStart(4, " ")} next=${String(next).padStart(3, " ")}`);
  cumulativeExperience += next;
}

console.log("\nLV25 PARTY CURVES");
for (const memberId of ["ash", "ione", "nox", "sera"]) {
  console.log(memberId.toUpperCase(), statsForLevel(memberId, 25));
}

for (const mapId of mapIds) {
  const map = JSON.parse(await readFile(new URL(`../public/assets/maps/${mapId}.json`, import.meta.url), "utf8"));
  const zones = map.layers.find((layer) => layer.name === "encounters")?.objects ?? [];
  console.log(`\n${mapId.toUpperCase()}`);
  for (const zone of zones) {
    const properties = propertyMap(zone);
    const minimum = Number(properties.get("minDistance"));
    const maximum = Number(properties.get("maxDistance"));
    const averageDistance = (minimum + maximum) / 2;
    const reward = weightedReward(String(properties.get("formations")));
    console.log([
      zone.name.padEnd(26, " "),
      `distance=${minimum}-${maximum}`,
      `battles/1000px=${(1000 / averageDistance).toFixed(1)}`,
      `poolXP=${reward.experience.toFixed(1)}`,
      `duoXP=${(reward.experience / 2).toFixed(1)}`,
      `CR=${reward.credits.toFixed(1)}`,
    ].join("  "));
  }
}
