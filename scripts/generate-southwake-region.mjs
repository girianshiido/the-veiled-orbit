import { writeFile } from "node:fs/promises";
import { generateLaunchChapter } from "./generate-launch-chapter.mjs";

const TILE = 16;
const property = (name, type, value) => ({ name, type, value });
const tileLayer = (id, name, data, width, height, visible = true) => ({ id, name, type: "tilelayer", width, height, visible, data });
const objectLayer = (id, name, objects, visible = true) => ({ id, name, type: "objectgroup", visible, objects });

function mapDocument(displayName, width, height, layers, objects) {
  return {
    type: "map",
    version: "1.10",
    tiledversion: "1.11.2",
    orientation: "orthogonal",
    renderorder: "right-down",
    width,
    height,
    tilewidth: TILE,
    tileheight: TILE,
    infinite: false,
    properties: [property("displayName", "string", displayName)],
    layers: [
      tileLayer(1, "ground", layers.ground, width, height),
      tileLayer(2, "terrain", layers.terrain, width, height),
      tileLayer(3, "details-low", layers.low, width, height),
      tileLayer(4, "objects", layers.objects, width, height),
      tileLayer(5, "collision", layers.collision, width, height, false),
      tileLayer(6, "details-high", layers.high, width, height),
      ...objects,
    ],
  };
}

