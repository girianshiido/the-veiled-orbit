import { writeFile } from "node:fs/promises";

const width = 42;
const height = 34;
const tileSize = 16;
const size = width * height;
const index = (x, y) => y * width + x;
const property = (name, type, value) => ({ name, type, value });
const tileLayer = (id, name, data, visible = true) => ({ id, name, type: "tilelayer", width, height, visible, data });
const objectLayer = (id, name, objects, visible = true) => ({ id, name, type: "objectgroup", visible, objects });

const ground = Array(size).fill(6);
const terrain = Array(size).fill(13);
const low = Array(size).fill(0);
const objects = Array(size).fill(0);
const collision = Array(size).fill(1);
const high = Array(size).fill(0);

function carveRect(left, top, rectWidth, rectHeight) {
  for (let y = top; y < top + rectHeight; y += 1) {
    for (let x = left; x < left + rectWidth; x += 1) {
      terrain[index(x, y)] = 0;
      collision[index(x, y)] = 0;
    }
  }
}

function blockTile(x, y) {
  collision[index(x, y)] = 1;
}

// Entrance, lower hub and central route.
carveRect(20, 33, 3, 1);
carveRect(18, 29, 7, 4);
carveRect(20, 24, 3, 5);
carveRect(15, 20, 13, 5);
carveRect(20, 15, 3, 5);
carveRect(14, 12, 15, 4);
carveRect(14, 6, 15, 6);
carveRect(17, 1, 9, 5);

// Western loop and the dead-end archive where Mira is trapped.
carveRect(8, 22, 7, 2);
carveRect(2, 19, 7, 8);
carveRect(6, 12, 3, 7);
carveRect(2, 5, 8, 8);
carveRect(9, 8, 5, 3);
carveRect(5, 3, 1, 2);
carveRect(2, 1, 4, 3);

// Eastern loop, upper archive and lower annex.
carveRect(28, 8, 7, 3);
carveRect(34, 4, 6, 9);
carveRect(32, 10, 3, 10);
carveRect(27, 18, 8, 3);
carveRect(27, 22, 8, 2);
carveRect(34, 19, 6, 8);
carveRect(37, 26, 2, 4);
carveRect(34, 29, 6, 4);
carveRect(35, 1, 5, 3);

// Internal baffles turn the broad junctions into readable maze channels.
for (const [x, y] of [[18, 21], [18, 22], [24, 22], [17, 13], [25, 14], [19, 8], [24, 9]]) blockTile(x, y);

// Consoles, cable bridges and chamber markings.
for (const [x, y] of [[21, 31], [16, 23], [22, 17], [8, 14], [32, 18], [15, 9], [28, 10], [37, 21], [36, 30]]) {
  if (collision[index(x, y)] === 0) low[index(x, y)] = 12;
}
objects[index(17, 23)] = 10;
objects[index(36, 11)] = 10;

const caches = [
  { id: 2, name: "western-archive-cache", x: 2, y: 1, flag: "cache.echo-vault-vault-edge.claimed", equipmentId: "vault-edge", credits: 20, tonics: 0, text: "A blade rests inside a pre-collapse command sheath." },
  { id: 3, name: "eastern-archive-cache", x: 38, y: 1, flag: "cache.echo-vault-phase-lash.claimed", equipmentId: "phase-lash", credits: 20, tonics: 0, text: "A flexible phase conductor coils around a mnemonic spindle." },
  { id: 4, name: "core-aegis-cache", x: 21, y: 2, flag: "cache.echo-vault-aegis.claimed", equipmentId: "vault-aegis", credits: 35, tonics: 1, text: "The core releases a compact barrier frame." },
  { id: 5, name: "lower-prism-cache", x: 38, y: 31, flag: "cache.echo-vault-memory-prism.claimed", equipmentId: "memory-prism", credits: 30, tonics: 0, text: "A living prism pulses inside the forgotten lower annex." },
  { id: 6, name: "western-supply-cache", x: 3, y: 24, flag: "cache.echo-vault-supplies.claimed", equipmentId: "", credits: 55, tonics: 2, returnBeacons: 1, text: "An emergency locker unfolds beneath the western bypass." },
];
caches.forEach((cache) => blockTile(cache.x, cache.y));

