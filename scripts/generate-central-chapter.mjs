import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const TILE = 16;
const directory = new URL("../public/assets/maps/", import.meta.url);
const prop = (name, value) => ({ name, type: typeof value === "number" ? "int" : typeof value === "boolean" ? "bool" : "string", value });
const objects = (id, name, entries) => ({ id, name, type: "objectgroup", visible: name !== "encounters", objects: entries });
const object = (id, name, x, y, properties, width = 1, height = 1) => ({
  id, name, type: "interaction", x: x * TILE, y: y * TILE, width: width * TILE, height: height * TILE,
  properties: Object.entries(properties).map(([key, value]) => prop(key, value)),
});
const transition = (id, name, x, y, targetMap, targetX, targetY, targetDirection = "up", width = 1) => ({
  ...object(id, name, x, y, { targetMap, targetX, targetY, targetDirection }, width), type: "transition",
});
const narrative = (id, name, x, y, width, height, dialogueId) => object(id, name, x, y,
  { dialogueId, flag: `scene.${name}.seen` }, width, height);

function plan(name, width, height, { ground = 6, wall = 13, floor = 6, detail = 12 } = {}) {
  const layers = {
    ground: Array(width * height).fill(ground), terrain: Array(width * height).fill(wall),
    "details-low": Array(width * height).fill(0), objects: Array(width * height).fill(0),
    collision: Array(width * height).fill(1), "details-high": Array(width * height).fill(0),
  };
  const index = (x, y) => y * width + x;
  const open = (x, y) => {
    if (x < 1 || x >= width - 1 || y < 1 || y >= height) return;
    layers.terrain[index(x, y)] = floor;
    layers.collision[index(x, y)] = 0;
    if ((x * 11 + y * 17) % 41 === 0) layers["details-low"][index(x, y)] = detail;
  };
  const room = (left, top, right, bottom) => {
    for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) open(x, y);
  };
  const path = (points) => {
    for (let p = 1; p < points.length; p++) {
      let [x, y] = points[p - 1];
      const [tx, ty] = points[p];
      while (true) {
        room(x - 1, y - 1, x + 1, y + 1);
        if (x === tx && y === ty) break;
        if (x !== tx) x += Math.sign(tx - x); else y += Math.sign(ty - y);
      }
    }
  };
  const block = (x, y, wide = false) => {
    for (let dx = wide ? -1 : 0; dx <= (wide ? 1 : 0); dx++) layers.collision[index(x + dx, y)] = 1;
  };
  const document = (triggers, interactions, entities = [], scenes = [], encounters = []) => ({
    type: "map", version: "1.10", tiledversion: "1.11.2", orientation: "orthogonal",
    renderorder: "right-down", infinite: false, width, height, tilewidth: TILE, tileheight: TILE,
    properties: [prop("displayName", name)],
    layers: [
      ...Object.entries(layers).map(([key, data], i) => ({ id: i + 1, name: key, type: "tilelayer", width, height, visible: key !== "collision", data })),
      objects(7, "triggers", triggers), objects(8, "interactions", interactions), objects(9, "entities", entities),
      objects(10, "narrative", scenes), objects(11, "scenery", []), objects(12, "encounters", encounters),
    ],
  });
  return { room, path, block, document, layers };
}

function zone(id, name, x, y, width, height, formations) {
  return { ...object(id, name, x, y, { biome: "central-control", formations, minDistance: 210, maxDistance: 315 }, width, height), type: "encounter-zone" };
}

function cache(map, id, name, x, y, equipmentId, credits = 260, requiredFlag = "") {
  map.block(x, y);
  return object(id, name, x, y, {
    interactionKind: "cache", flag: `cache.central.${name}`, equipmentId, credits, tonics: 3, returnBeacons: 1, requiredFlag,
    text: "An intact command locker releases its stored equipment.", emptyText: "This locker is empty, or its command seal is still active.",
  });
}

function consoleObject(map, id, name, x, y, flag, text, restoredText, requiredFlag = "", dialogueId = "") {
  map.block(x, y, true);
  return object(id, name, x, y, {
    interactionKind: "control-console", flag, text, restoredText, requiredFlag, dialogueId,
    emptyText: "The Custodian's seal is active. Defeat the guardian before reading the archive.",
  });
}

