import { writeFile } from "node:fs/promises";
import { generateCentralChapter } from "./generate-central-chapter.mjs";

const tileSize = 16;
const property = (name, type, value) => ({ name, type, value });
const objectLayer = (id, name, objects, visible = true) => ({ id, name, type: "objectgroup", visible, objects });

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function baseLayers(width, height) {
  const size = width * height;
  return {
    ground: Array(size).fill(6),
    terrain: Array(size).fill(13),
    low: Array(size).fill(0),
    objects: Array(size).fill(0),
    collision: Array(size).fill(1),
    high: Array(size).fill(0),
  };
}

function tileLayer(id, name, data, width, height, visible = true) {
  return { id, name, type: "tilelayer", width, height, visible, data };
}

function mapDocument(displayName, width, height, layers, objectLayers) {
  return {
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
    properties: [property("displayName", "string", displayName)],
    layers: [
      tileLayer(1, "ground", layers.ground, width, height),
      tileLayer(2, "terrain", layers.terrain, width, height),
      tileLayer(3, "details-low", layers.low, width, height),
      tileLayer(4, "objects", layers.objects, width, height),
      tileLayer(5, "collision", layers.collision, width, height, false),
      tileLayer(6, "details-high", layers.high, width, height),
      ...objectLayers,
    ],
  };
}

function makeMazeFloor(config) {
  const { id, displayName, width, height, seed, down, up, encounters, cache } = config;
  const layers = baseLayers(width, height);
  const index = (x, y) => y * width + x;
  const random = seededRandom(seed);
  const carve = (x, y) => {
    if (x < 1 || y < 0 || x >= width - 1 || y >= height) return;
    layers.terrain[index(x, y)] = 0;
    layers.collision[index(x, y)] = 0;
  };
  const startX = Math.floor(width / 2) | 1;
  const bottomNodeY = height % 2 === 0 ? height - 3 : height - 4;
  const topNodeY = 2;
  const nodes = [];
  for (let y = 2; y <= bottomNodeY; y += 2) {
    for (let x = 3; x <= width - 4; x += 2) nodes.push([x, y]);
  }
  const startNode = [Math.min(width - 4, Math.max(3, startX)), bottomNodeY];
  if (startNode[0] % 2 === 0) startNode[0] -= 1;
  const stack = [startNode];
  const visited = new Set([startNode.join(",")]);
  carve(...startNode);
  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const candidates = [[2, 0], [-2, 0], [0, 2], [0, -2]]
      .map(([dx, dy]) => [current[0] + dx, current[1] + dy, dx, dy])
      .filter(([x, y]) => x >= 3 && x <= width - 4 && y >= 2 && y <= bottomNodeY && !visited.has(`${x},${y}`));
    if (candidates.length === 0) {
      stack.pop();
      continue;
    }
    const next = candidates[Math.floor(random() * candidates.length)];
    carve(current[0] + next[2] / 2, current[1] + next[3] / 2);
    carve(next[0], next[1]);
    visited.add(`${next[0]},${next[1]}`);
    stack.push([next[0], next[1]]);
  }

  // A few widened command bays prevent every floor from reading as a one-tile maze.
  const bays = nodes.filter((_, position) => position % Math.max(4, Math.floor(nodes.length / 6)) === 0).slice(0, 6);
  bays.forEach(([x, y]) => {
    carve(x + 1, y);
    carve(x, y + 1);
    if (random() > 0.4) carve(x + 1, y + 1);
  });

  const topCandidates = [...visited].map((key) => key.split(",").map(Number)).filter(([, y]) => y === topNodeY);
  const topNode = topCandidates.sort((left, right) => Math.abs(left[0] - width / 2) - Math.abs(right[0] - width / 2))[0] ?? [startNode[0], topNodeY];
  for (let y = startNode[1]; y < height; y += 1) carve(startNode[0], y);
  for (let y = 0; y <= topNode[1]; y += 1) carve(topNode[0], y);
  layers.ground[index(startNode[0], height - 1)] = 7;
  layers.ground[index(topNode[0], 0)] = 7;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = index(x, y);
      if (layers.collision[offset] === 0 && (x * 7 + y * 11 + seed) % 17 === 0) layers.low[offset] = 8;
      if (layers.terrain[offset] === 13 && (x * 5 + y * 3 + seed) % 19 === 0) layers.terrain[offset] = 4;
    }
  }

  const transitions = [
    {
      id: 1,
      name: `${id}-down`,
      type: "transition",
      x: startNode[0] * tileSize,
      y: (height - 1) * tileSize,
      width: tileSize,
      height: tileSize,
      properties: [
        property("targetMap", "string", down.map), property("targetX", "int", down.x), property("targetY", "int", down.y),
        property("targetDirection", "string", down.direction ?? "down"),
      ],
    },
    {
      id: 2,
      name: `${id}-up`,
      type: "transition",
      x: topNode[0] * tileSize,
      y: 0,
      width: tileSize,
      height: tileSize,
      properties: [
        property("targetMap", "string", up.map), property("targetX", "int", up.x), property("targetY", "int", up.y),
        property("targetDirection", "string", up.direction ?? "up"),
      ],
    },
  ];

  const interactions = [];
  if (cache) {
    const cacheX = 3;
    const cacheY = 3;
    for (const [x, y] of [[3, 2], [4, 2], [3, 3], [4, 3], [3, 4], [4, 4]]) carve(x, y);
    layers.collision[index(cacheX, cacheY)] = 1;
    interactions.push({
      id: 3,
      name: cache.name,
      type: "cache",
      x: cacheX * tileSize,
      y: cacheY * tileSize,
      width: tileSize,
      height: tileSize,
      properties: [
        property("interactionKind", "string", "cache"), property("flag", "string", cache.flag),
        property("equipmentId", "string", cache.equipmentId), property("credits", "int", cache.credits ?? 0),
        property("text", "string", cache.text), property("emptyText", "string", "The opened command cache is empty."),
      ],
    });
  }

  const map = mapDocument(displayName, width, height, layers, [
    objectLayer(7, "triggers", transitions),
    objectLayer(8, "interactions", interactions),
    objectLayer(9, "entities", []),
    objectLayer(10, "narrative", []),
    objectLayer(11, "scenery", []),
    objectLayer(12, "encounters", [{
      id: 20,
      name: `${displayName} hostile circuits`,
      type: "encounter-zone",
      x: 0,
      y: 0,
      width: width * tileSize,
      height: height * tileSize,
      properties: [
        property("biome", "string", id.startsWith("west") ? "west-control" : "east-control"),
        property("formations", "string", encounters), property("minDistance", "int", id.startsWith("west") ? 155 : 135),
        property("maxDistance", "int", id.startsWith("west") ? 235 : 205),
      ],
    }], false),
  ]);
  // Land one full tile inside each floor.  This prevents a single retained
  // directional input from immediately stepping back into the stair trigger.
  return { id, map, entrance: { x: startNode[0], y: height - 3 }, upper: { x: topNode[0], y: 2 } };
}