function makeSouthernRegion() {
  const width = 64;
  const height = 52;
  const size = width * height;
  const index = (x, y) => y * width + x;
  const layers = {
    ground: Array(size).fill(16),
    terrain: Array(size).fill(0),
    low: Array(size).fill(0),
    objects: Array(size).fill(0),
    collision: Array(size).fill(1),
    high: Array(size).fill(0),
  };

  const westEdge = (y) => 4 + Math.max(0, Math.round(1.6 + Math.sin(y * 0.61) * 1.7 + Math.sin(y * 1.47) * 0.8));
  const eastEdge = (y) => width - 5 - Math.max(0, Math.round(1.4 + Math.sin(y * 0.53 + 1.2) * 1.6 + Math.sin(y * 1.31) * 0.8));
  for (let y = 3; y < height - 1; y += 1) {
    let left = westEdge(y);
    let right = eastEdge(y);
    if (y < 7) {
      left += 10 - (y - 3) * 2;
      right -= 8 - (y - 3) * 2;
    }
    if (y > 46) {
      left += (y - 46) * 2;
      right -= (y - 46) * 2;
    }
    for (let x = left; x <= right; x += 1) {
      const shore = x <= left + 1 || x >= right - 1 || y <= 4 || y >= 49;
      layers.terrain[index(x, y)] = shore ? 17 : 1;
      layers.collision[index(x, y)] = 0;
    }
  }

  const mountain = (left, top, right, bottom) => {
    for (let y = top; y <= bottom; y += 1) {
      for (let x = left; x <= right; x += 1) {
        if (layers.collision[index(x, y)] !== 0 || (x * 5 + y * 7) % 11 === 0) continue;
        layers.terrain[index(x, y)] = (x + y) % 3 === 0 ? 19 : 18;
        layers.collision[index(x, y)] = 1;
      }
    }
  };
  mountain(27, 7, 38, 17);
  mountain(31, 24, 44, 34);
  mountain(8, 30, 17, 39);
  mountain(47, 27, 56, 38);
  mountain(10, 8, 15, 13);

  const paintRoad = (points) => {
    for (let point = 0; point < points.length - 1; point += 1) {
      let [x, y] = points[point];
      const [targetX, targetY] = points[point + 1];
      while (x !== targetX || y !== targetY) {
        for (const [roadX, roadY] of [[x, y], [x + 1, y]]) {
          if (roadX >= 0 && roadY >= 0 && roadX < width && roadY < height) {
            layers.terrain[index(roadX, roadY)] = 2;
            layers.collision[index(roadX, roadY)] = 0;
          }
        }
        if (x !== targetX) x += Math.sign(targetX - x);
        else y += Math.sign(targetY - y);
      }
    }
  };

  // The maintained road has two loops: the direct ridge pass and a longer coastal route.
  paintRoad([[31, 49], [31, 41], [25, 35], [25, 28], [20, 23], [18, 18]]);
  paintRoad([[18, 18], [23, 19], [23, 22], [34, 22], [40, 18], [49, 14]]);
  paintRoad([[18, 18], [13, 23], [18, 28], [25, 35], [37, 38], [43, 31], [43, 21], [49, 14]]);
  paintRoad([[31, 49], [38, 45], [44, 45], [49, 39]]);

  // Clear readable plazas under both oversized landmarks.
  for (const [centerX, centerY] of [[18, 18], [49, 14]]) {
    for (let y = centerY - 2; y <= centerY + 2; y += 1) {
      for (let x = centerX - 2; x <= centerX + 2; x += 1) {
        layers.terrain[index(x, y)] = x === centerX || y === centerY ? 2 : 1;
        layers.collision[index(x, y)] = 0;
      }
    }
  }

  for (let y = 5; y < height - 2; y += 1) {
    for (let x = 5; x < width - 5; x += 1) {
      if (layers.terrain[index(x, y)] === 1 && (x * 13 + y * 17) % 47 === 0) layers.low[index(x, y)] = 21;
    }
  }

  const townCenter = { x: 18, y: 18 };
  const triggers = [
    { id: 1, name: "tideglass-from-north", type: "transition", x: townCenter.x * TILE - 24, y: townCenter.y * TILE - 16, width: 48, height: 8, properties: [property("targetMap", "string", "tideglass-harbor"), property("targetX", "int", 19), property("targetY", "int", 1), property("targetDirection", "string", "down")] },
    { id: 2, name: "tideglass-from-south", type: "transition", x: townCenter.x * TILE - 24, y: townCenter.y * TILE + 16, width: 48, height: 8, properties: [property("targetMap", "string", "tideglass-harbor"), property("targetX", "int", 19), property("targetY", "int", 24), property("targetDirection", "string", "up")] },
    { id: 3, name: "tideglass-from-west", type: "transition", x: townCenter.x * TILE - 32, y: townCenter.y * TILE - 16, width: 8, height: 40, properties: [property("targetMap", "string", "tideglass-harbor"), property("targetX", "int", 1), property("targetY", "int", 13), property("targetDirection", "string", "right")] },
    { id: 4, name: "tideglass-from-east", type: "transition", x: townCenter.x * TILE + 24, y: townCenter.y * TILE - 16, width: 8, height: 40, properties: [property("targetMap", "string", "tideglass-harbor"), property("targetX", "int", 36), property("targetY", "int", 13), property("targetDirection", "string", "left")] },
    { id: 5, name: "undertide-west-mouth", type: "transition", x: 49 * TILE - 12, y: 14 * TILE + 8, width: 24, height: 12, properties: [property("targetMap", "string", "undertide-passage"), property("targetX", "int", 3), property("targetY", "int", 27), property("targetDirection", "string", "right")] },
  ];

  const interactions = [];
  const entities = [{
    id: 20,
    name: "Northern Ferry",
    type: "npc",
    x: 31 * TILE,
    y: 48 * TILE,
    width: TILE,
    height: TILE,
    properties: [
      property("spriteId", "string", "ferry-boat"), property("dialogueId", "string", "board-northern-return-ferry"),
      property("travelMap", "string", "glass-steppe"), property("travelX", "int", 28), property("travelY", "int", 80),
      property("movement", "string", "fixed"), property("direction", "string", "up"),
    ],
  }, {
    id: 21,
    name: "Captain Sera Venn",
    type: "npc",
    x: 46 * TILE,
    y: 15 * TILE,
    width: TILE,
    height: TILE,
    properties: [
      property("spriteId", "string", "sera-venn"), property("dialogueId", "string", "sera-entrance"),
      property("dialogueAfterFlag", "string", "party.sera-recruited"), property("dialogueAfterId", "string", "sera-after-recruit"),
      property("recruitMemberId", "string", "sera"), property("recruitFlag", "string", "party.sera-recruited"),
      property("hiddenFlag", "string", "party.sera-recruited"),
      property("movement", "string", "fixed"), property("direction", "string", "down"),
    ],
  }];
  const scenery = [
    { id: 30, name: "Tideglass Harbor", type: "scenery", x: townCenter.x * TILE - 24, y: townCenter.y * TILE - 48, width: 48, height: 64, properties: [property("spriteId", "string", "world-tideglass"), property("anchorX", "int", 24), property("anchorY", "int", 56), property("footprintX", "int", 0), property("footprintY", "int", 48), property("footprintWidth", "int", 48), property("footprintHeight", "int", 16), property("blocksMovement", "bool", false)] },
    { id: 31, name: "Undertide Passage", type: "scenery", x: 49 * TILE - 24, y: 14 * TILE - 48, width: 48, height: 64, properties: [property("spriteId", "string", "world-moonfall-array"), property("anchorX", "int", 24), property("anchorY", "int", 56), property("footprintX", "int", 0), property("footprintY", "int", 48), property("footprintWidth", "int", 48), property("footprintHeight", "int", 16)] },
  ];
  const encounters = [
    { id: 40, name: "Southwake wild circuits", type: "encounter-zone", x: 5 * TILE, y: 4 * TILE, width: 54 * TILE, height: 44 * TILE, properties: [property("biome", "string", "southwake"), property("formations", "string", "reef-swarm:5,tidal-pack:4,saltwire-crab:2"), property("minDistance", "int", 135), property("maxDistance", "int", 205)] },
    { id: 41, name: "Moonfall interference field", type: "encounter-zone", x: 40 * TILE, y: 7 * TILE, width: 18 * TILE, height: 22 * TILE, properties: [property("biome", "string", "moonfall"), property("formations", "string", "tidal-pack:4,southwake-patrol:3,abyss-sentinel:1"), property("minDistance", "int", 115), property("maxDistance", "int", 175)] },
  ];

  return mapDocument("Southwake Isle", width, height, layers, [
    objectLayer(7, "triggers", triggers),
    objectLayer(8, "interactions", interactions),
    objectLayer(9, "entities", entities),
    objectLayer(10, "narrative", [{ id: 50, name: "Southwake arrival", type: "narrative", x: 27 * TILE, y: 42 * TILE, width: 9 * TILE, height: 7 * TILE, properties: [property("dialogueId", "string", "southern-island-arrival"), property("flag", "string", "scene.southern-island-arrival.seen")] }]),
    objectLayer(11, "scenery", scenery),
    objectLayer(12, "encounters", encounters, false),
  ]);
}