const pylonBases = [[12, 9], [30, 19], [27, 10]];
pylonBases.forEach(([x, y]) => blockTile(x, y));

// Regional HD variants make the broad labyrinth readable without changing
// any of its routes or collision rules.
for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const tileIndex = index(x, y);
    if (collision[tileIndex] === 0 && (x * 7 + y * 11) % 19 === 0) ground[tileIndex] = 5;
    if (terrain[tileIndex] === 13 && (x * 5 + y * 3) % 17 === 0) terrain[tileIndex] = 4;
  }
}
for (const [x, y] of [[21, 27], [16, 15], [31, 22], [8, 20], [37, 28]]) {
  if (collision[index(x, y)] === 0 && low[index(x, y)] === 0) low[index(x, y)] = 8;
}
for (const x of [20, 21, 22]) ground[index(x, 33)] = 7;

// Fail generation if a carve or obstruction accidentally divides the dungeon.
const start = [21, 32];
const queue = [start];
const visited = new Set([start.join(",")]);
while (queue.length > 0) {
  const [x, y] = queue.shift();
  for (const [nextX, nextY] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
    if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) continue;
    if (collision[index(nextX, nextY)] !== 0) continue;
    const key = `${nextX},${nextY}`;
    if (visited.has(key)) continue;
    visited.add(key);
    queue.push([nextX, nextY]);
  }
}
const walkableCount = collision.filter((value) => value === 0).length;
if (visited.size !== walkableCount) throw new Error(`Echo Vault is disconnected: ${visited.size}/${walkableCount} tiles reached.`);