function vestibule() {
  const map = plan("Central Control Tower · Vestibule", 24, 18);
  map.room(8, 1, 15, 17);
  map.room(5, 10, 18, 15);
  const guard = (id, name, x) => ({ ...object(id, name, x, 10, {
    spriteId: "glass-smith", dialogueId: "central-tower-guard",
    dialogueMiddleFlag: "array.meridian-core-read", dialogueMiddleId: "central-guard-cleared",
    dialogueAfterFlag: "quest.central-archive-read", dialogueAfterId: "central-guard-after",
    movement: "fixed", direction: "down",
  }), type: "npc" });
  return map.document([
    transition(1, "central-world-return", 12, 17, "glass-steppe", 28, 80, "down"),
    transition(2, "central-gallery-stairs", 11, 1, "central-control-galleries", 20, 31, "up", 3),
  ], [object(3, "central-guard-line", 8, 9, {
    interactionKind: "barrier", requiredFlag: "array.meridian-core-read",
    text: "The tower is sealed. The Meridian Array on Southwake holds the missing authorization signal.",
  }, 8)], [guard(4, "Central Guard A", 9), guard(5, "Central Guard B", 14)]);
}

function galleries() {
  const map = plan("Central Control Tower · Relay Galleries", 40, 34);
  map.room(17, 27, 23, 33); map.room(3, 22, 11, 27); map.room(28, 22, 36, 27);
  map.room(3, 7, 11, 13); map.room(28, 7, 36, 13); map.room(16, 15, 24, 21);
  map.room(17, 1, 23, 4);
  map.path([[20, 31], [20, 24], [7, 24], [7, 10]]);
  map.path([[20, 24], [32, 24], [32, 10]]);
  map.path([[7, 18], [20, 18], [32, 18]]);
  map.path([[20, 18], [20, 3]]);
  const west = consoleObject(map, 10, "western-memory-relay", 7, 9, "relay.central-west-online",
    "Nox reconnects the western memory relay. One of the two upper seals goes dark.", "The western memory relay is online.");
  const east = consoleObject(map, 11, "eastern-memory-relay", 32, 9, "relay.central-east-online",
    "Ione stabilizes the eastern relay. Its carrier now matches the Meridian signal.", "The eastern memory relay is online.");
  return map.document([
    transition(1, "gallery-down", 19, 33, "central-control-entry", 12, 3, "down", 3),
    transition(2, "gallery-up", 19, 1, "central-control-archives", 17, 25, "up", 3),
  ], [west, east,
    object(12, "memory-relay-seal", 18, 5, { interactionKind: "barrier", requiredFlag: "relay.central-gate-open", text: "Two carrier locks remain. Activate the consoles in the western and eastern galleries." }, 5),
    cache(map, 13, "cipher-carbine", 4, 25, "cipher-carbine"),
    cache(map, 14, "prism-lash", 35, 25, "prism-lash"),
    cache(map, 15, "gallery-supplies", 21, 29, "", 180),
  ], [], [narrative(20, "central-gallery-entry", 17, 27, 7, 6, "central-gallery-entry")], [
    zone(30, "Lower carrier galleries", 2, 14, 36, 19, "aegis-guard:3,control-legion:3,cipher-patrol:4"),
    zone(31, "Upper signal galleries", 2, 1, 36, 13, "aegis-command:3,cipher-patrol:4,cipher-wing:2"),
  ]);
}

function archives() {
  const map = plan("Central Control Tower · Memory Archives", 34, 28);
  map.room(13, 21, 21, 27); map.room(2, 15, 9, 21); map.room(24, 15, 31, 21);
  map.room(3, 3, 10, 9); map.room(23, 3, 30, 9); map.room(13, 10, 21, 16); map.room(13, 1, 21, 5);
  map.path([[17, 25], [17, 18], [6, 18], [6, 6], [17, 6], [17, 3]]);
  map.path([[17, 18], [27, 18], [27, 6], [17, 6]]);
  map.path([[17, 18], [17, 12], [6, 12]]);
  map.path([[17, 12], [27, 12]]);
  return map.document([
    transition(1, "archive-down", 16, 27, "central-control-galleries", 20, 3, "down", 3),
    transition(2, "archive-up", 16, 1, "central-control-core", 13, 19, "up", 3),
  ], [
    cache(map, 10, "dawn-saber", 4, 5, "dawn-saber", 320),
    cache(map, 11, "horizon-disc", 29, 5, "horizon-disc", 320),
    consoleObject(map, 12, "evacuation-record", 17, 12, "archive.evacuation-log-read",
      "An evacuation order predates the sabotage by centuries. It lists living settlements as protected archives, not military targets.",
      "The evacuation record names the settlements as protected archives."),
  ], [], [narrative(20, "central-archive-entry", 13, 21, 9, 6, "central-archive-entry")], [
    zone(30, "Archive security ring", 1, 1, 32, 26, "cipher-wing:3,aegis-command:3,cipher-patrol:4"),
  ]);
}

