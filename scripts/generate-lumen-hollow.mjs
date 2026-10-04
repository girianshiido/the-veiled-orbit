import { writeFile } from "node:fs/promises";

const width = 35;
const height = 22;
const size = width * height;
const index = (x, y) => y * width + x;
const layer = (id, name, data, visible = true) => ({ id, name, type: "tilelayer", width, height, visible, data });
const objectLayer = (id, name, objects, visible = true) => ({ id, name, type: "objectgroup", visible, objects });
const property = (name, type, value) => ({ name, type, value });
const buildingFootprint = (x, width) => [
  property("footprintX", "int", x),
  property("footprintY", "int", 64),
  property("footprintWidth", "int", width),
  property("footprintHeight", "int", 16),
];
const tileSize = 16;
const openServiceDoor = (collisionData, mapWidth, x, y, doorWidth = tileSize) => {
  const tileY = Math.floor(y / tileSize);
  const firstTileX = Math.floor(x / tileSize);
  const lastTileX = Math.floor((x + doorWidth - 1) / tileSize);
  for (let tileX = firstTileX; tileX <= lastTileX; tileX += 1) {
    collisionData[tileY * mapWidth + tileX] = 0;
  }
};

const ground = Array(size).fill(14);
const terrain = Array(size).fill(0);
const low = Array(size).fill(0);
const objects = Array(size).fill(0);
const collision = Array(size).fill(0);
const high = Array(size).fill(0);

for (let x = 0; x < width; x += 1) {
  collision[index(x, 0)] = 0;
  collision[index(x, height - 1)] = 0;
}
for (let y = 0; y < height; y += 1) {
  collision[index(0, y)] = 0;
  collision[index(width - 1, y)] = 0;
}

for (let y = 0; y < height; y += 1) {
  terrain[index(13, y)] = 15;
  terrain[index(14, y)] = 15;
}
for (let y = 6; y <= 8; y += 1) {
  for (let x = 0; x < width; x += 1) terrain[index(x, y)] = 15;
}
// The Root Archive grows from a planted green enclave rather than the road.
for (let y = 6; y <= 8; y += 1) {
  for (let x = 28; x <= 34; x += 1) terrain[index(x, y)] = 0;
}
for (let y = 14; y <= 16; y += 1) {
  for (let x = 0; x < width; x += 1) terrain[index(x, y)] = 15;
}
for (const doorTileX of [3, 10, 17, 24]) {
  terrain[index(doorTileX, 5)] = 15;
  terrain[index(doorTileX, 13)] = 15;
}

const block = (left, top, right, bottom) => {
  for (let y = top; y < bottom; y += 1) for (let x = left; x < right; x += 1) collision[index(x, y)] = 1;
};
// Service-building bases use their pixel-precise scenery footprints at
// runtime. Keeping them out of the tile layer avoids invisible 16px ledges.
block(30, 9, 31, 10);
for (const [doorX, doorY] of [[48, 80], [160, 80], [272, 80], [384, 80], [48, 208], [160, 208], [272, 208], [384, 208]]) {
  openServiceDoor(collision, width, doorX, doorY);
}