function makeSummit({ id, displayName, east = false }) {
  const width = 24;
  const height = 18;
  const layers = baseLayers(width, height);
  const index = (x, y) => y * width + x;
  for (let y = 1; y < height; y += 1) {
    const inset = y < 5 ? 7 : y < 10 ? 5 : 3;
    for (let x = inset; x < width - inset; x += 1) {
      layers.terrain[index(x, y)] = 0;
      layers.collision[index(x, y)] = 0;
      if ((x + y) % 13 === 0) layers.low[index(x, y)] = 12;
    }
  }
  const center = Math.floor(width / 2);
  layers.ground[index(center, height - 1)] = 7;
  // The terminal is a wide physical array, so its collision matches the
  // visible pedestal rather than leaving an invisible one-tile obstruction.
  for (let x = center - 1; x <= center + 1; x += 1) layers.collision[index(x, 2)] = 1;
  const downMap = east ? "east-control-3f" : "west-control-3f";
  const consoleFlag = east ? "tower.east-restored" : "tower.west-restored";
  const requiredFlag = east ? "tower.signal-wraith-defeated" : "party.nox-recruited";
  const interactions = [{
    id: 3,
    name: east ? "eastern-control-array" : "western-control-array",
    type: "control-console",
    x: center * tileSize,
    y: 2 * tileSize,
    width: tileSize,
    height: tileSize,
    properties: [
      property("interactionKind", "string", "control-console"), property("flag", "string", consoleFlag),
      property("requiredFlag", "string", requiredFlag),
      property("text", "string", east
        ? "With the saboteur gone, Nox synchronizes the eastern transmission array. The southern channel answers."
        : "Nox rebuilds the broken carrier sequence. The western transmission array returns to service."),
      property("emptyText", "string", east
        ? "The control array requires the hostile signal at the summit to be eliminated."
        : "The array is too specialized to repair without Nox."),
    ],
  }];
  const entities = east ? [{
    id: 4,
    name: "Signal Saboteur",
    type: "npc",
    x: center * tileSize,
    y: 7 * tileSize,
    width: tileSize,
    height: tileSize,
    properties: [
      property("spriteId", "string", "vault-guardian"), property("dialogueId", "string", "signal-saboteur"),
      property("battleFormation", "string", "signal-saboteur"), property("defeatFlag", "string", "tower.signal-wraith-defeated"),
      property("victoryDialogueId", "string", "signal-saboteur-defeated"), property("hiddenFlag", "string", "tower.signal-wraith-defeated"),
      property("movement", "string", "fixed"), property("direction", "string", "down"),
    ],
  }] : [];
  return {
    id,
    map: mapDocument(displayName, width, height, layers, [
      objectLayer(7, "triggers", [{
        id: 1, name: `${id}-down`, type: "transition", x: center * tileSize, y: (height - 1) * tileSize, width: tileSize, height: tileSize,
        properties: [property("targetMap", "string", downMap), property("targetX", "int", 15), property("targetY", "int", 2), property("targetDirection", "string", "down")],
      }]),
      objectLayer(8, "interactions", interactions),
      objectLayer(9, "entities", entities),
      objectLayer(10, "narrative", [{
        id: 5, name: `${displayName} summit arrival`, type: "narrative", x: 7 * tileSize, y: 10 * tileSize, width: 10 * tileSize, height: 5 * tileSize,
        properties: [property("dialogueId", "string", east ? "east-control-summit" : "west-control-summit"), property("flag", "string", `scene.${id}.seen`)],
      }]),
      objectLayer(11, "scenery", []),
      objectLayer(12, "encounters", [], false),
    ]),
  };
}