function core() {
  const map = plan("Central Control Tower · Sealed Core", 26, 22);
  map.room(9, 16, 17, 21); map.room(6, 2, 20, 7); map.room(8, 8, 18, 15);
  map.path([[13, 19], [13, 4]]);
  const boss = { ...object(10, "Archive Custodian", 13, 10, {
    spriteId: "archive-custodian", dialogueId: "archive-custodian-challenge", battleFormation: "archive-custodian",
    defeatFlag: "tower.archive-custodian-defeated", hiddenFlag: "tower.archive-custodian-defeated",
    victoryDialogueId: "archive-custodian-defeated", movement: "fixed", direction: "down",
  }), type: "npc" };
  return map.document([
    transition(1, "core-down", 12, 21, "central-control-archives", 17, 3, "down", 3),
  ], [
    object(11, "custodian-core-seal", 6, 7, { interactionKind: "barrier", requiredFlag: "tower.archive-custodian-defeated", text: "The Custodian is shielding the archive core. Confront it from the lower chamber." }, 15),
    consoleObject(map, 12, "central-archive-core", 13, 5, "quest.central-archive-read",
      "The archive core accepts the Meridian key.", "The copied route is safe. Speak to Rhea in Vesper Crossing about the dormant launch cradle.",
      "tower.archive-custodian-defeated", "central-archive-revelation"),
    cache(map, 13, "aurora-mantle", 8, 5, "aurora-mantle", 500, "tower.archive-custodian-defeated"),
  ], [boss], [narrative(20, "central-core-entry", 9, 16, 9, 5, "central-core-entry")]);
}

async function updateExistingMaps() {
  const meridian = JSON.parse(await readFile(new URL("meridian-array.json", directory), "utf8"));
  const terminal = meridian.layers.find((layer) => layer.name === "interactions").objects.find((entry) => entry.name === "meridian-core-console");
  for (const [name, value] of Object.entries({
    dialogueId: "meridian-key-recovered",
    restoredText: "The Meridian key is copied. Return to the central control tower near Vesper Crossing.",
  })) {
    terminal.properties = terminal.properties.filter((entry) => entry.name !== name);
    terminal.properties.push(prop(name, value));
  }
  await writeFile(new URL("meridian-array.json", directory), `${JSON.stringify(meridian, null, 2)}\n`);

  for (const [id, name, properties] of [
    ["cairn-meridian", "Provost Hale", { dialogueAfterFlag: "array.meridian-core-read", dialogueAfterId: "cairn-provost-key" }],
    ["cairn-meridian", "Signal Reader Yori", { dialogueAfterFlag: "array.meridian-core-read", dialogueAfterId: "cairn-reader-key" }],
  ]) {
    const file = new URL(`${id}.json`, directory);
    const document = JSON.parse(await readFile(file, "utf8"));
    const entity = document.layers.find((layer) => layer.name === "entities").objects.find((entry) => entry.name === name);
    if (!entity) throw new Error(`${id} is missing ${name}`);
    for (const [key, value] of Object.entries(properties)) {
      entity.properties = entity.properties.filter((entry) => entry.name !== key);
      entity.properties.push(prop(key, value));
    }
    await writeFile(file, `${JSON.stringify(document, null, 2)}\n`);
  }
}

export async function generateCentralChapter() {
  for (const [id, document] of [
    ["central-control-entry", vestibule()], ["central-control-galleries", galleries()],
    ["central-control-archives", archives()], ["central-control-core", core()],
  ]) {
    await writeFile(new URL(`${id}.json`, directory), `${JSON.stringify(document, null, 2)}\n`);
    console.log(`Wrote ${id}.json (${document.width} × ${document.height})`);
  }
  await updateExistingMaps();
  await (await import("./generate-launch-chapter.mjs")).generateLaunchChapter();
}

export { plan, object, transition, narrative, prop };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await generateCentralChapter();