const map = {
  type: "map",
  version: "1.10",
  tiledversion: "1.11.2",
  orientation: "orthogonal",
  renderorder: "right-down",
  width,
  height,
  tilewidth: 16,
  tileheight: 16,
  infinite: false,
  properties: [property("displayName", "string", "Lumen Hollow")],
  layers: [
    layer(1, "ground", ground),
    layer(2, "terrain", terrain),
    layer(3, "details-low", low),
    layer(4, "objects", objects),
    layer(5, "collision", collision, false),
    layer(6, "details-high", high),
    objectLayer(7, "triggers", [
      { id: 1, name: "world-return-north", type: "transition", x: 0, y: 0, width: width * 16, height: 16, properties: [property("targetMap", "string", "glass-steppe"), property("targetX", "int", 6), property("targetY", "int", 2), property("targetDirection", "string", "up")] },
      { id: 21, name: "world-return-south", type: "transition", x: 0, y: (height - 1) * 16, width: width * 16, height: 16, properties: [property("targetMap", "string", "glass-steppe"), property("targetX", "int", 6), property("targetY", "int", 6), property("targetOffsetY", "int", 1), property("targetDirection", "string", "down")] },
      { id: 22, name: "world-return-west", type: "transition", x: 0, y: 16, width: 16, height: (height - 2) * 16, properties: [property("targetMap", "string", "glass-steppe"), property("targetX", "int", 4), property("targetY", "int", 5), property("targetOffsetX", "int", 7), property("targetDirection", "string", "left")] },
      { id: 23, name: "world-return-east", type: "transition", x: (width - 1) * 16, y: 16, width: 16, height: (height - 2) * 16, properties: [property("targetMap", "string", "glass-steppe"), property("targetX", "int", 8), property("targetY", "int", 5), property("targetOffsetX", "int", -8), property("targetDirection", "string", "right")] },
    ]),
    objectLayer(8, "interactions", [
      {
        id: 2,
        name: "hollow-inn-service",
        type: "service",
        x: 48,
        y: 80,
        width: 16,
        height: 16,
        properties: [
          property("interactionKind", "string", "inn"),
          property("text", "string", "Resonance beds hum beyond the violet door."),
          property("price", "int", 12),
        ],
      },
      {
        id: 3,
        name: "weapon-shop-service",
        type: "service",
        x: 272,
        y: 80,
        width: 16,
        height: 16,
        properties: [
          property("interactionKind", "string", "weapon-shop"),
          property("text", "string", "Tuned weapons hang behind the counter."),
          property("price", "int", 0),
        ],
      },
      {
        id: 4,
        name: "transit-gate-service",
        type: "service",
        x: 384,
        y: 80,
        width: 16,
        height: 16,
        properties: [
          property("interactionKind", "string", "teleport"),
          property("text", "string", "The transit lattice links every village beacon registered on foot."),
          property("price", "int", 25),
          property("destinationMap", "string", "aster-reach,vesper-crossing"),
          property("destinationName", "string", "ASTER REACH|VESPER CROSSING"),
          property("requiredFlag", "string", "village.aster-reach.visited|village.vesper-crossing.visited"),
        ],
      },
      {
        id: 15,
        name: "item-shop-service",
        type: "service",
        x: 48,
        y: 208,
        width: 16,
        height: 16,
        properties: [
          property("interactionKind", "string", "item-shop"),
          property("text", "string", "Field supplies are sealed against glass dust."),
          property("price", "int", 8),
        ],
      },
      {
        id: 16,
        name: "armor-shop-service",
        type: "service",
        x: 384,
        y: 208,
        width: 16,
        height: 16,
        properties: [
          property("interactionKind", "string", "armor-shop"),
          property("text", "string", "Defensive frames are aligned along the wall."),
          property("price", "int", 0),
        ],
      },
      {
        id: 17,
        name: "memory-counter-service",
        type: "service",
        x: 272,
        y: 208,
        width: 16,
        height: 16,
        properties: [
          property("interactionKind", "string", "save-shop"),
          property("text", "string", "The Archive offers to hold a copy of your journey."),
          property("price", "int", 0),
        ],
      },
      {
        id: 19,
        name: "ash-house-service",
        type: "service",
        x: 160,
        y: 80,
        width: 16,
        height: 16,
        properties: [
          property("interactionKind", "string", "party-house"),
          property("text", "string", "Ash's companions gather here between expeditions."),
          property("price", "int", 0),
        ],
      },
      {
        id: 26,
        name: "lumen-regeneration-clinic",
        type: "service",
        x: 160,
        y: 208,
        width: 16,
        height: 16,
        properties: [
          property("interactionKind", "string", "revival-shop"),
          property("text", "string", "A recovery lattice reconstructs lost party signals."),
          property("price", "int", 15),
        ],
      },
      {
        id: 28,
        name: "root-archive-seal",
        type: "message",
        x: 480,
        y: 144,
        width: 16,
        height: 16,
        properties: [
          property("interactionKind", "string", "message"),
          property("text", "string", "ROOT ARCHIVE: The living entrance is sealed. A dormant cyan lock pulses beneath the bark."),
        ],
      },
    ]),
    objectLayer(9, "entities", [
      {
        id: 5,
        name: "Surveyor Leth",
        type: "npc",
        x: 128,
        y: 112,
        width: 16,
        height: 16,
        properties: [
          property("spriteId", "string", "surveyor-leth"), property("dialogueId", "string", "surveyor-leth"),
          property("movement", "string", "fixed"), property("direction", "string", "down"),
        ],
      },
      {
        id: 6,
        name: "Rook",
        type: "npc",
        x: 208,
        y: 272,
        width: 16,
        height: 16,
        properties: [
          property("spriteId", "string", "glass-smith"), property("dialogueId", "string", "rook-walker"),
          property("movement", "string", "patrol"), property("patrolAxis", "string", "vertical"),
          property("patrolRange", "int", 24), property("speed", "int", 11), property("direction", "string", "down"),
        ],
      },
      {
        id: 7,
        name: "Tavi",
        type: "npc",
        x: 320,
        y: 288,
        width: 16,
        height: 16,
        properties: [
          property("spriteId", "string", "wind-child"), property("dialogueId", "string", "wind-child"),
          property("movement", "string", "patrol"), property("patrolAxis", "string", "horizontal"),
          property("patrolRange", "int", 32), property("speed", "int", 15), property("direction", "string", "right"),
        ],
      },
      {
        id: 24,
        name: "Mayor Orren",
        type: "npc",
        x: 288,
        y: 272,
        width: 16,
        height: 16,
        properties: [
          property("spriteId", "string", "hollow-host"), property("dialogueId", "string", "mayor-missing"),
          property("dialogueAfterFlag", "string", "quest.mira-home"), property("dialogueAfterId", "string", "mayor-thanks"),
          property("movement", "string", "fixed"), property("direction", "string", "down"),
        ],
      },
      {
        id: 25,
        name: "Mira",
        type: "npc",
        x: 304,
        y: 272,
        width: 16,
        height: 16,
        properties: [
          property("spriteId", "string", "mayor-daughter"), property("dialogueId", "string", "mira-home"),
          property("requiredFlag", "string", "quest.mira-home"), property("movement", "string", "fixed"), property("direction", "string", "down"),
        ],
      },
      {
        id: 31,
        name: "Botanist Vale",
        type: "npc",
        x: 432,
        y: 176,
        width: 16,
        height: 16,
        properties: [
          property("spriteId", "string", "lumen-botanist"), property("dialogueId", "string", "lumen-botanist"),
          property("movement", "string", "patrol"), property("patrolAxis", "string", "vertical"),
          property("patrolRange", "int", 24), property("speed", "int", 9), property("direction", "string", "down"),
        ],
      },
    ]),
    objectLayer(10, "narrative", []),
    objectLayer(11, "scenery", [
      {
        id: 9,
        name: "Hollow Inn",
        type: "scenery",
        x: 16,
        y: 16,
        width: 80,
        height: 80,
        properties: [
          property("spriteId", "string", "lumen-hd-inn"), property("anchorX", "int", 40), property("anchorY", "int", 80),
          ...buildingFootprint(2, 77),
        ],
      },
      {
        id: 10,
        name: "Signal Market",
        type: "scenery",
        x: 240,
        y: 16,
        width: 80,
        height: 80,
        properties: [
          property("spriteId", "string", "lumen-study-shop"), property("anchorX", "int", 40), property("anchorY", "int", 80),
          ...buildingFootprint(3, 74),
        ],
      },
      {
        id: 11,
        name: "Lumen Spire",
        type: "scenery",
        x: 352,
        y: 16,
        width: 80,
        height: 80,
        properties: [
          property("spriteId", "string", "lumen-hd-transit"), property("anchorX", "int", 40), property("anchorY", "int", 80),
          ...buildingFootprint(11, 51),
        ],
      },
      {
        id: 20,
        name: "Ash's House",
        type: "scenery",
        x: 128,
        y: 16,
        width: 80,
        height: 80,
        properties: [
          property("spriteId", "string", "lumen-study-home"), property("anchorX", "int", 40), property("anchorY", "int", 80),
          ...buildingFootprint(4, 70),
        ],
      },
      {
        id: 12,
        name: "Item Shop",
        type: "scenery",
        x: 16,
        y: 144,
        width: 80,
        height: 80,
        properties: [
          property("spriteId", "string", "lumen-hd-item"), property("anchorX", "int", 40), property("anchorY", "int", 80),
          ...buildingFootprint(2, 76),
        ],
      },
      {
        id: 27,
        name: "Lumen Regeneration Clinic",
        type: "scenery",
        x: 128,
        y: 144,
        width: 80,
        height: 80,
        properties: [
          property("spriteId", "string", "lumen-hd-clinic"), property("anchorX", "int", 40), property("anchorY", "int", 80),
          ...buildingFootprint(4, 74),
        ],
      },
      {
        id: 13,
        name: "Armor Shop",
        type: "scenery",
        x: 352,
        y: 144,
        width: 80,
        height: 80,
        properties: [
          property("spriteId", "string", "lumen-hd-armor"), property("anchorX", "int", 40), property("anchorY", "int", 80),
          ...buildingFootprint(1, 78),
        ],
      },
      {
        id: 14,
        name: "Northern signal tree",
        type: "scenery",
        x: 464,
        y: 96,
        width: 48,
        height: 64,
        properties: [
          property("spriteId", "string", "lumen-study-tree"), property("anchorX", "int", 24), property("anchorY", "int", 56),
          property("footprintX", "int", 16), property("footprintY", "int", 48), property("footprintWidth", "int", 16), property("footprintHeight", "int", 16),
        ],
      },
      {
        id: 18,
        name: "Memory Counter",
        type: "scenery",
        x: 240,
        y: 144,
        width: 80,
        height: 80,
        properties: [
          property("spriteId", "string", "lumen-hd-memory"), property("anchorX", "int", 40), property("anchorY", "int", 80),
          ...buildingFootprint(10, 59),
        ],
      },
    ]),
    objectLayer(12, "encounters", [], false),
  ],
};

await writeFile(new URL("../public/assets/maps/lumen-hollow.json", import.meta.url), `${JSON.stringify(map, null, 2)}\n`);