function makeCentralEntry() {
  const width = 24;
  const height = 18;
  const layers = baseLayers(width, height);
  const index = (x, y) => y * width + x;
  for (let y = 0; y < height; y += 1) {
    for (let x = 8; x <= 15; x += 1) {
      layers.terrain[index(x, y)] = 0;
      layers.collision[index(x, y)] = 0;
    }
  }
  for (let x = 5; x <= 18; x += 1) {
    for (let y = 10; y <= 15; y += 1) {
      layers.terrain[index(x, y)] = 0;
      layers.collision[index(x, y)] = 0;
    }
  }
  const center = 12;
  layers.ground[index(center, height - 1)] = 7;
  return {
    id: "central-control-entry",
    map: mapDocument("Central Control Tower · Sealed Vestibule", width, height, layers, [
      objectLayer(7, "triggers", [{
        id: 1, name: "central-world-return", type: "transition", x: center * tileSize, y: (height - 1) * tileSize, width: tileSize, height: tileSize,
        properties: [property("targetMap", "string", "glass-steppe"), property("targetX", "int", 28), property("targetY", "int", 80), property("targetDirection", "string", "down")],
      }]),
      objectLayer(8, "interactions", [{
        id: 2, name: "central-guard-line", type: "barrier", x: 8 * tileSize, y: 9 * tileSize, width: 8 * tileSize, height: tileSize,
        properties: [property("interactionKind", "string", "barrier"), property("text", "string", "GUARD ORDER: The central control tower is closed by planetary authority.")],
      }]),
      objectLayer(9, "entities", [
        { id: 3, name: "Central Guard A", type: "npc", x: 9 * tileSize, y: 10 * tileSize, width: tileSize, height: tileSize, properties: [property("spriteId", "string", "glass-smith"), property("dialogueId", "string", "central-tower-guard"), property("movement", "string", "fixed"), property("direction", "string", "down")] },
        { id: 4, name: "Central Guard B", type: "npc", x: 14 * tileSize, y: 10 * tileSize, width: tileSize, height: tileSize, properties: [property("spriteId", "string", "glass-smith"), property("dialogueId", "string", "central-tower-guard"), property("movement", "string", "fixed"), property("direction", "string", "down")] },
      ]),
      objectLayer(10, "narrative", []),
      objectLayer(11, "scenery", []),
      objectLayer(12, "encounters", [], false),
    ]),
  };
}