function makeTideglassHarbor() {
  const width = 38;
  const height = 26;
  const size = width * height;
  const index = (x, y) => y * width + x;
  const layers = {
    ground: Array(size).fill(14),
    terrain: Array(size).fill(0),
    low: Array(size).fill(0),
    objects: Array(size).fill(0),
    collision: Array(size).fill(0),
    high: Array(size).fill(0),
  };
  for (let x = 0; x < width; x += 1) {
    for (const y of [6, 14, 20]) layers.terrain[index(x, y)] = 15;
  }
  for (let y = 0; y < height; y += 1) {
    for (const x of [6, 12, 19, 27, 35]) layers.terrain[index(x, y)] = 15;
  }
  const block = (left, top, right, bottom) => {
    for (let y = top; y < bottom; y += 1) for (let x = left; x < right; x += 1) layers.collision[index(x, y)] = 1;
  };
  const buildings = [
    { id: 30, name: "Tideglass Memory Archive", role: "memory", x: 32, y: 16, width: 64, doorX: 56, doorY: 80 },
    { id: 31, name: "Tideglass Weapon Shop", role: "weapon", x: 128, y: 16, width: 64, doorX: 152, doorY: 80 },
    { id: 32, name: "Tideglass Inn", role: "inn", x: 224, y: 16, width: 80, doorX: 256, doorY: 80 },
    { id: 33, name: "Tideglass Transit Gate", role: "transit", x: 336, y: 16, width: 64, doorX: 360, doorY: 80 },
    { id: 34, name: "Tideglass Item Shop", role: "item", x: 64, y: 160, width: 64, doorX: 88, doorY: 224 },
    { id: 35, name: "Tideglass Regeneration Clinic", role: "clinic", x: 160, y: 160, width: 64, doorX: 184, doorY: 224 },
    { id: 36, name: "Tideglass Armor Shop", role: "armor", x: 256, y: 160, width: 64, doorX: 280, doorY: 224 },
    { id: 37, name: "Tideglass Harbor Office", role: "harbor", x: 352, y: 160, width: 80, doorX: 384, doorY: 224 },
  ];
  buildings.forEach((building) => {
    const left = Math.floor(building.x / TILE);
    const right = Math.ceil((building.x + building.width) / TILE);
    const row = Math.floor((building.y + 64) / TILE);
    block(left, row, right, row + 1);
    layers.collision[index(Math.floor(building.doorX / TILE), Math.floor(building.doorY / TILE))] = 0;
  });

  const service = (id, name, kind, x, y, text, price, extras = []) => ({
    id, name, type: "service", x, y, width: TILE, height: TILE,
    properties: [property("interactionKind", "string", kind), property("text", "string", text), property("price", "int", price), ...extras],
  });
  const interactions = [
    service(5, "tideglass-memory-counter", "save-shop", 56, 80, "The harbor archive records every route for free.", 0),
    service(6, "tideglass-weapon-shop", "weapon-shop", 152, 80, "Salt-sealed weapons are calibrated for the southern island.", 0),
    service(7, "tideglass-inn", "inn", 256, 80, "Warm tide chambers restore travellers after the sea crossing.", 68),
    service(8, "tideglass-transit-gate", "teleport", 360, 80, "The repaired control towers now carry transit signals across the sea.", 120, [property("destinationMap", "string", "vesper-crossing,aster-reach,lumen-hollow"), property("destinationName", "string", "VESPER CROSSING|ASTER REACH|LUMEN HOLLOW"), property("requiredFlag", "string", "village.vesper-crossing.visited|village.aster-reach.visited|village.lumen-hollow.visited")]),
    service(9, "tideglass-item-shop", "item-shop", 88, 224, "Island supplies cost more this far from the northern foundries.", 32),
    service(10, "tideglass-regeneration-clinic", "revival-shop", 184, 224, "Deep-signal restoration is available to lost party members.", 35),
    service(11, "tideglass-armor-shop", "armor-shop", 280, 224, "Pelagic armor is built for pressure, salt and unstable signals.", 0),
  ];

  const transitions = [
    { id: 1, name: "southwake-return-north", type: "transition", x: 0, y: 0, width: width * TILE, height: TILE, properties: [property("targetMap", "string", "southern-landing"), property("targetX", "int", 18), property("targetY", "int", 14), property("targetDirection", "string", "up")] },
    { id: 2, name: "southwake-return-south", type: "transition", x: 0, y: (height - 1) * TILE, width: width * TILE, height: TILE, properties: [property("targetMap", "string", "southern-landing"), property("targetX", "int", 18), property("targetY", "int", 21), property("targetDirection", "string", "down")] },
    { id: 3, name: "southwake-return-west", type: "transition", x: 0, y: TILE, width: TILE, height: (height - 2) * TILE, properties: [property("targetMap", "string", "southern-landing"), property("targetX", "int", 15), property("targetY", "int", 18), property("targetDirection", "string", "left")] },
    { id: 4, name: "southwake-return-east", type: "transition", x: (width - 1) * TILE, y: TILE, width: TILE, height: (height - 2) * TILE, properties: [property("targetMap", "string", "southern-landing"), property("targetX", "int", 21), property("targetY", "int", 18), property("targetDirection", "string", "right")] },
  ];

  const entities = [
    { id: 20, name: "Harbor Master Orla", type: "npc", x: 352, y: 256, width: TILE, height: TILE, properties: [property("spriteId", "string", "hollow-host"), property("dialogueId", "string", "tideglass-harbor-master"), property("movement", "string", "fixed"), property("direction", "string", "down")] },
    { id: 21, name: "Array Cartographer Edda", type: "npc", x: 112, y: 272, width: TILE, height: TILE, properties: [property("spriteId", "string", "surveyor-leth"), property("dialogueId", "string", "tideglass-cartographer"), property("movement", "string", "patrol"), property("patrolAxis", "string", "horizontal"), property("patrolRange", "int", 32), property("speed", "int", 12), property("direction", "string", "right")] },
    { id: 22, name: "Beacon Keeper Nemi", type: "npc", x: 208, y: 112, width: TILE, height: TILE, properties: [property("spriteId", "string", "wind-child"), property("dialogueId", "string", "tideglass-beacon-keeper"), property("movement", "string", "fixed"), property("direction", "string", "down")] },
    { id: 23, name: "Dockhand Varro", type: "npc", x: 304, y: 336, width: TILE, height: TILE, properties: [property("spriteId", "string", "glass-smith"), property("dialogueId", "string", "tideglass-dockhand"), property("movement", "string", "patrol"), property("patrolAxis", "string", "vertical"), property("patrolRange", "int", 24), property("speed", "int", 10), property("direction", "string", "down")] },
  ];
  const scenery = buildings.map((building) => ({
    id: building.id,
    name: building.name,
    type: "scenery",
    x: building.x,
    y: building.y,
    width: building.width,
    height: 80,
    properties: [property("spriteId", "string", `tideglass-hd-${building.role}`), property("anchorX", "int", building.width / 2), property("anchorY", "int", 72), property("footprintX", "int", 0), property("footprintY", "int", 64), property("footprintWidth", "int", building.width), property("footprintHeight", "int", 16)],
  }));

  return mapDocument("Tideglass Harbor", width, height, layers, [
    objectLayer(7, "triggers", transitions),
    objectLayer(8, "interactions", interactions),
    objectLayer(9, "entities", entities),
    objectLayer(10, "narrative", [{ id: 25, name: "Arrival at Tideglass Harbor", type: "narrative", x: 256, y: 304, width: 112, height: 64, properties: [property("dialogueId", "string", "tideglass-arrival"), property("flag", "string", "scene.tideglass-harbor-arrival.seen")] }]),
    objectLayer(11, "scenery", scenery),
    objectLayer(12, "encounters", [], false),
  ]);
}

await writeFile(new URL("../public/assets/maps/southern-landing.json", import.meta.url), `${JSON.stringify(makeSouthernRegion(), null, 2)}\n`);
await writeFile(new URL("../public/assets/maps/tideglass-harbor.json", import.meta.url), `${JSON.stringify(makeTideglassHarbor(), null, 2)}\n`);
await generateLaunchChapter();