const asterWidth = 28;
const asterHeight = 20;
const asterSize = asterWidth * asterHeight;
const asterIndex = (x, y) => y * asterWidth + x;
const asterLayer = (id, name, data, visible = true) => ({
  id, name, type: "tilelayer", width: asterWidth, height: asterHeight, visible, data,
});
const asterGround = Array(asterSize).fill(14);
const asterTerrain = Array(asterSize).fill(0);
const asterLow = Array(asterSize).fill(0);
const asterObjects = Array(asterSize).fill(0);
const asterCollision = Array(asterSize).fill(0);
const asterHigh = Array(asterSize).fill(0);
for (let x = 0; x < asterWidth; x += 1) {
  asterCollision[asterIndex(x, 0)] = 0;
  asterCollision[asterIndex(x, asterHeight - 1)] = 0;
}
for (let y = 0; y < asterHeight; y += 1) {
  asterCollision[asterIndex(0, y)] = 0;
  asterCollision[asterIndex(asterWidth - 1, y)] = 0;
}
for (let y = 5; y < asterHeight; y += 1) asterTerrain[asterIndex(14, y)] = 15;
for (let x = 1; x < asterWidth - 1; x += 1) {
  asterTerrain[asterIndex(x, 6)] = 15;
  asterTerrain[asterIndex(x, 7)] = 15;
  asterTerrain[asterIndex(x, 14)] = 15;
}
// The regional HD ground already includes restrained natural details.
const asterBlock = (left, top, right, bottom) => {
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) asterCollision[asterIndex(x, y)] = 1;
  }
};
asterBlock(2, 5, 6, 6);
asterBlock(9, 6, 11, 7);
asterBlock(14, 5, 19, 6);
asterBlock(21, 5, 25, 6);
asterBlock(4, 12, 8, 13);
asterBlock(10, 12, 14, 13);
asterBlock(16, 12, 20, 13);
for (const [doorX, doorY] of [[56, 80], [152, 96], [256, 80], [360, 80], [88, 192], [184, 192], [280, 192]]) {
  openServiceDoor(asterCollision, asterWidth, doorX, doorY);
}

const asterMap = {
  type: "map",
  version: "1.10",
  tiledversion: "1.11.2",
  orientation: "orthogonal",
  renderorder: "right-down",
  width: asterWidth,
  height: asterHeight,
  tilewidth: 16,
  tileheight: 16,
  infinite: false,
  properties: [property("displayName", "string", "Aster Reach")],
  layers: [
    asterLayer(1, "ground", asterGround),
    asterLayer(2, "terrain", asterTerrain),
    asterLayer(3, "details-low", asterLow),
    asterLayer(4, "objects", asterObjects),
    asterLayer(5, "collision", asterCollision, false),
    asterLayer(6, "details-high", asterHigh),
    objectLayer(7, "triggers", [
      { id: 1, name: "world-return-north", type: "transition", x: 0, y: 0, width: asterWidth * 16, height: 16, properties: [property("targetMap", "string", "glass-steppe"), property("targetX", "int", 40), property("targetY", "int", 30), property("targetDirection", "string", "up")] },
      { id: 11, name: "world-return-south", type: "transition", x: 0, y: (asterHeight - 1) * 16, width: asterWidth * 16, height: 16, properties: [property("targetMap", "string", "glass-steppe"), property("targetX", "int", 40), property("targetY", "int", 34), property("targetOffsetY", "int", 1), property("targetDirection", "string", "down")] },
      { id: 12, name: "world-return-west", type: "transition", x: 0, y: 16, width: 16, height: (asterHeight - 2) * 16, properties: [property("targetMap", "string", "glass-steppe"), property("targetX", "int", 38), property("targetY", "int", 33), property("targetOffsetX", "int", 7), property("targetDirection", "string", "left")] },
      { id: 13, name: "world-return-east", type: "transition", x: (asterWidth - 1) * 16, y: 16, width: 16, height: (asterHeight - 2) * 16, properties: [property("targetMap", "string", "glass-steppe"), property("targetX", "int", 42), property("targetY", "int", 33), property("targetOffsetX", "int", -8), property("targetDirection", "string", "right")] },
    ]),
    objectLayer(8, "interactions", [
      {
        id: 2,
        name: "aster-memory-counter",
        type: "service",
        x: 56,
        y: 80,
        width: 16,
        height: 16,
        properties: [
          property("interactionKind", "string", "save-shop"),
          property("text", "string", "Aster's memory keeper offers three free archive slots."), property("price", "int", 0),
        ],
      },
      {
        id: 3,
        name: "aster-transit-gate",
        type: "service",
        x: 152,
        y: 96,
        width: 16,
        height: 16,
        properties: [
          property("interactionKind", "string", "teleport"),
          property("text", "string", "The gate resonates with Lumen Hollow's beacon."),
          property("price", "int", 35), property("destinationMap", "string", "lumen-hollow,vesper-crossing"),
          property("destinationName", "string", "LUMEN HOLLOW|VESPER CROSSING"),
          property("requiredFlag", "string", "village.lumen-hollow.visited|village.vesper-crossing.visited"),
        ],
      },
      {
        id: 4,
        name: "aster-inn",
        type: "service",
        x: 256,
        y: 80,
        width: 16,
        height: 16,
        properties: [
          property("interactionKind", "string", "inn"),
          property("text", "string", "A quiet room overlooks the glass basin."), property("price", "int", 18),
        ],
      },
      {
        id: 20, name: "aster-weapon-shop", type: "service", x: 360, y: 80, width: 16, height: 16,
        properties: [property("interactionKind", "string", "weapon-shop"), property("text", "string", "Aster calibrates weapons for the eastern routes."), property("price", "int", 0)],
      },
      {
        id: 21, name: "aster-item-shop", type: "service", x: 88, y: 192, width: 16, height: 16,
        properties: [property("interactionKind", "string", "item-shop"), property("text", "string", "Travel supplies line the quiet counter."), property("price", "int", 12)],
      },
      {
        id: 22, name: "aster-armor-shop", type: "service", x: 280, y: 192, width: 16, height: 16,
        properties: [property("interactionKind", "string", "armor-shop"), property("text", "string", "Defensive frames are tested against bridge winds."), property("price", "int", 0)],
      },
      {
        id: 27, name: "aster-regeneration-clinic", type: "service", x: 184, y: 192, width: 16, height: 16,
        properties: [property("interactionKind", "string", "revival-shop"), property("text", "string", "Aster's clinic restores party members whose signals have failed."), property("price", "int", 20)],
      },
    ]),
    objectLayer(9, "entities", [
      {
        id: 5,
        name: "Elder Sira",
        type: "npc",
        x: 96,
        y: 128,
        width: 16,
        height: 16,
        properties: [
          property("spriteId", "string", "hollow-host"), property("dialogueId", "string", "aster-elder"),
          property("movement", "string", "fixed"), property("direction", "string", "down"),
        ],
      },
      {
        id: 6,
        name: "Pell",
        type: "npc",
        x: 256,
        y: 224,
        width: 16,
        height: 16,
        properties: [
          property("spriteId", "string", "aster-courier"), property("dialogueId", "string", "aster-runner"),
          property("movement", "string", "patrol"), property("patrolAxis", "string", "horizontal"),
          property("patrolRange", "int", 32), property("speed", "int", 14), property("direction", "string", "right"),
        ],
      },
      {
        id: 26,
        name: "Ione",
        type: "npc",
        x: 192,
        y: 224,
        width: 16,
        height: 16,
        properties: [
          property("spriteId", "string", "archive-adept"), property("dialogueId", "string", "ione-recruit"),
          property("recruitMemberId", "string", "ione"), property("recruitFlag", "string", "party.ione-recruited"),
          property("hiddenFlag", "string", "party.ione-recruited"), property("movement", "string", "fixed"), property("direction", "string", "down"),
        ],
      },
    ]),
    objectLayer(10, "narrative", [{
      id: 7,
      name: "Arrival at Aster Reach",
      type: "narrative",
      x: 176,
      y: 240,
      width: 96,
      height: 48,
      properties: [
        property("dialogueId", "string", "aster-arrival"), property("flag", "string", "scene.aster-reach-arrival.seen"),
      ],
    }]),
    objectLayer(11, "scenery", [
      {
        id: 8,
        name: "Aster Memory House",
        type: "scenery",
        x: 32,
        y: 16,
        width: 64,
        height: 80,
        properties: [
          property("spriteId", "string", "aster-hd-memory"), property("anchorX", "int", 32), property("anchorY", "int", 72),
          property("footprintX", "int", 0), property("footprintY", "int", 64), property("footprintWidth", "int", 64), property("footprintHeight", "int", 16),
        ],
      },
      {
        id: 9,
        name: "Aster Transit Spire",
        type: "scenery",
        x: 128,
        y: 32,
        width: 64,
        height: 80,
        properties: [
          property("spriteId", "string", "aster-hd-transit"), property("anchorX", "int", 32), property("anchorY", "int", 72),
          property("footprintX", "int", 0), property("footprintY", "int", 64), property("footprintWidth", "int", 64), property("footprintHeight", "int", 16),
        ],
      },
      {
        id: 10,
        name: "Aster Inn",
        type: "scenery",
        x: 224,
        y: 16,
        width: 80,
        height: 80,
        properties: [
          property("spriteId", "string", "aster-hd-inn"), property("anchorX", "int", 40), property("anchorY", "int", 72),
          property("footprintX", "int", 0), property("footprintY", "int", 64), property("footprintWidth", "int", 80), property("footprintHeight", "int", 16),
        ],
      },
      {
        id: 23, name: "Aster Weapon Shop", type: "scenery", x: 336, y: 16, width: 64, height: 80,
        properties: [property("spriteId", "string", "aster-hd-weapon"), property("anchorX", "int", 32), property("anchorY", "int", 72), property("footprintX", "int", 0), property("footprintY", "int", 64), property("footprintWidth", "int", 64), property("footprintHeight", "int", 16)],
      },
      {
        id: 24, name: "Aster Item Shop", type: "scenery", x: 64, y: 128, width: 64, height: 80,
        properties: [property("spriteId", "string", "aster-hd-item"), property("anchorX", "int", 32), property("anchorY", "int", 72), property("footprintX", "int", 0), property("footprintY", "int", 64), property("footprintWidth", "int", 64), property("footprintHeight", "int", 16)],
      },
      {
        id: 28, name: "Aster Regeneration Clinic", type: "scenery", x: 160, y: 128, width: 64, height: 80,
        properties: [property("spriteId", "string", "aster-hd-clinic"), property("anchorX", "int", 32), property("anchorY", "int", 72), property("footprintX", "int", 0), property("footprintY", "int", 64), property("footprintWidth", "int", 64), property("footprintHeight", "int", 16)],
      },
      {
        id: 25, name: "Aster Armor Shop", type: "scenery", x: 256, y: 128, width: 64, height: 80,
        properties: [property("spriteId", "string", "aster-hd-armor"), property("anchorX", "int", 32), property("anchorY", "int", 72), property("footprintX", "int", 0), property("footprintY", "int", 64), property("footprintWidth", "int", 64), property("footprintHeight", "int", 16)],
      },
    ]),
    objectLayer(12, "encounters", [], false),
  ],
};