const map = {
  type: "map",
  version: "1.10",
  tiledversion: "1.11.2",
  orientation: "orthogonal",
  renderorder: "right-down",
  width,
  height,
  tilewidth: tileSize,
  tileheight: tileSize,
  infinite: false,
  properties: [property("displayName", "string", "Echo Vault")],
  layers: [
    tileLayer(1, "ground", ground),
    tileLayer(2, "terrain", terrain),
    tileLayer(3, "details-low", low),
    tileLayer(4, "objects", objects),
    tileLayer(5, "collision", collision, false),
    tileLayer(6, "details-high", high),
    objectLayer(7, "triggers", [{
      id: 1, name: "steppe-return", type: "transition", x: 20 * tileSize, y: 33 * tileSize, width: 3 * tileSize, height: tileSize,
      properties: [property("targetMap", "string", "glass-steppe"), property("targetX", "int", 32), property("targetY", "int", 9), property("targetDirection", "string", "down")],
    }]),
    objectLayer(8, "interactions", [
      ...caches.map((cache) => ({
        id: cache.id, name: cache.name, type: "cache", x: cache.x * tileSize, y: cache.y * tileSize, width: tileSize, height: tileSize,
        properties: [
          property("interactionKind", "string", "cache"), property("flag", "string", cache.flag),
          property("credits", "int", cache.credits), property("tonics", "int", cache.tonics),
          ...(cache.returnBeacons ? [property("returnBeacons", "int", cache.returnBeacons)] : []),
          ...(cache.equipmentId ? [property("equipmentId", "string", cache.equipmentId)] : []),
          property("text", "string", cache.text), property("emptyText", "string", "The opened cache holds nothing else."),
        ],
      })),
      {
        id: 7, name: "vault-route-console", type: "message", x: 17 * tileSize, y: 23 * tileSize, width: tileSize, height: tileSize,
        properties: [property("text", "string", "ROUTE LOG: WEST ARCHIVE / CORE CHAMBER / EAST ARCHIVE / LOWER ANNEX")],
      },
    ]),
    objectLayer(9, "entities", [
      {
        id: 8, name: "Mira", type: "npc", x: 3 * tileSize, y: 2 * tileSize, width: tileSize, height: tileSize,
        properties: [property("spriteId", "string", "mayor-daughter"), property("dialogueId", "string", "mira-trapped"), property("movement", "string", "fixed"), property("direction", "string", "down"), property("hiddenFlag", "string", "quest.mira-rescued")],
      },
      {
        id: 9, name: "Archive Guardian", type: "npc", x: 5 * tileSize, y: 4 * tileSize, width: tileSize, height: tileSize,
        properties: [
          property("spriteId", "string", "vault-guardian"), property("dialogueId", "string", "guardian-signal"), property("movement", "string", "fixed"), property("direction", "string", "down"),
          property("battleFormation", "string", "archive-guardian"), property("defeatFlag", "string", "quest.mira-rescued"), property("escortFlag", "string", "quest.mira-escorting"), property("victoryDialogueId", "string", "mira-rescued"), property("hiddenFlag", "string", "quest.mira-rescued"),
        ],
      },
    ]),
    objectLayer(10, "narrative", [{
      id: 10, name: "Echo Vault threshold", type: "narrative", x: 18 * tileSize, y: 28 * tileSize, width: 7 * tileSize, height: 5 * tileSize,
      properties: [property("dialogueId", "string", "echo-vault-entry"), property("flag", "string", "scene.echo-vault-entry.seen")],
    }]),
    objectLayer(11, "scenery", pylonBases.map(([baseX, baseY], indexValue) => ({
      id: 11 + indexValue, name: `Vault circuit pylon ${indexValue + 1}`, type: "scenery",
      x: baseX * tileSize - 12, y: baseY * tileSize - 64, width: 40, height: 80,
      properties: [property("spriteId", "string", "echo-vault-pylon"), property("anchorX", "int", 20), property("anchorY", "int", 72), property("footprintX", "int", 12), property("footprintY", "int", 64), property("footprintWidth", "int", 16), property("footprintHeight", "int", 16)],
    }))),
    objectLayer(12, "encounters", [
      { id: 20, name: "Western prison archive", type: "encounter-zone", x: 0, y: 0, width: 14 * tileSize, height: 14 * tileSize, properties: [property("biome", "string", "vault-west-archive"), property("formations", "string", "vault-guard:6,stalker-pair:4,phase-warden:2"), property("minDistance", "int", 150), property("maxDistance", "int", 230)] },
      { id: 21, name: "Resonant core", type: "encounter-zone", x: 14 * tileSize, y: 0, width: 15 * tileSize, height: 12 * tileSize, properties: [property("biome", "string", "vault-core"), property("formations", "string", "core-wardens:4,vault-guard:6,stalker-pair:2"), property("minDistance", "int", 140), property("maxDistance", "int", 215)] },
      { id: 22, name: "Eastern weapon archive", type: "encounter-zone", x: 29 * tileSize, y: 0, width: 13 * tileSize, height: 17 * tileSize, properties: [property("biome", "string", "vault-east-archive"), property("formations", "string", "vault-guard:5,stalker-pair:5,phase-warden:2"), property("minDistance", "int", 155), property("maxDistance", "int", 235)] },
      { id: 23, name: "Lower prism annex", type: "encounter-zone", x: 29 * tileSize, y: 17 * tileSize, width: 13 * tileSize, height: 17 * tileSize, properties: [property("biome", "string", "vault-lower-annex"), property("formations", "string", "vault-stalker:4,stalker-pair:5,vault-guard:3"), property("minDistance", "int", 165), property("maxDistance", "int", 250)] },
      { id: 24, name: "Echo Vault main circuits", type: "encounter-zone", x: 0, y: 12 * tileSize, width: 42 * tileSize, height: 22 * tileSize, properties: [property("biome", "string", "vault-main"), property("formations", "string", "dust-escort:4,vault-stalker:5,stalker-pair:2"), property("minDistance", "int", 175), property("maxDistance", "int", 275)] },
    ], false),
  ],
};

await writeFile(new URL("../public/assets/maps/echo-vault.json", import.meta.url), `${JSON.stringify(map, null, 2)}\n`);