function makeSouthernLanding() {
  const width = 32;
  const height = 24;
  const layers = baseLayers(width, height);
  const index = (x, y) => y * width + x;
  layers.ground.fill(16);
  layers.terrain.fill(0);
  for (let y = 4; y < height; y += 1) {
    const left = 3 + Math.round(Math.sin(y * 0.7));
    const right = width - 4 - Math.round(Math.cos(y * 0.55));
    for (let x = left; x <= right; x += 1) {
      layers.terrain[index(x, y)] = x === left || x === right || y === 4 ? 17 : 1;
      layers.collision[index(x, y)] = 0;
    }
  }
  for (let y = 5; y < 21; y += 1) {
    layers.terrain[index(16, y)] = 2;
    layers.collision[index(16, y)] = 0;
  }
  return {
    id: "southern-landing",
    map: mapDocument("Southern Island Landing", width, height, layers, [
      objectLayer(7, "triggers", []),
      objectLayer(8, "interactions", [{
        id: 1, name: "southern-road-survey", type: "message", x: 16 * tileSize, y: 7 * tileSize, width: tileSize, height: tileSize,
        properties: [property("text", "string", "The fourth settlement stands beyond the landing road. Its gates are not yet open.")],
      }]),
      objectLayer(9, "entities", []),
      objectLayer(10, "narrative", [{
        id: 2, name: "southern-island-arrival", type: "narrative", x: 12 * tileSize, y: 17 * tileSize, width: 9 * tileSize, height: 5 * tileSize,
        properties: [property("dialogueId", "string", "southern-island-arrival"), property("flag", "string", "scene.southern-island-arrival.seen")],
      }]),
      objectLayer(11, "scenery", [{
        id: 3,
        name: "Fourth Settlement",
        type: "scenery",
        x: 16 * tileSize - 24,
        y: 4 * tileSize,
        width: 48,
        height: 64,
        properties: [
          property("spriteId", "string", "world-village"), property("anchorX", "int", 24), property("anchorY", "int", 56),
          property("footprintX", "int", 0), property("footprintY", "int", 48), property("footprintWidth", "int", 48), property("footprintHeight", "int", 16),
          property("blocksMovement", "bool", false),
        ],
      }]),
      objectLayer(12, "encounters", [], false),
    ]),
  };
}

const floors = [];
const westDefinitions = [
  { id: "west-control-1f", displayName: "West Control Tower · Ground Floor", width: 42, height: 34, seed: 111, down: { map: "glass-steppe", x: 10, y: 79 }, up: { map: "west-control-2f", x: 18, y: 27 }, encounters: "relay-swarm:5,tower-pack:3,relay-wasp:2", cache: { name: "west-relay-carbine", flag: "cache.west-tower.relay-carbine", equipmentId: "relay-carbine", credits: 45, text: "A scout-pattern carbine rests in a sealed maintenance rack." } },
  { id: "west-control-2f", displayName: "West Control Tower · First Floor", width: 36, height: 29, seed: 222, down: { map: "west-control-1f", x: 21, y: 2 }, up: { map: "west-control-3f", x: 15, y: 22 }, encounters: "tower-pack:5,relay-swarm:3,coil-escort:2" },
  { id: "west-control-3f", displayName: "West Control Tower · Second Floor", width: 30, height: 24, seed: 333, down: { map: "west-control-2f", x: 18, y: 2 }, up: { map: "west-control-summit", x: 12, y: 16 }, encounters: "tower-pack:4,coil-escort:4,coil-knight:2", cache: { name: "west-scout-coil", flag: "cache.west-tower.scout-coil", equipmentId: "scout-coil", credits: 60, text: "A rapid-response coil still hums inside the western command locker." } },
];
const eastDefinitions = [
  { id: "east-control-1f", displayName: "East Control Tower · Ground Floor", width: 42, height: 34, seed: 444, down: { map: "glass-steppe", x: 46, y: 79 }, up: { map: "east-control-2f", x: 18, y: 27 }, encounters: "tower-pack:3,relay-assault:3,aegis-guard:2", cache: { name: "east-sun-edge", flag: "cache.east-tower.sun-edge", equipmentId: "sun-edge", credits: 70, text: "A solar command blade remains locked to the eastern tower frequency." } },
  { id: "east-control-2f", displayName: "East Control Tower · First Floor", width: 36, height: 29, seed: 555, down: { map: "east-control-1f", x: 21, y: 2 }, up: { map: "east-control-3f", x: 15, y: 22 }, encounters: "relay-assault:2,control-legion:3,aegis-guard:3,aegis-command:2", cache: { name: "east-oracle-loop", flag: "cache.east-tower.oracle-loop", equipmentId: "oracle-loop", credits: 75, text: "A mnemonic loop floats above an intact calibration cradle." } },
  { id: "east-control-3f", displayName: "East Control Tower · Second Floor", width: 30, height: 24, seed: 666, down: { map: "east-control-2f", x: 18, y: 2 }, up: { map: "east-control-summit", x: 12, y: 16 }, encounters: "control-legion:3,aegis-guard:3,aegis-command:4", cache: { name: "east-storm-carbine", flag: "cache.east-tower.storm-carbine", equipmentId: "storm-carbine", credits: 85, text: "A storm-sealed marksman's carbine answers Nox's field signature." } },
];
const westFloors = westDefinitions.map((definition) => makeMazeFloor(definition));
const eastFloors = eastDefinitions.map((definition) => makeMazeFloor(definition));
floors.push(...westFloors, ...eastFloors);