await writeFile(new URL("../public/assets/maps/aster-reach.json", import.meta.url), `${JSON.stringify(asterMap, null, 2)}\n`);

const vesperWidth = 24;
const vesperHeight = 18;
const vesperSize = vesperWidth * vesperHeight;
const vesperIndex = (x, y) => y * vesperWidth + x;
const vesperLayer = (id, name, data, visible = true) => ({
  id, name, type: "tilelayer", width: vesperWidth, height: vesperHeight, visible, data,
});
const vesperGround = Array(vesperSize).fill(14);
const vesperTerrain = Array(vesperSize).fill(0);
const vesperLow = Array(vesperSize).fill(0);
const vesperObjects = Array(vesperSize).fill(0);
const vesperCollision = Array(vesperSize).fill(0);
const vesperHigh = Array(vesperSize).fill(0);
for (let y = 5; y < vesperHeight; y += 1) vesperTerrain[vesperIndex(12, y)] = 15;
for (let x = 1; x < vesperWidth - 1; x += 1) {
  vesperTerrain[vesperIndex(x, 7)] = 15;
  vesperTerrain[vesperIndex(x, 13)] = 15;
}
// The rocky regional HD ground already contains restrained surface detail.
const vesperBlock = (left, top, right, bottom) => {
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) vesperCollision[vesperIndex(x, y)] = 1;
  }
};
vesperBlock(2, 5, 6, 6);
vesperBlock(9, 6, 11, 7);
vesperBlock(13, 5, 17, 6);
vesperBlock(17, 5, 22, 6);
vesperBlock(4, 12, 8, 13);
vesperBlock(8, 12, 12, 13);
// The armor shop uses a cropped irregular facade. Its pixel-precise scenery
// footprint below is narrower than four whole tiles, so a legacy tile block
// here would leave invisible walls on both sides of the painted building.
for (const [doorX, doorY] of [[56, 80], [152, 96], [232, 80], [304, 80], [88, 192], [152, 192], [280, 192]]) {
  openServiceDoor(vesperCollision, vesperWidth, doorX, doorY);
}

