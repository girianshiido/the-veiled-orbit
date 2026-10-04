import { writeFile } from "node:fs/promises";
import { generateCentralChapter } from "./generate-central-chapter.mjs";

const TILE = 16;
const property = (name, type, value) => ({ name, type, value });
const tileLayer = (id, name, data, width, height, visible = true) => ({ id, name, type: "tilelayer", width, height, visible, data });
const objectLayer = (id, name, objects, visible = true) => ({ id, name, type: "objectgroup", visible, objects });

function document(displayName, width, height, layers, objectLayers) {
  return {
    type: "map", version: "1.10", tiledversion: "1.11.2", orientation: "orthogonal",
    renderorder: "right-down", width, height, tilewidth: TILE, tileheight: TILE, infinite: false,
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

function interaction(id, name, kind, x, y, properties = []) {
  return {
    id, name, type: kind === "cache" ? "cache" : "message", x: x * TILE, y: y * TILE, width: TILE, height: TILE,
    properties: [property("interactionKind", "string", kind), ...properties],
  };
}

function makeUndertidePassage() {
  const width = 54;
  const height = 36;
  const size = width * height;
  const index = (x, y) => y * width + x;
  const layers = {
    ground: Array(size).fill(6), terrain: Array(size).fill(13), low: Array(size).fill(0),
    objects: Array(size).fill(0), collision: Array(size).fill(1), high: Array(size).fill(0),
  };
  const open = (x, y, detail = 0) => {
    if (x < 1 || y < 1 || x >= width - 1 || y >= height - 1) return;
    layers.terrain[index(x, y)] = 6;
    layers.collision[index(x, y)] = 0;
    if (detail) layers.low[index(x, y)] = detail;
  };
  const room = (left, top, right, bottom) => {
    for (let y = top; y <= bottom; y += 1) for (let x = left; x <= right; x += 1) open(x, y);
  };
  const corridor = (points) => {
    for (let step = 0; step < points.length - 1; step += 1) {
      let [x, y] = points[step];
      const [targetX, targetY] = points[step + 1];
      while (x !== targetX || y !== targetY) {
        open(x, y); open(x, y + 1);
        if (x !== targetX) x += Math.sign(targetX - x);
        else y += Math.sign(targetY - y);
      }
      open(x, y); open(x, y + 1);
    }
  };

  room(1, 25, 7, 29);
  room(10, 5, 16, 10);
  room(21, 15, 28, 21);
  room(31, 4, 38, 9);
  room(39, 23, 46, 29);
  room(47, 7, 52, 12);
  corridor([[2, 27], [9, 27], [9, 17], [14, 17], [14, 9]]);
  corridor([[14, 9], [21, 9], [21, 18], [25, 18]]);
  corridor([[25, 18], [25, 27], [34, 27], [34, 7]]);
  corridor([[34, 7], [43, 7], [43, 10], [50, 10]]);
  corridor([[25, 18], [34, 18], [34, 26], [42, 26]]);
  corridor([[14, 17], [14, 31], [29, 31], [29, 18]]);
  corridor([[16, 7], [24, 7], [24, 3], [34, 3], [34, 6]]);
  corridor([[42, 26], [49, 26], [49, 10]]);
  corridor([[42, 7], [42, 16], [47, 16], [47, 25]]);
  corridor([[7, 27], [7, 33], [20, 33], [20, 30]]);

  // Mineral pools and ancient conduit fragments keep the loops visually distinct.
  for (let y = 2; y < height - 2; y += 1) {
    for (let x = 2; x < width - 2; x += 1) {
      if (layers.collision[index(x, y)] === 0 && (x * 19 + y * 23) % 61 === 0) layers.low[index(x, y)] = 12;
      if (layers.collision[index(x, y)] !== 0 && (x * 11 + y * 7) % 47 === 0) layers.terrain[index(x, y)] = 10;
    }
  }

  const transitions = [
    { id: 1, name: "west-mouth", type: "transition", x: TILE, y: 25 * TILE, width: 8, height: 5 * TILE, properties: [property("targetMap", "string", "southern-landing"), property("targetX", "int", 47), property("targetY", "int", 15), property("targetDirection", "string", "left")] },
    { id: 2, name: "east-mouth", type: "transition", x: 52 * TILE + 8, y: 7 * TILE, width: 8, height: 6 * TILE, properties: [property("targetMap", "string", "meridian-basin"), property("targetX", "int", 7), property("targetY", "int", 20), property("targetDirection", "string", "right")] },
  ];
  const caches = [
    interaction(10, "undertide-ring-cache", "cache", 11, 6, [property("text", "string", "A warden's field case survived beneath a mineral shelf."), property("emptyText", "string", "The field case is empty."), property("flag", "string", "cache.undertide-ring"), property("equipmentId", "string", "undertide-ring"), property("credits", "int", 180), property("tonics", "int", 0), property("returnBeacons", "int", 0)]),
    interaction(11, "cavern-weave-cache", "cache", 40, 24, [property("text", "string", "A sealed survey locker releases its pressure weave."), property("emptyText", "string", "The survey locker is empty."), property("flag", "string", "cache.cavern-weave"), property("equipmentId", "string", "cavern-weave"), property("credits", "int", 0), property("tonics", "int", 0), property("returnBeacons", "int", 1)]),
    interaction(12, "deep-supply-cache", "cache", 32, 5, [property("text", "string", "Old maintenance supplies remain dry inside the conduit."), property("emptyText", "string", "Only mineral dust remains."), property("flag", "string", "cache.undertide-supplies"), property("credits", "int", 260), property("tonics", "int", 3), property("returnBeacons", "int", 0)]),
  ];
  // Cache tiles stay solid while every adjacent reward alcove remains approachable.
  for (const cache of caches) layers.collision[index(cache.x / TILE, cache.y / TILE)] = 1;
  const encounters = [
    { id: 20, name: "Upper burrows", type: "encounter-zone", x: 2 * TILE, y: 2 * TILE, width: 25 * TILE, height: 31 * TILE, properties: [property("biome", "string", "undertide-upper"), property("formations", "string", "skitter-nest:4,undertide-pack:5,deep-burrow:3"), property("minDistance", "int", 150), property("maxDistance", "int", 235)] },
    { id: 21, name: "Deep machinery", type: "encounter-zone", x: 27 * TILE, y: 2 * TILE, width: 25 * TILE, height: 31 * TILE, properties: [property("biome", "string", "undertide-deep"), property("formations", "string", "undertide-pack:4,deep-burrow:4,borer-escort:3"), property("minDistance", "int", 145), property("maxDistance", "int", 225)] },
  ];
  return document("Undertide Passage", width, height, layers, [
    objectLayer(7, "triggers", transitions), objectLayer(8, "interactions", caches), objectLayer(9, "entities", []),
    objectLayer(10, "narrative", [{ id: 30, name: "Undertide entry", type: "narrative", x: 2 * TILE, y: 25 * TILE, width: 7 * TILE, height: 5 * TILE, properties: [property("dialogueId", "string", "undertide-entry"), property("flag", "string", "scene.undertide-entry.seen")] }]),
    objectLayer(11, "scenery", []), objectLayer(12, "encounters", encounters, false),
  ]);
}

function makeMeridianBasin() {
  const width = 48;
  const height = 34;
  const size = width * height;
  const index = (x, y) => y * width + x;
  const layers = { ground: Array(size).fill(16), terrain: Array(size).fill(0), low: Array(size).fill(0), objects: Array(size).fill(0), collision: Array(size).fill(1), high: Array(size).fill(0) };
  for (let y = 3; y < height - 2; y += 1) {
    const left = 3 + Math.max(0, Math.round(Math.sin(y * 0.72) * 1.5 + 1.5));
    for (let x = left; x < width - 2; x += 1) {
      layers.terrain[index(x, y)] = x <= left + 1 ? 17 : 1;
      layers.collision[index(x, y)] = 0;
    }
  }
  const road = (points) => {
    for (let step = 0; step < points.length - 1; step += 1) {
      let [x, y] = points[step]; const [targetX, targetY] = points[step + 1];
      while (x !== targetX || y !== targetY) {
        for (const dx of [0, 1]) { layers.terrain[index(x + dx, y)] = 2; layers.collision[index(x + dx, y)] = 0; }
        if (x !== targetX) x += Math.sign(targetX - x); else y += Math.sign(targetY - y);
      }
    }
  };
  road([[5, 20], [13, 20], [13, 12], [30, 12]]);
  road([[13, 20], [22, 26], [38, 26]]);
  road([[30, 12], [38, 18], [38, 26]]);
  for (let y = 4; y < 31; y += 1) for (let x = 20; x < 29; x += 1) {
    if (x >= 24 && x <= 25 && y >= 10 && y <= 14) continue;
    if ((x + y) % 4 !== 0) { layers.terrain[index(x, y)] = (x + y) % 3 === 0 ? 19 : 18; layers.collision[index(x, y)] = 1; }
  }
  // The western cave threshold must remain a genuine strip of walkable shore.
  for (let y = 18; y <= 22; y += 1) {
    for (let x = 6; x <= 8; x += 1) {
      layers.terrain[index(x, y)] = 2;
      layers.collision[index(x, y)] = 0;
    }
  }
  // Cairn Meridian can be entered from all four sides; its miniature never
  // inherits collision from the ridge drawn beneath it.
  for (let y = 10; y <= 15; y += 1) {
    for (let x = 28; x <= 32; x += 1) {
      layers.terrain[index(x, y)] = 2;
      layers.collision[index(x, y)] = 0;
    }
  }
  const transitions = [
    { id: 1, name: "undertide-return", type: "transition", x: 6 * TILE, y: 18 * TILE, width: 8, height: 5 * TILE, properties: [property("targetMap", "string", "undertide-passage"), property("targetX", "int", 50), property("targetY", "int", 10), property("targetDirection", "string", "left")] },
    ...[
      [2, "cairn-north", 30 * TILE - 24, 11 * TILE, 48, 8, 18, 1, "down"],
      [3, "cairn-south", 30 * TILE - 24, 14 * TILE, 48, 8, 18, 25, "up"],
      [4, "cairn-west", 28 * TILE, 11 * TILE, 8, 48, 1, 13, "right"],
      [5, "cairn-east", 32 * TILE, 11 * TILE, 8, 48, 36, 13, "left"],
    ].map(([id, name, x, y, widthPx, heightPx, targetX, targetY, direction]) => ({ id, name, type: "transition", x, y, width: widthPx, height: heightPx, properties: [property("targetMap", "string", "cairn-meridian"), property("targetX", "int", targetX), property("targetY", "int", targetY), property("targetDirection", "string", direction)] })),
    { id: 6, name: "meridian-array-entrance", type: "transition", x: 37 * TILE, y: 25 * TILE + 8, width: 3 * TILE, height: 12, properties: [property("targetMap", "string", "meridian-array"), property("targetX", "int", 3), property("targetY", "int", 25), property("targetDirection", "string", "right")] },
  ];
  const entities = [{ id: 20, name: "Northern Ferry", type: "npc", x: 7 * TILE, y: 28 * TILE, width: TILE, height: TILE, properties: [property("spriteId", "string", "ferry-boat"), property("dialogueId", "string", "board-northern-return-ferry"), property("travelMap", "string", "glass-steppe"), property("travelX", "int", 28), property("travelY", "int", 80), property("movement", "string", "fixed"), property("direction", "string", "up")] }];
  const scenery = [
    { id: 30, name: "Cairn Meridian", type: "scenery", x: 30 * TILE - 24, y: 12 * TILE - 48, width: 48, height: 64, properties: [property("spriteId", "string", "world-tideglass"), property("anchorX", "int", 24), property("anchorY", "int", 56), property("footprintX", "int", 0), property("footprintY", "int", 48), property("footprintWidth", "int", 48), property("footprintHeight", "int", 16), property("blocksMovement", "bool", false)] },
    { id: 31, name: "Meridian Array", type: "scenery", x: 38 * TILE - 24, y: 26 * TILE - 48, width: 48, height: 64, properties: [property("spriteId", "string", "world-moonfall-array"), property("anchorX", "int", 24), property("anchorY", "int", 56), property("footprintX", "int", 0), property("footprintY", "int", 48), property("footprintWidth", "int", 48), property("footprintHeight", "int", 16), property("blocksMovement", "bool", false)] },
  ];
  return document("Meridian Basin", width, height, layers, [
    objectLayer(7, "triggers", transitions),
    objectLayer(8, "interactions", []),
    objectLayer(9, "entities", entities),
    objectLayer(10, "narrative", [{ id: 40, name: "Basin arrival", type: "narrative", x: 4 * TILE, y: 17 * TILE, width: 8 * TILE, height: 7 * TILE, properties: [property("dialogueId", "string", "meridian-basin-arrival"), property("flag", "string", "scene.meridian-basin-arrival.seen")] }]),
    objectLayer(11, "scenery", scenery),
    objectLayer(12, "encounters", [{ id: 50, name: "Meridian basin circuits", type: "encounter-zone", x: 5 * TILE, y: 4 * TILE, width: 40 * TILE, height: 27 * TILE, properties: [property("biome", "string", "meridian-basin"), property("formations", "string", "borer-escort:3,southwake-patrol:3,undertide-pack:4"), property("minDistance", "int", 150), property("maxDistance", "int", 230)] }], false),
  ]);
}

function makeCairnMeridian() {
  const width = 38;
  const height = 27;
  const size = width * height;
  const index = (x, y) => y * width + x;
  const layers = { ground: Array(size).fill(14), terrain: Array(size).fill(0), low: Array(size).fill(0), objects: Array(size).fill(0), collision: Array(size).fill(0), high: Array(size).fill(0) };
  for (let x = 0; x < width; x += 1) for (const y of [6, 14, 21]) layers.terrain[index(x, y)] = 15;
  for (let y = 0; y < height; y += 1) for (const x of [6, 14, 22, 31]) layers.terrain[index(x, y)] = 15;
  const buildings = [
    { id: 30, name: "Cairn Memory Archive", role: "memory", x: 32, y: 16, width: 64, doorX: 56, doorY: 80 },
    { id: 31, name: "Cairn Weapon Shop", role: "weapon", x: 128, y: 16, width: 64, doorX: 152, doorY: 80 },
    { id: 32, name: "Cairn Inn", role: "inn", x: 224, y: 16, width: 80, doorX: 256, doorY: 80 },
    { id: 33, name: "Cairn Transit Gate", role: "transit", x: 336, y: 16, width: 64, doorX: 360, doorY: 80 },
    { id: 34, name: "Cairn Item Shop", role: "item", x: 64, y: 176, width: 64, doorX: 88, doorY: 240 },
    { id: 35, name: "Cairn Clinic", role: "clinic", x: 176, y: 176, width: 64, doorX: 200, doorY: 240 },
    { id: 36, name: "Cairn Armor Shop", role: "armor", x: 288, y: 176, width: 64, doorX: 312, doorY: 240 },
  ];
  for (const building of buildings) {
    const row = Math.floor((building.y + 64) / TILE);
    for (let x = Math.floor(building.x / TILE); x < Math.ceil((building.x + building.width) / TILE); x += 1) layers.collision[index(x, row)] = 1;
    layers.collision[index(Math.floor(building.doorX / TILE), Math.floor(building.doorY / TILE))] = 0;
  }
  const service = (id, name, kind, x, y, text, price, extras = []) => ({ id, name, type: "service", x, y, width: TILE, height: TILE, properties: [property("interactionKind", "string", kind), property("text", "string", text), property("price", "int", price), ...extras] });
  const services = [
    service(5, "cairn-memory-counter", "save-shop", 56, 80, "The geologists' archive records every route for free.", 0),
    service(6, "cairn-weapon-shop", "weapon-shop", 152, 80, "Meridian instruments are expensive, precise and built for the deep ridge.", 0),
    service(7, "cairn-inn", "inn", 256, 80, "Hot mineral chambers restore travellers from the Undertide route.", 92),
    service(8, "cairn-transit-gate", "teleport", 360, 80, "The basin beacon reaches every registered settlement.", 165, [property("destinationMap", "string", "tideglass-harbor,vesper-crossing,aster-reach,lumen-hollow"), property("destinationName", "string", "TIDEGLASS HARBOR|VESPER CROSSING|ASTER REACH|LUMEN HOLLOW"), property("requiredFlag", "string", "village.tideglass-harbor.visited|village.vesper-crossing.visited|village.aster-reach.visited|village.lumen-hollow.visited")]),
    service(9, "cairn-item-shop", "item-shop", 88, 240, "Supplies crossed the mountain one crate at a time.", 42),
    service(10, "cairn-clinic", "revival-shop", 200, 240, "Deep resonance restoration is available here.", 45),
    service(11, "cairn-armor-shop", "armor-shop", 312, 240, "Mineral laminates turn pressure into a stable field.", 0),
  ];
  const transitions = [
    { id: 1, name: "basin-north", type: "transition", x: 0, y: 0, width: width * TILE, height: TILE, properties: [property("targetMap", "string", "meridian-basin"), property("targetX", "int", 30), property("targetY", "int", 11), property("targetDirection", "string", "up")] },
    { id: 2, name: "basin-south", type: "transition", x: 0, y: (height - 1) * TILE, width: width * TILE, height: TILE, properties: [property("targetMap", "string", "meridian-basin"), property("targetX", "int", 30), property("targetY", "int", 14), property("targetDirection", "string", "down")] },
    { id: 3, name: "basin-west", type: "transition", x: 0, y: TILE, width: TILE, height: (height - 2) * TILE, properties: [property("targetMap", "string", "meridian-basin"), property("targetX", "int", 28), property("targetY", "int", 12), property("targetDirection", "string", "left")] },
    { id: 4, name: "basin-east", type: "transition", x: (width - 1) * TILE, y: TILE, width: TILE, height: (height - 2) * TILE, properties: [property("targetMap", "string", "meridian-basin"), property("targetX", "int", 32), property("targetY", "int", 12), property("targetDirection", "string", "right")] },
  ];
  const entities = [
    { id: 20, name: "Provost Hale", type: "npc", x: 240, y: 272, width: TILE, height: TILE, properties: [property("spriteId", "string", "hollow-host"), property("dialogueId", "string", "cairn-provost"), property("movement", "string", "fixed"), property("direction", "string", "down")] },
    { id: 21, name: "Miner Tal", type: "npc", x: 112, y: 304, width: TILE, height: TILE, properties: [property("spriteId", "string", "glass-smith"), property("dialogueId", "string", "cairn-miner"), property("movement", "string", "patrol"), property("patrolAxis", "string", "horizontal"), property("patrolRange", "int", 32), property("speed", "int", 10), property("direction", "string", "right")] },
    { id: 22, name: "Signal Reader Yori", type: "npc", x: 352, y: 288, width: TILE, height: TILE, properties: [property("spriteId", "string", "surveyor-leth"), property("dialogueId", "string", "cairn-signal-reader"), property("movement", "string", "fixed"), property("direction", "string", "left")] },
  ];
  const scenery = buildings.map((building) => ({ id: building.id, name: building.name, type: "scenery", x: building.x, y: building.y, width: building.width, height: 80, properties: [property("spriteId", "string", `tideglass-hd-${building.role}`), property("anchorX", "int", building.width / 2), property("anchorY", "int", 72), property("footprintX", "int", 0), property("footprintY", "int", 64), property("footprintWidth", "int", building.width), property("footprintHeight", "int", 16)] }));
  return document("Cairn Meridian", width, height, layers, [objectLayer(7, "triggers", transitions), objectLayer(8, "interactions", services), objectLayer(9, "entities", entities), objectLayer(10, "narrative", [{ id: 25, name: "Cairn arrival", type: "narrative", x: 224, y: 288, width: 128, height: 64, properties: [property("dialogueId", "string", "cairn-arrival"), property("flag", "string", "scene.cairn-arrival.seen")] }]), objectLayer(11, "scenery", scenery), objectLayer(12, "encounters", [], false)]);
}

function makeMeridianArray() {
  const width = 44;
  const height = 30;
  const size = width * height;
  const index = (x, y) => y * width + x;
  const layers = {
    ground: Array(size).fill(6), terrain: Array(size).fill(13), low: Array(size).fill(0),
    objects: Array(size).fill(0), collision: Array(size).fill(1), high: Array(size).fill(0),
  };
  const open = (x, y, detail = 0) => {
    if (x < 1 || y < 1 || x >= width - 1 || y >= height - 1) return;
    layers.terrain[index(x, y)] = 6;
    layers.collision[index(x, y)] = 0;
    if (detail) layers.low[index(x, y)] = detail;
  };
  const room = (left, top, right, bottom) => {
    for (let y = top; y <= bottom; y += 1) for (let x = left; x <= right; x += 1) open(x, y);
  };
  const corridor = (points) => {
    for (let step = 0; step < points.length - 1; step += 1) {
      let [x, y] = points[step];
      const [targetX, targetY] = points[step + 1];
      while (x !== targetX || y !== targetY) {
        open(x, y); open(x + 1, y);
        if (x !== targetX) x += Math.sign(targetX - x); else y += Math.sign(targetY - y);
      }
      open(x, y); open(x + 1, y);
    }
  };

  room(1, 22, 7, 28);
  room(8, 15, 15, 21);
  room(18, 21, 25, 27);
  room(20, 8, 27, 14);
  room(6, 3, 13, 9);
  room(33, 17, 41, 24);
  room(34, 2, 42, 9);
  corridor([[3, 25], [11, 25], [11, 18]]);
  corridor([[11, 18], [22, 18], [22, 24]]);
  corridor([[22, 24], [30, 24], [30, 20], [36, 20]]);
  corridor([[11, 18], [11, 7], [9, 7]]);
  corridor([[9, 7], [23, 7], [23, 11]]);
  corridor([[23, 11], [31, 11], [31, 5], [37, 5]]);
  corridor([[23, 11], [23, 18]]);
  corridor([[36, 20], [39, 20], [39, 7]]);
  corridor([[22, 24], [17, 24], [17, 12], [22, 12]]);
  corridor([[9, 7], [4, 7], [4, 16], [10, 16]]);

  for (let y = 2; y < height - 2; y += 1) for (let x = 2; x < width - 2; x += 1) {
    if (layers.collision[index(x, y)] === 0 && (x * 17 + y * 29) % 53 === 0) layers.low[index(x, y)] = 12;
    if (layers.collision[index(x, y)] !== 0 && (x * 13 + y * 11) % 43 === 0) layers.terrain[index(x, y)] = 10;
  }

  const exit = { id: 1, name: "basin-exit", type: "transition", x: TILE, y: 22 * TILE, width: 8, height: 7 * TILE, properties: [property("targetMap", "string", "meridian-basin"), property("targetX", "int", 38), property("targetY", "int", 28), property("targetDirection", "string", "down")] };
  const consoleObject = interaction(10, "meridian-core-console", "control-console", 39, 4, [
    property("flag", "string", "array.meridian-core-read"),
    property("text", "string", "The core answers Sera's current pattern. Its transmission is not a distress call: it is a navigational reply aimed at coordinates beyond this planet."),
    property("emptyText", "string", "The alien coordinates continue repeating beyond the planetary chart."),
  ]);
  const cache = interaction(11, "meridian-guard-cache", "cache", 35, 7, [
    property("flag", "string", "cache.meridian-array.guard"), property("equipmentId", "string", "meridian-guard"),
    property("credits", "int", 420), property("tonics", "int", 0), property("returnBeacons", "int", 1),
    property("text", "string", "A command locker opens beside the Array core."), property("emptyText", "string", "The command locker is empty."),
  ]);
  layers.collision[index(39, 4)] = 1;
  layers.collision[index(35, 7)] = 1;
  return document("Meridian Array", width, height, layers, [
    objectLayer(7, "triggers", [exit]), objectLayer(8, "interactions", [consoleObject, cache]), objectLayer(9, "entities", []),
    objectLayer(10, "narrative", [{ id: 20, name: "Array entry", type: "narrative", x: 2 * TILE, y: 22 * TILE, width: 7 * TILE, height: 7 * TILE, properties: [property("dialogueId", "string", "meridian-array-entry"), property("flag", "string", "scene.meridian-array-entry.seen")] }]),
    objectLayer(11, "scenery", []),
    objectLayer(12, "encounters", [
      { id: 30, name: "Array lower circuits", type: "encounter-zone", x: 2 * TILE, y: 12 * TILE, width: 22 * TILE, height: 16 * TILE, properties: [property("biome", "string", "meridian-array-lower"), property("formations", "string", "undertide-pack:3,borer-escort:5,southwake-patrol:3"), property("minDistance", "int", 140), property("maxDistance", "int", 215)] },
      { id: 31, name: "Array upper circuits", type: "encounter-zone", x: 18 * TILE, y: 2 * TILE, width: 24 * TILE, height: 23 * TILE, properties: [property("biome", "string", "meridian-array-upper"), property("formations", "string", "borer-escort:5,southwake-patrol:4,deep-burrow:2"), property("minDistance", "int", 135), property("maxDistance", "int", 205)] },
    ], false),
  ]);
}

await writeFile(new URL("../public/assets/maps/undertide-passage.json", import.meta.url), `${JSON.stringify(makeUndertidePassage(), null, 2)}\n`);
await writeFile(new URL("../public/assets/maps/meridian-basin.json", import.meta.url), `${JSON.stringify(makeMeridianBasin(), null, 2)}\n`);
await writeFile(new URL("../public/assets/maps/cairn-meridian.json", import.meta.url), `${JSON.stringify(makeCairnMeridian(), null, 2)}\n`);
await writeFile(new URL("../public/assets/maps/meridian-array.json", import.meta.url), `${JSON.stringify(makeMeridianArray(), null, 2)}\n`);
await generateCentralChapter();