function setTransitionTarget(map, transitionName, target) {
  const transition = map.layers.find((layer) => layer.name === "triggers").objects.find((object) => object.name === transitionName);
  for (const [name, value] of [["targetMap", target.map], ["targetX", target.x], ["targetY", target.y]]) {
    const targetProperty = transition.properties.find((candidate) => candidate.name === name);
    targetProperty.value = value;
  }
}

function linkMazeFloors(chain) {
  for (let index = 0; index < chain.length - 1; index += 1) {
    const lower = chain[index];
    const upper = chain[index + 1];
    setTransitionTarget(lower.map, `${lower.id}-up`, { map: upper.id, x: upper.entrance.x, y: upper.entrance.y });
    setTransitionTarget(upper.map, `${upper.id}-down`, { map: lower.id, x: lower.upper.x, y: lower.upper.y });
  }
}
linkMazeFloors(westFloors);
linkMazeFloors(eastFloors);

const westSummit = makeSummit({ id: "west-control-summit", displayName: "West Control Tower · Summit" });
const eastSummit = makeSummit({ id: "east-control-summit", displayName: "East Control Tower · Summit", east: true });
const eastSummitInteractions = eastSummit.map.layers.find((layer) => layer.name === "interactions").objects;
const eastSummitCollision = eastSummit.map.layers.find((layer) => layer.name === "collision").data;
eastSummitCollision[4 * eastSummit.map.width + 8] = 1;
eastSummitInteractions.push({
  id: 6,
  name: "eastern-aegis-cache",
  type: "cache",
  x: 8 * tileSize,
  y: 4 * tileSize,
  width: tileSize,
  height: tileSize,
  properties: [
    property("interactionKind", "string", "cache"), property("flag", "string", "cache.east-tower.tower-aegis"),
    property("requiredFlag", "string", "tower.signal-wraith-defeated"),
    property("equipmentId", "string", "tower-aegis"), property("credits", "int", 100),
    property("text", "string", "A command-grade aegis survived behind the saboteur's interference field."),
    property("emptyText", "string", "The saboteur's interference field seals this command cache."),
  ],
});
setTransitionTarget(westFloors.at(-1).map, "west-control-3f-up", { map: westSummit.id, x: 12, y: 16 });
setTransitionTarget(eastFloors.at(-1).map, "east-control-3f-up", { map: eastSummit.id, x: 12, y: 16 });
setTransitionTarget(westSummit.map, "west-control-summit-down", { map: westFloors.at(-1).id, x: westFloors.at(-1).upper.x, y: westFloors.at(-1).upper.y });
setTransitionTarget(eastSummit.map, "east-control-summit-down", { map: eastFloors.at(-1).id, x: eastFloors.at(-1).upper.x, y: eastFloors.at(-1).upper.y });
floors.push(westSummit, eastSummit);
floors.push(makeCentralEntry());
// Southwake Isle is generated separately by generate-southwake-region.mjs.

for (const { id, map } of floors) {
  await writeFile(new URL(`../public/assets/maps/${id}.json`, import.meta.url), `${JSON.stringify(map, null, 2)}\n`);
  console.log(`Wrote ${id}.json (${map.width} × ${map.height})`);
}
await generateCentralChapter();