const vesperMap = {
  type: "map",
  version: "1.10",
  tiledversion: "1.11.2",
  orientation: "orthogonal",
  renderorder: "right-down",
  width: vesperWidth,
  height: vesperHeight,
  tilewidth: 16,
  tileheight: 16,
  infinite: false,
  properties: [property("displayName", "string", "Vesper Crossing")],
  layers: [
    vesperLayer(1, "ground", vesperGround),
    vesperLayer(2, "terrain", vesperTerrain),
    vesperLayer(3, "details-low", vesperLow),
    vesperLayer(4, "objects", vesperObjects),
    vesperLayer(5, "collision", vesperCollision, false),
    vesperLayer(6, "details-high", vesperHigh),
    objectLayer(7, "triggers", [
      { id: 1, name: "world-return-north", type: "transition", x: 0, y: 0, width: vesperWidth * 16, height: 16, properties: [property("targetMap", "string", "glass-steppe"), property("targetX", "int", 22), property("targetY", "int", 59), property("targetDirection", "string", "up")] },
      { id: 2, name: "world-return-south", type: "transition", x: 0, y: (vesperHeight - 1) * 16, width: vesperWidth * 16, height: 16, properties: [property("targetMap", "string", "glass-steppe"), property("targetX", "int", 22), property("targetY", "int", 63), property("targetOffsetY", "int", 1), property("targetDirection", "string", "down")] },
      { id: 3, name: "world-return-west", type: "transition", x: 0, y: 16, width: 16, height: (vesperHeight - 2) * 16, properties: [property("targetMap", "string", "glass-steppe"), property("targetX", "int", 20), property("targetY", "int", 62), property("targetOffsetX", "int", 7), property("targetDirection", "string", "left")] },
      { id: 4, name: "world-return-east", type: "transition", x: (vesperWidth - 1) * 16, y: 16, width: 16, height: (vesperHeight - 2) * 16, properties: [property("targetMap", "string", "glass-steppe"), property("targetX", "int", 24), property("targetY", "int", 62), property("targetOffsetX", "int", -8), property("targetDirection", "string", "right")] },
    ]),
    objectLayer(8, "interactions", [
      { id: 5, name: "vesper-memory-counter", type: "service", x: 56, y: 80, width: 16, height: 16, properties: [property("interactionKind", "string", "save-shop"), property("text", "string", "The crossing archive records journeys for free."), property("price", "int", 0)] },
      { id: 6, name: "vesper-transit-gate", type: "service", x: 152, y: 96, width: 16, height: 16, properties: [property("interactionKind", "string", "teleport"), property("text", "string", "Southern relays answer through the bridge haze."), property("price", "int", 50), property("destinationMap", "string", "aster-reach,lumen-hollow"), property("destinationName", "string", "ASTER REACH|LUMEN HOLLOW"), property("requiredFlag", "string", "village.aster-reach.visited|village.lumen-hollow.visited")] },
      { id: 20, name: "vesper-weapon-shop", type: "service", x: 232, y: 80, width: 16, height: 16, properties: [property("interactionKind", "string", "weapon-shop"), property("text", "string", "Rare southern weapons rest inside magnetic seals."), property("price", "int", 0)] },
      { id: 7, name: "vesper-inn", type: "service", x: 304, y: 80, width: 16, height: 16, properties: [property("interactionKind", "string", "inn"), property("text", "string", "The bridgewatch keeps reinforced rooms for travellers."), property("price", "int", 24)] },
      { id: 8, name: "vesper-item-shop", type: "service", x: 88, y: 192, width: 16, height: 16, properties: [property("interactionKind", "string", "item-shop"), property("text", "string", "Emergency supplies wait behind sealed glass."), property("price", "int", 16)] },
      { id: 9, name: "vesper-armor-shop", type: "service", x: 280, y: 192, width: 16, height: 16, properties: [property("interactionKind", "string", "armor-shop"), property("text", "string", "Bridge-tested armor hangs from magnetic braces."), property("price", "int", 0)] },
      { id: 18, name: "vesper-regeneration-clinic", type: "service", x: 152, y: 192, width: 16, height: 16, properties: [property("interactionKind", "string", "revival-shop"), property("text", "string", "The bridge clinic rebuilds travellers lost to hostile signals."), property("price", "int", 25)] },
    ]),
    objectLayer(9, "entities", [
      { id: 10, name: "Warden Mae", type: "npc", x: 144, y: 224, width: 16, height: 16, properties: [property("spriteId", "string", "glass-smith"), property("dialogueId", "string", "vesper-warden"), property("movement", "string", "patrol"), property("patrolAxis", "string", "horizontal"), property("patrolRange", "int", 32), property("speed", "int", 10), property("direction", "string", "right")] },
      { id: 11, name: "Nox", type: "npc", x: 224, y: 176, width: 16, height: 16, properties: [property("spriteId", "string", "bridge-scout"), property("dialogueId", "string", "nox-recruit"), property("recruitMemberId", "string", "nox"), property("recruitFlag", "string", "party.nox-recruited"), property("hiddenFlag", "string", "party.nox-recruited"), property("movement", "string", "patrol"), property("patrolAxis", "string", "horizontal"), property("patrolRange", "int", 48), property("speed", "int", 15), property("direction", "string", "right")] },
      { id: 22, name: "Engineer Rhea", type: "npc", x: 64, y: 224, width: 16, height: 16, properties: [property("spriteId", "string", "vesper-engineer"), property("dialogueId", "string", "vesper-control-engineer"), property("dialogueMiddleFlag", "string", "tower.west-restored"), property("dialogueMiddleId", "string", "vesper-control-engineer-east"), property("dialogueAfterFlag", "string", "quest.control-towers-restored"), property("dialogueAfterId", "string", "vesper-control-engineer-complete"), property("movement", "string", "fixed"), property("direction", "string", "down")] },
      { id: 23, name: "Boatman Ors", type: "npc", x: 320, y: 224, width: 16, height: 16, properties: [property("spriteId", "string", "vesper-boatman"), property("dialogueId", "string", "vesper-boatman"), property("dialogueAfterFlag", "string", "quest.control-towers-restored"), property("dialogueAfterId", "string", "vesper-boatman-ready"), property("movement", "string", "patrol"), property("patrolAxis", "string", "vertical"), property("patrolRange", "int", 16), property("speed", "int", 8), property("direction", "string", "down")] },
    ]),
    objectLayer(10, "narrative", [{ id: 12, name: "Arrival at Vesper Crossing", type: "narrative", x: 160, y: 224, width: 96, height: 48, properties: [property("dialogueId", "string", "vesper-arrival"), property("flag", "string", "scene.vesper-crossing-arrival.seen")] }]),
    objectLayer(11, "scenery", [
      { id: 13, name: "Vesper Memory House", type: "scenery", x: 32, y: 16, width: 64, height: 80, properties: [property("spriteId", "string", "vesper-hd-memory"), property("anchorX", "int", 32), property("anchorY", "int", 72), property("footprintX", "int", 0), property("footprintY", "int", 64), property("footprintWidth", "int", 64), property("footprintHeight", "int", 16)] },
      { id: 14, name: "Vesper Transit Spire", type: "scenery", x: 128, y: 32, width: 64, height: 80, properties: [property("spriteId", "string", "vesper-hd-transit"), property("anchorX", "int", 32), property("anchorY", "int", 72), property("footprintX", "int", 0), property("footprintY", "int", 64), property("footprintWidth", "int", 64), property("footprintHeight", "int", 16)] },
      { id: 21, name: "Vesper Weapon Shop", type: "scenery", x: 208, y: 16, width: 64, height: 80, properties: [property("spriteId", "string", "vesper-hd-weapon"), property("anchorX", "int", 32), property("anchorY", "int", 72), property("footprintX", "int", 0), property("footprintY", "int", 64), property("footprintWidth", "int", 64), property("footprintHeight", "int", 16)] },
      { id: 15, name: "Vesper Inn", type: "scenery", x: 272, y: 16, width: 80, height: 80, properties: [property("spriteId", "string", "vesper-hd-inn"), property("anchorX", "int", 40), property("anchorY", "int", 72), property("footprintX", "int", 0), property("footprintY", "int", 64), property("footprintWidth", "int", 80), property("footprintHeight", "int", 16)] },
      { id: 16, name: "Vesper Item Shop", type: "scenery", x: 64, y: 128, width: 64, height: 80, properties: [property("spriteId", "string", "vesper-hd-item"), property("anchorX", "int", 32), property("anchorY", "int", 72), property("footprintX", "int", 0), property("footprintY", "int", 64), property("footprintWidth", "int", 64), property("footprintHeight", "int", 16)] },
      { id: 19, name: "Vesper Regeneration Clinic", type: "scenery", x: 128, y: 128, width: 64, height: 80, properties: [property("spriteId", "string", "vesper-hd-clinic"), property("anchorX", "int", 32), property("anchorY", "int", 72), property("footprintX", "int", 0), property("footprintY", "int", 64), property("footprintWidth", "int", 64), property("footprintHeight", "int", 16)] },
      { id: 17, name: "Vesper Armor Shop", type: "scenery", x: 256, y: 128, width: 64, height: 80, properties: [property("spriteId", "string", "vesper-hd-armor"), property("anchorX", "int", 26), property("anchorY", "int", 72), property("footprintX", "int", 4), property("footprintY", "int", 64), property("footprintWidth", "int", 44), property("footprintHeight", "int", 16)] },
    ]),
    objectLayer(12, "encounters", [], false),
  ],
};

await writeFile(new URL("../public/assets/maps/vesper-crossing.json", import.meta.url), `${JSON.stringify(vesperMap, null, 2)}\n`);

const worldWidth = 56;
const worldHeight = 84;
const worldSize = worldWidth * worldHeight;
const worldIndex = (x, y) => y * worldWidth + x;
const worldLayer = (id, name, data, visible = true) => ({
  id, name, type: "tilelayer", width: worldWidth, height: worldHeight, visible, data,
});
const worldGround = Array(worldSize).fill(16);
const worldTerrain = Array(worldSize).fill(0);
const worldLow = Array(worldSize).fill(0);
const worldObjects = Array(worldSize).fill(0);
const worldCollision = Array(worldSize).fill(1);
const worldHigh = Array(worldSize).fill(0);
const coastVariation = (position, slowFrequency, fastFrequency, phase = 0) => Math.max(0, Math.round(
  1.35
  + Math.sin(position * slowFrequency + phase) * 1.3
  + Math.sin(position * fastFrequency + phase * 0.7) * 0.9,
));
const westCoast = (y) => 2
  + coastVariation(y, 0.47, 1.13)
  + (y >= 18 && y <= 23 ? 2 : 0);
const eastCoast = (y) => worldWidth - 3
  - coastVariation(y, 0.41, 0.97, 1.8)
  - (y >= 44 && y <= 49 ? 1 : 0)
  - (y >= 73 && y <= 76 ? 1 : 0);
const northCoast = (x) => {
  // Lumen Hollow and Echo Vault sit on two old northern landing shelves.
  if ((x >= 4 && x <= 8) || (x >= 30 && x <= 34)) return 2;
  return 2 + coastVariation(x, 0.43, 1.07, 0.6) + (x >= 17 && x <= 21 ? 2 : 0);
};
const southCoast = (x) => {
  // The three southern survey shelves remain roomy enough for later content,
  // but bays between them keep the shoreline from becoming a straight wall.
  if ((x >= 8 && x <= 12) || (x >= 26 && x <= 30) || (x >= 44 && x <= 48)) return worldHeight - 3;
  return worldHeight - 3
    - coastVariation(x, 0.36, 0.91, 2.4)
    - (x >= 34 && x <= 39 ? 1 : 0);
};
const isIsland = (x, y) => (
  x >= westCoast(y)
  && x <= eastCoast(y)
  && y >= northCoast(x)
  && y <= southCoast(x)
);
for (let y = 0; y < worldHeight; y += 1) {
  for (let x = 0; x < worldWidth; x += 1) {
    if (!isIsland(x, y)) continue;
    const coast = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].some(([nx, ny]) => !isIsland(nx, ny));
    worldTerrain[worldIndex(x, y)] = coast ? 17 : 1;
    worldCollision[worldIndex(x, y)] = 0;
  }
}
const worldPath = (x, y) => {
  if (!isIsland(x, y)) return;
  worldTerrain[worldIndex(x, y)] = 2;
  worldCollision[worldIndex(x, y)] = 0;
};
const reservedWorldSite = (x, y) => (
  (x >= 4 && x <= 8 && y >= 2 && y <= 7)
  || (x >= 30 && x <= 34 && y >= 3 && y <= 8)
  || (x >= 38 && x <= 42 && y >= 30 && y <= 35)
  || (x >= 20 && x <= 24 && y >= 59 && y <= 64)
  || (x >= 20 && x <= 24 && y >= 39 && y <= 41)
  || (x >= 8 && x <= 48 && y >= 74 && y <= 81)
);
const worldMountain = (x, y, variant = 18) => {
  if (!isIsland(x, y) || reservedWorldSite(x, y)) return;
  worldTerrain[worldIndex(x, y)] = variant;
  worldCollision[worldIndex(x, y)] = 1;
};
const carveRoad = (points) => {
  let [x, y] = points[0];
  worldPath(x, y);
  for (const [targetX, targetY] of points.slice(1)) {
    while (x !== targetX) {
      x += Math.sign(targetX - x);
      worldPath(x, y);
    }
    while (y !== targetY) {
      y += Math.sign(targetY - y);
      worldPath(x, y);
    }
  }
};

// The northern ranges shape three readable valleys instead of leaving one flat field.
for (let x = 10; x <= 29; x += 1) {
  const ridgeY = 10 + Math.round(Math.sin(x * 0.72));
  worldMountain(x, ridgeY, x % 3 === 0 ? 19 : 18);
  worldMountain(x, ridgeY + 1, x % 4 === 0 ? 19 : 18);
}
for (let y = 6; y <= 22; y += 1) {
  const ridgeX = 35 + Math.round(Math.sin(y * 0.8));
  worldMountain(ridgeX, y, y % 3 === 0 ? 19 : 18);
  worldMountain(ridgeX + 1, y, y % 4 === 0 ? 19 : 18);
}
for (let x = 11; x <= 19; x += 1) {
  const ridgeY = 19 + (x % 3);
  worldMountain(x, ridgeY, x % 2 === 0 ? 19 : 18);
}
for (let x = 27; x <= 34; x += 1) {
  const ridgeY = 21 + (x % 2);
  worldMountain(x, ridgeY, x % 3 === 0 ? 19 : 18);
}

// Two broad mountain belts break the direct north-south line. Roads pierce
// them at deliberately separated passes, so crossing the island remains
// readable without allowing a ten-second sprint between settlements.
for (let x = 3; x <= worldWidth - 4; x += 1) {
  const ridgeY = 20 + Math.round(Math.sin(x * 0.39));
  worldMountain(x, ridgeY, x % 3 === 0 ? 19 : 18);
  worldMountain(x, ridgeY + 1, x % 4 === 0 ? 19 : 18);
}
for (let x = 3; x <= worldWidth - 4; x += 1) {
  const ridgeY = 49 + Math.round(Math.sin(x * 0.43));
  worldMountain(x, ridgeY, x % 2 === 0 ? 19 : 18);
  worldMountain(x, ridgeY + 1, x % 5 === 0 ? 19 : 18);
}

// The territory beyond Vesper Crossing retains the three control-tower
// basins, shifted south with the rest of the enlarged continent.
for (let y = 60; y <= 78; y += 1) {
  const westX = 12 + Math.round(Math.sin(y * 0.63) * 2);
  worldMountain(westX, y, y % 3 === 0 ? 19 : 18);
  worldMountain(westX + 1, y, y % 4 === 0 ? 19 : 18);
  const eastX = 38 + Math.round(Math.sin(y * 0.57) * 3);
  worldMountain(eastX, y, y % 2 === 0 ? 19 : 18);
  worldMountain(eastX + 1, y, y % 5 === 0 ? 19 : 18);
}
for (let x = 17; x <= 34; x += 1) {
  const ridgeY = 70 + Math.round(Math.sin(x * 0.66) * 2);
  worldMountain(x, ridgeY, x % 3 === 0 ? 19 : 18);
}
for (let x = 5; x <= 50; x += 1) {
  if (x >= 20 && x <= 29) continue;
  const ridgeY = 76 + (x % 3 === 0 ? 1 : 0);
  worldMountain(x, ridgeY, x % 4 === 0 ? 19 : 18);
}

// Several winding approaches connect Lumen Hollow, Echo Vault and the newly
// distant Aster Reach. Their crossings through the first belt are far apart.
carveRoad([[6, 7], [11, 7], [11, 11], [18, 11], [18, 8], [25, 8], [25, 10], [32, 10], [32, 8]]);
carveRoad([[6, 7], [6, 14], [12, 14], [12, 18], [17, 18], [17, 22], [24, 22], [24, 27], [31, 27], [31, 30], [39, 30], [39, 32]]);
carveRoad([[32, 8], [38, 8], [38, 13], [44, 13], [44, 21], [40, 21], [40, 27], [39, 27], [39, 32]]);
carveRoad([[17, 22], [12, 22], [12, 26], [20, 26], [20, 29], [31, 29]]);
carveRoad([[24, 22], [31, 22], [31, 24], [40, 24]]);

// Echo Vault is entered from the short southern spur. The old road continued
// beneath the landmark toward the west and looked like a stray village tile.
// Replant those exposed tiles while keeping the actual threshold connected.
for (let x = 29; x <= 31; x += 1) {
  worldTerrain[worldIndex(x, 8)] = 1;
  worldCollision[worldIndex(x, 8)] = 0;
}

// Two approaches leave Aster Reach and converge on the guarded bridge.
carveRoad([[39, 32], [35, 32], [35, 35], [30, 35], [30, 38], [23, 38], [23, 40]]);
carveRoad([[39, 32], [43, 32], [43, 36], [37, 36], [37, 39], [23, 39], [23, 40]]);

// Beyond the bridge, the second belt forces a genuine loop before Vesper.
// Two passes remain available, one along a western escarpment and one through
// the longer eastern contour.
carveRoad([[22, 40], [22, 45], [16, 45], [16, 48], [11, 48], [11, 52], [18, 52], [18, 57], [22, 57], [22, 64]]);
carveRoad([[22, 45], [28, 45], [28, 48], [32, 48], [32, 52], [27, 52], [27, 56], [22, 56]]);

// South of Vesper Crossing the road splits toward the three control towers.
carveRoad([[22, 64], [18, 64], [18, 68], [15, 68], [15, 73], [10, 73], [10, 78]]);
carveRoad([[22, 64], [26, 64], [26, 69], [28, 69], [28, 79]]);
carveRoad([[22, 64], [31, 64], [31, 67], [35, 67], [35, 72], [46, 72], [46, 78]]);
carveRoad([[15, 73], [22, 73], [22, 75], [28, 75]]);
carveRoad([[28, 69], [35, 69], [35, 72]]);
carveRoad([[10, 78], [18, 78], [18, 80], [28, 80], [28, 79]]);
carveRoad([[28, 79], [37, 79], [37, 77], [46, 77], [46, 78]]);

for (let x = 2; x <= worldWidth - 3; x += 1) {
  if (!isIsland(x, 40)) continue;
  worldTerrain[worldIndex(x, 40)] = 0;
  worldCollision[worldIndex(x, 40)] = 1;
}
for (const bridgeX of [21, 22, 23]) {
  worldTerrain[worldIndex(bridgeX, 40)] = 2;
  worldCollision[worldIndex(bridgeX, 40)] = 0;
  worldObjects[worldIndex(bridgeX, 40)] = 12;
}

const worldPlateau = (centerX, centerY) => {
  for (let y = centerY - 1; y <= centerY + 1; y += 1) {
    for (let x = centerX - 1; x <= centerX + 1; x += 1) {
      if (!isIsland(x, y)) continue;
      worldTerrain[worldIndex(x, y)] = 21;
      worldCollision[worldIndex(x, y)] = 0;
    }
  }
};
worldPlateau(10, 78);
worldPlateau(28, 79);
worldPlateau(46, 78);

// The high-resolution grass texture already contains restrained flowers and
// stones. The old procedural detail tile would read as an isolated square.
const worldBlock = (left, top, right, bottom) => {
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) worldCollision[worldIndex(x, y)] = 1;
  }
};
worldBlock(31, 7, 34, 8);

const villageEntrances = ({
  id, mapId, x, y, targetWidth, targetHeight,
  northX = Math.floor(targetWidth / 2),
  southX = Math.floor(targetWidth / 2),
  westY = Math.floor(targetHeight / 2),
  eastY = Math.floor(targetHeight / 2),
  northOffsetX = 0,
  southOffsetX = 0,
}) => [
  {
    id, name: `${mapId}-entrance-north`, type: "transition", x, y: y + 24, width: 48, height: 16,
    properties: [property("targetMap", "string", mapId), property("targetX", "int", northX), property("targetY", "int", 1), property("targetOffsetX", "int", northOffsetX), property("targetDirection", "string", "down")],
  },
  {
    id: id + 1, name: `${mapId}-entrance-south`, type: "transition", x, y: y + 48, width: 48, height: 16,
    properties: [property("targetMap", "string", mapId), property("targetX", "int", southX), property("targetY", "int", targetHeight - 3), property("targetOffsetX", "int", southOffsetX), property("targetDirection", "string", "up")],
  },
  {
    id: id + 2, name: `${mapId}-entrance-west`, type: "transition", x, y: y + 24, width: 16, height: 40,
    properties: [property("targetMap", "string", mapId), property("targetX", "int", 1), property("targetY", "int", westY), property("targetDirection", "string", "right")],
  },
  {
    id: id + 3, name: `${mapId}-entrance-east`, type: "transition", x: x + 32, y: y + 24, width: 16, height: 40,
    properties: [property("targetMap", "string", mapId), property("targetX", "int", targetWidth - 2), property("targetY", "int", eastY), property("targetDirection", "string", "left")],
  },
];

const worldMap = {
  type: "map",
  version: "1.10",
  tiledversion: "1.11.2",
  orientation: "orthogonal",
  renderorder: "right-down",
  width: worldWidth,
  height: worldHeight,
  tilewidth: 16,
  tileheight: 16,
  infinite: false,
  properties: [property("displayName", "string", "Verdant Expanse")],
  layers: [
    worldLayer(1, "ground", worldGround),
    worldLayer(2, "terrain", worldTerrain),
    worldLayer(3, "details-low", worldLow),
    worldLayer(4, "objects", worldObjects),
    worldLayer(5, "collision", worldCollision, false),
    worldLayer(6, "details-high", worldHigh),
    objectLayer(7, "triggers", [
      ...villageEntrances({
        id: 20, mapId: "lumen-hollow", x: 80, y: 48, targetWidth: width, targetHeight: height,
        northX: 13, southX: 13, westY: 7, eastY: 15, northOffsetX: 4, southOffsetX: 4,
      }),
      {
        id: 3,
        name: "echo-vault-entrance",
        type: "transition",
        x: 512,
        y: 128,
        width: 16,
        height: 16,
        properties: [
          property("targetMap", "string", "echo-vault"), property("targetX", "int", 21),
          property("targetY", "int", 31), property("targetDirection", "string", "up"),
        ],
      },
      ...villageEntrances({ id: 24, mapId: "aster-reach", x: 624, y: 496, targetWidth: asterWidth, targetHeight: asterHeight }),
      ...villageEntrances({ id: 28, mapId: "vesper-crossing", x: 336, y: 960, targetWidth: vesperWidth, targetHeight: vesperHeight }),
      { id: 40, name: "west-control-tower-entrance", type: "transition", x: 10 * 16 - 12, y: 78 * 16, width: 24, height: 16, properties: [property("targetMap", "string", "west-control-1f"), property("targetX", "int", 21), property("targetY", "int", 31), property("targetDirection", "string", "up")] },
      { id: 41, name: "central-control-tower-entrance", type: "transition", x: 28 * 16 - 12, y: 79 * 16, width: 24, height: 16, properties: [property("targetMap", "string", "central-control-entry"), property("targetX", "int", 12), property("targetY", "int", 16), property("targetDirection", "string", "up")] },
      { id: 42, name: "east-control-tower-entrance", type: "transition", x: 46 * 16 - 12, y: 78 * 16, width: 24, height: 16, properties: [property("targetMap", "string", "east-control-1f"), property("targetX", "int", 21), property("targetY", "int", 31), property("targetDirection", "string", "up")] },
    ]),
    objectLayer(8, "interactions", [
      {
        id: 5,
        name: "island-wayfinder",
        type: "message",
        x: 304,
        y: 240,
        width: 16,
        height: 16,
        properties: [property("text", "string", "WAYFINDER: Vesper Crossing lies beyond the southern bridge. The lower route is hostile.")],
      },
      {
        id: 35,
        name: "southern-bridge-barrier",
        type: "barrier",
        x: 336,
        y: 640,
        width: 48,
        height: 16,
        properties: [
          property("interactionKind", "string", "barrier"), property("requiredFlag", "string", "quest.south-bridge-open"),
          property("text", "string", "MAYORAL LOCK: Southern passage authorization is required."),
        ],
      },
    ]),
    objectLayer(9, "entities", [{
      id: 50, name: "Southern Ferry", type: "npc", x: 28 * 16, y: 81 * 16, width: 16, height: 16,
      properties: [property("spriteId", "string", "ferry-boat"), property("dialogueId", "string", "board-southern-ferry"), property("requiredFlag", "string", "quest.control-towers-restored"), property("travelMap", "string", "southern-landing"), property("travelX", "int", 31), property("travelY", "int", 46), property("movement", "string", "fixed"), property("direction", "string", "down")],
    }]),
    objectLayer(10, "narrative", []),
    objectLayer(11, "scenery", [
      {
        id: 6,
        name: "Lumen Hollow miniature",
        type: "scenery",
        x: 80,
        y: 48,
        width: 48,
        height: 64,
        properties: [
          property("spriteId", "string", "world-village"), property("anchorX", "int", 24), property("anchorY", "int", 56),
          property("footprintX", "int", 0), property("footprintY", "int", 48), property("footprintWidth", "int", 48), property("footprintHeight", "int", 16), property("blocksMovement", "bool", false),
        ],
      },
      {
        id: 7,
        name: "Echo Vault tower",
        type: "scenery",
        x: 496,
        y: 64,
        width: 48,
        height: 64,
        properties: [
          property("spriteId", "string", "world-vault"), property("anchorX", "int", 24), property("anchorY", "int", 56),
          property("footprintX", "int", 0), property("footprintY", "int", 48), property("footprintWidth", "int", 48), property("footprintHeight", "int", 16),
        ],
      },
      {
        id: 8,
        name: "Aster Reach miniature",
        type: "scenery",
        x: 624,
        y: 496,
        width: 48,
        height: 64,
        properties: [
          property("spriteId", "string", "world-village"), property("anchorX", "int", 24), property("anchorY", "int", 56),
          property("footprintX", "int", 0), property("footprintY", "int", 48), property("footprintWidth", "int", 48), property("footprintHeight", "int", 16), property("blocksMovement", "bool", false),
        ],
      },
      {
        id: 12, name: "Vesper Crossing miniature", type: "scenery", x: 336, y: 960, width: 48, height: 64,
        properties: [property("spriteId", "string", "world-village"), property("anchorX", "int", 24), property("anchorY", "int", 56), property("footprintX", "int", 0), property("footprintY", "int", 48), property("footprintWidth", "int", 48), property("footprintHeight", "int", 16), property("blocksMovement", "bool", false)],
      },
      { id: 36, name: "West Control Tower", type: "scenery", x: 10 * 16 - 24, y: 75 * 16, width: 48, height: 64, properties: [property("spriteId", "string", "world-control-tower-west"), property("anchorX", "int", 24), property("anchorY", "int", 56), property("footprintX", "int", 0), property("footprintY", "int", 48), property("footprintWidth", "int", 48), property("footprintHeight", "int", 16), property("blocksMovement", "bool", false)] },
      { id: 37, name: "Central Control Tower", type: "scenery", x: 28 * 16 - 24, y: 76 * 16, width: 48, height: 64, properties: [property("spriteId", "string", "world-control-tower-central"), property("anchorX", "int", 24), property("anchorY", "int", 56), property("footprintX", "int", 0), property("footprintY", "int", 48), property("footprintWidth", "int", 48), property("footprintHeight", "int", 16), property("blocksMovement", "bool", false)] },
      { id: 38, name: "East Control Tower", type: "scenery", x: 46 * 16 - 24, y: 75 * 16, width: 48, height: 64, properties: [property("spriteId", "string", "world-control-tower-east"), property("anchorX", "int", 24), property("anchorY", "int", 56), property("footprintX", "int", 0), property("footprintY", "int", 48), property("footprintWidth", "int", 48), property("footprintHeight", "int", 16), property("blocksMovement", "bool", false)] },
    ]),
    objectLayer(12, "encounters", [
      {
        id: 9,
        name: "Western greenway",
        type: "encounter-zone",
        x: 48,
        y: 48,
        width: 400,
        height: 592,
        properties: [
          property("biome", "string", "verdant-west"), property("formations", "string", "prism-mite:5,glint-pair:4,mite-cluster:1"),
          property("minDistance", "int", 190), property("maxDistance", "int", 300),
        ],
      },
      {
        id: 10,
        name: "Eastern greenway",
        type: "encounter-zone",
        x: 448,
        y: 48,
        width: 400,
        height: 592,
        properties: [
          property("biome", "string", "verdant-east"), property("formations", "string", "glint-pair:4,dust-escort:3,mite-cluster:3"),
          property("minDistance", "int", 160), property("maxDistance", "int", 260),
        ],
      },
      {
        id: 13, name: "Southern bridge wilds", type: "encounter-zone", x: 48, y: 656, width: 800, height: 320,
        properties: [property("biome", "string", "southern-wilds"), property("formations", "string", "rift-hunter:4,rift-pack:2,storm-colossus:2,dust-escort:2"), property("minDistance", "int", 170), property("maxDistance", "int", 260)],
      },
      {
        id: 14, name: "Far southern frontier", type: "encounter-zone", x: 48, y: 976, width: 800, height: 336,
        properties: [property("biome", "string", "southern-frontier"), property("formations", "string", "rift-pack:4,storm-colossus:3,storm-patrol:2,dust-escort:1"), property("minDistance", "int", 160), property("maxDistance", "int", 240)],
      },
    ], false),
  ],
};

await writeFile(new URL("../public/assets/maps/glass-steppe.json", import.meta.url), `${JSON.stringify(worldMap, null, 2)}\n`);
