import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { DIALOGUES } from "../src/dialogue/dialogues.ts";

const mapDirectory = new URL("../public/assets/maps/", import.meta.url);

test("every playable map is registered with the runtime loader", async () => {
  const source = await readFile(new URL("../src/world/MapLoader.ts", import.meta.url), "utf8");
  const registry = source.match(/const MAP_FILES[^=]*=\s*\{([\s\S]*?)\};/)?.[1];
  assert.ok(registry, "the runtime map registry must exist");
  const files = new Map([...registry.matchAll(/"([a-z0-9-]+)":\s*"([^"]+)"/g)].map((match) => [match[1], match[2]]));
  for (const file of (await readdir(mapDirectory)).filter((name) => name.endsWith(".json"))) {
    assert.equal(files.get(file.slice(0, -5)), file, `${file} cannot be loaded by the game`);
  }
});

test("all maps use the engine layer contract", async () => {
  const files = (await readdir(mapDirectory)).filter((file) => file.endsWith(".json"));
  assert.ok(files.length >= 2, "the milestone should include at least two maps");

  for (const file of files) {
    const source = await readFile(new URL(file, mapDirectory), "utf8");
    const map = JSON.parse(source);
    assert.equal(map.type, "map");
    assert.equal(map.orientation, "orthogonal");
    assert.equal(map.tilewidth, 16);
    assert.equal(map.tileheight, 16);

    const names = new Set(map.layers.map((layer) => layer.name));
    for (const required of ["ground", "terrain", "objects", "collision", "triggers", "interactions", "entities", "narrative", "scenery", "encounters"]) {
      assert.ok(names.has(required), `${file} is missing layer ${required}`);
    }

    for (const layer of map.layers.filter((candidate) => candidate.type === "tilelayer")) {
      assert.equal(layer.data.length, map.width * map.height, `${file}:${layer.name} has invalid dimensions`);
    }
  }
});

test("encounter zones stay inside their maps and reference known formations", async () => {
  const battleSource = await readFile(new URL("../src/battle/battleData.ts", import.meta.url), "utf8");
  const formationIds = new Set(
    [...battleSource.matchAll(/^  "([a-z-]+)": \{/gm)].map((match) => match[1]),
  );
  const files = (await readdir(mapDirectory)).filter((file) => file.endsWith(".json"));
  let dangerousZoneCount = 0;

  for (const file of files) {
    const map = JSON.parse(await readFile(new URL(file, mapDirectory), "utf8"));
    const encounterLayer = map.layers.find((layer) => layer.name === "encounters");
    for (const zone of encounterLayer.objects) {
      dangerousZoneCount += 1;
      assert.ok(zone.x >= 0 && zone.y >= 0, `${file}:${zone.name} starts outside the map`);
      assert.ok(zone.x + zone.width <= map.width * map.tilewidth, `${file}:${zone.name} exceeds map width`);
      assert.ok(zone.y + zone.height <= map.height * map.tileheight, `${file}:${zone.name} exceeds map height`);
      const properties = new Map(zone.properties.map((property) => [property.name, property.value]));
      assert.equal(typeof properties.get("biome"), "string", `${file}:${zone.name} has no biome`);
      assert.ok(properties.get("minDistance") > 0, `${file}:${zone.name} has invalid minimum distance`);
      assert.ok(properties.get("maxDistance") >= properties.get("minDistance"), `${file}:${zone.name} has invalid distance range`);
      const entries = String(properties.get("formations")).split(",");
      assert.ok(entries.length >= 2, `${file}:${zone.name} should offer formation variety`);
      for (const entry of entries) {
        const [formationId, weight] = entry.split(":");
        assert.ok(formationIds.has(formationId), `${file}:${zone.name} references missing formation ${formationId}`);
        assert.ok(Number(weight) > 0, `${file}:${zone.name} has invalid weight for ${formationId}`);
      }
    }
  }
  assert.ok(dangerousZoneCount >= 3, "the biome milestone should include several encounter zones");
});

test("long routes use fewer encounters while keeping the southern frontier dangerous", async () => {
  const vault = JSON.parse(await readFile(new URL("echo-vault.json", mapDirectory), "utf8"));
  const vaultZones = vault.layers.find((layer) => layer.name === "encounters").objects;
  for (const zone of vaultZones) {
    const properties = new Map(zone.properties.map((property) => [property.name, property.value]));
    assert.ok(properties.get("minDistance") >= 140, `${zone.name} triggers encounters too frequently`);
    assert.ok(properties.get("maxDistance") >= 215, `${zone.name} has too little cadence variation`);
  }

  const world = JSON.parse(await readFile(new URL("glass-steppe.json", mapDirectory), "utf8"));
  const southernZones = world.layers.find((layer) => layer.name === "encounters").objects.filter(
    (zone) => zone.name.includes("Southern") || zone.name.includes("southern"),
  );
  assert.equal(southernZones.length, 2);
  for (const zone of southernZones) {
    const properties = new Map(zone.properties.map((property) => [property.name, property.value]));
    assert.ok(properties.get("minDistance") >= 160, `${zone.name} triggers encounters too frequently`);
    assert.match(String(properties.get("formations")), /rift-pack|storm-patrol|southern-onslaught/);
  }
});

test("persistent caches have unique flags, rewards and blocked footprints", async () => {
  const files = (await readdir(mapDirectory)).filter((file) => file.endsWith(".json"));
  const equipmentSource = await readFile(new URL("../src/progression/equipmentData.ts", import.meta.url), "utf8");
  const equipmentIds = new Set([...equipmentSource.matchAll(/^  "([a-z-]+)": \{/gm)].map((match) => match[1]));
  const flags = new Set();
  let cacheCount = 0;
  let equipmentCacheCount = 0;
  let returnBeaconCacheCount = 0;
  for (const file of files) {
    const map = JSON.parse(await readFile(new URL(file, mapDirectory), "utf8"));
    const collision = map.layers.find((layer) => layer.name === "collision");
    const interactions = map.layers.find((layer) => layer.name === "interactions");
    for (const object of interactions.objects) {
      const properties = new Map((object.properties ?? []).map((property) => [property.name, property.value]));
      if (properties.get("interactionKind") !== "cache") continue;
      cacheCount += 1;
      const flag = properties.get("flag");
      assert.equal(typeof flag, "string", `${file}:${object.name} has no persistent flag`);
      assert.ok(!flags.has(flag), `cache flag ${flag} is reused`);
      flags.add(flag);
      const equipmentId = properties.get("equipmentId");
      const returnBeacons = Number(properties.get("returnBeacons"));
      assert.ok(Number(properties.get("credits")) > 0 || Number(properties.get("tonics")) > 0 || returnBeacons > 0 || equipmentId, `${file}:${object.name} has no reward`);
      if (returnBeacons > 0) returnBeaconCacheCount += 1;
      if (equipmentId) {
        equipmentCacheCount += 1;
        assert.ok(equipmentIds.has(equipmentId), `${file}:${object.name} contains unknown equipment ${equipmentId}`);
      }
      const tileX = Math.floor(object.x / map.tilewidth);
      const tileY = Math.floor(object.y / map.tileheight);
      assert.notEqual(collision.data[tileY * map.width + tileX], 0, `${file}:${object.name} has no collision footprint`);
    }
  }
  assert.ok(cacheCount >= 1, "the labyrinth milestone should contain a persistent cache");
  assert.ok(equipmentCacheCount >= 4, "Echo Vault should reward several optional equipment detours");
  assert.ok(returnBeaconCacheCount >= 1, "a labyrinth cache should contain a Return Beacon");
});

test("the world is a scrolling grassy island bordered by water", async () => {
  const files = (await readdir(mapDirectory)).filter((file) => file.endsWith(".json"));
  const maps = await Promise.all(files.map(async (file) => JSON.parse(
    await readFile(new URL(file, mapDirectory), "utf8"),
  )));
  const scrollingMaps = maps.filter((map) => map.width * map.tilewidth > 320 || map.height * map.tileheight > 240);
  assert.ok(scrollingMaps.length >= 1, "the camera milestone needs at least one map larger than 320 × 240");
  assert.ok(scrollingMaps.some((map) => map.properties.some(
    (property) => property.name === "displayName" && property.value === "Verdant Expanse",
  )), "the Verdant Expanse should validate large-map exploration");
  const world = scrollingMaps.find((map) => map.properties.some(
    (property) => property.name === "displayName" && property.value === "Verdant Expanse",
  ));
  const terrain = world.layers.find((layer) => layer.name === "terrain");
  const collision = world.layers.find((layer) => layer.name === "collision");
  assert.equal(terrain.data[0], 0, "the northwest corner should be open water");
  assert.notEqual(terrain.data[15 * world.width + 20], 0, "the island centre should have land terrain");
  assert.notEqual(collision.data[0], 0, "water should not be traversable");
  assert.equal(collision.data[15 * world.width + 20], 0, "the grassy island centre should be traversable");

  const coastBounds = [];
  for (let y = 0; y < world.height; y += 1) {
    const land = terrain.data.flatMap((value, index) => (
      Math.floor(index / world.width) === y && value !== 0 ? [index % world.width] : []
    ));
    if (land.length > 0) coastBounds.push([Math.min(...land), Math.max(...land)]);
  }
  assert.ok(new Set(coastBounds.map(([left]) => left)).size >= 5, "the western shore is too straight");
  assert.ok(new Set(coastBounds.map(([, right]) => right)).size >= 5, "the eastern shore is too straight");
  let directionChanges = 0;
  for (let index = 2; index < coastBounds.length; index += 1) {
    const previousStep = coastBounds[index - 1][0] - coastBounds[index - 2][0];
    const currentStep = coastBounds[index][0] - coastBounds[index - 1][0];
    if (Math.sign(previousStep) !== Math.sign(currentStep)) directionChanges += 1;
  }
  assert.ok(directionChanges >= 8, "the island needs visible coves and promontories");
});

test("the enlarged world uses mountain relief, looping roads and three southern frontiers", async () => {
  const world = JSON.parse(await readFile(new URL("glass-steppe.json", mapDirectory), "utf8"));
  const terrain = world.layers.find((layer) => layer.name === "terrain");
  const collision = world.layers.find((layer) => layer.name === "collision");
  assert.ok(world.width >= 56 && world.height >= 84);
  const mountainTiles = terrain.data.filter((value) => value === 18 || value === 19).length;
  const roadTiles = terrain.data.filter((value) => value === 2).length;
  const plateauTiles = terrain.data.filter((value) => value === 21).length;
  assert.ok(mountainTiles >= 150, "the world needs substantial mountain relief");
  assert.ok(roadTiles >= 250, "the visible road network is too sparse");
  assert.ok(plateauTiles >= 27, "the southern reserve needs three prepared plateaus");
  terrain.data.forEach((value, index) => {
    if (value === 18 || value === 19) assert.notEqual(collision.data[index], 0, "a mountain tile is traversable");
  });

  const network = new Set(terrain.data.flatMap((value, index) => (
    value === 2 || value === 21
      ? [`${index % world.width},${Math.floor(index / world.width)}`]
      : []
  )));
  const queue = ["6,7"];
  const visited = new Set(queue);
  let directedEdges = 0;
  while (queue.length > 0) {
    const [x, y] = queue.shift().split(",").map(Number);
    for (const [nextX, nextY] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      const key = `${nextX},${nextY}`;
      if (!network.has(key)) continue;
      directedEdges += 1;
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push(key);
    }
  }
  assert.equal(visited.size, network.size, "the road and plateau network contains an isolated branch");
  assert.ok(directedEdges / 2 - visited.size + 1 >= 12, "the roads should offer several genuine loops");
  for (const destination of ["32,8", "39,32", "22,40", "22,64", "10,78", "28,79", "46,78"]) {
    assert.ok(visited.has(destination), `road destination ${destination} is disconnected`);
  }
  const southernWalkable = collision.data.filter((value, index) => Math.floor(index / world.width) > 40 && value === 0).length;
  assert.ok(southernWalkable >= 1100, "the southern territory has not been expanded enough");

  const routeDistance = (start, destination) => {
    const routeQueue = [[...start, 0]];
    const routeVisited = new Set([start.join(",")]);
    for (let cursor = 0; cursor < routeQueue.length; cursor += 1) {
      const [x, y, distance] = routeQueue[cursor];
      if (x === destination[0] && y === destination[1]) return distance;
      for (const [nextX, nextY] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        const key = `${nextX},${nextY}`;
        if (nextX < 0 || nextY < 0 || nextX >= world.width || nextY >= world.height) continue;
        if (routeVisited.has(key) || collision.data[nextY * world.width + nextX] !== 0) continue;
        routeVisited.add(key);
        routeQueue.push([nextX, nextY, distance + 1]);
      }
    }
    return Infinity;
  };
  assert.ok(routeDistance([6, 7], [39, 32]) >= 55, "Lumen Hollow and Aster Reach are still too close");
  assert.ok(routeDistance([22, 40], [22, 64]) >= 40, "the bridge and Vesper Crossing are still too close");
  assert.ok(routeDistance([39, 32], [22, 64]) >= 65, "Aster Reach and Vesper Crossing need a substantial journey");
  const controlTowers = world.layers.find((layer) => layer.name === "scenery").objects.filter(
    (object) => object.name.endsWith("Control Tower"),
  );
  assert.equal(controlTowers.length, 3);
  const towerDestinations = world.layers.find((layer) => layer.name === "triggers").objects
    .filter((trigger) => trigger.name.includes("control-tower"))
    .map((trigger) => trigger.properties.find((property) => property.name === "targetMap")?.value);
  assert.deepEqual(towerDestinations.sort(), ["central-control-entry", "east-control-1f", "west-control-1f"]);
  const towerEntrances = world.layers.find((layer) => layer.name === "triggers").objects
    .filter((trigger) => trigger.name.includes("control-tower"));
  for (const entrance of towerEntrances) {
    const towerName = entrance.name.startsWith("west-")
      ? "West Control Tower"
      : entrance.name.startsWith("central-")
        ? "Central Control Tower"
        : "East Control Tower";
    const tower = controlTowers.find((object) => object.name === towerName);
    const towerProperties = new Map(tower.properties.map((property) => [property.name, property.value]));
    assert.equal(entrance.width, 24, `${towerName} needs a forgiving doorway trigger`);
    assert.equal(entrance.x + entrance.width / 2, tower.x + towerProperties.get("anchorX"), `${towerName} doorway is off-centre`);
  }
});

test("the control towers shrink floor by floor and implement the planned progression", async () => {
  const readMap = async (id) => JSON.parse(await readFile(new URL(`${id}.json`, mapDirectory), "utf8"));
  const west = await Promise.all(["west-control-1f", "west-control-2f", "west-control-3f", "west-control-summit"].map(readMap));
  const east = await Promise.all(["east-control-1f", "east-control-2f", "east-control-3f", "east-control-summit"].map(readMap));
  assert.deepEqual(west.map((map) => [map.width, map.height]), [[42, 34], [36, 29], [30, 24], [24, 18]]);
  assert.deepEqual(east.map((map) => [map.width, map.height]), [[42, 34], [36, 29], [30, 24], [24, 18]]);

  const properties = (object) => new Map((object.properties ?? []).map((property) => [property.name, property.value]));
  const westConsole = west.at(-1).layers.find((layer) => layer.name === "interactions").objects
    .find((object) => properties(object).get("interactionKind") === "control-console");
  assert.equal(properties(westConsole).get("requiredFlag"), "party.nox-recruited");
  assert.equal(properties(westConsole).get("flag"), "tower.west-restored");

  const eastGate = east[0].layers.find((layer) => layer.name === "interactions").objects
    .find((object) => object.name === "eastern-link-lock");
  assert.equal(eastGate, undefined, "the eastern tower must never trap parties that enter before restoring the west tower");
  const eastEncounterTables = east.slice(0, 3).map((map) => map.layers.find((layer) => layer.name === "encounters").objects[0]
    .properties.find((property) => property.name === "formations").value);
  assert.match(eastEncounterTables[0], /relay-assault/);
  assert.match(eastEncounterTables[1], /control-legion/);
  assert.match(eastEncounterTables[2], /control-legion/);
  const saboteur = east.at(-1).layers.find((layer) => layer.name === "entities").objects
    .find((object) => object.name === "Signal Saboteur");
  assert.equal(properties(saboteur).get("battleFormation"), "signal-saboteur");
  assert.equal(properties(saboteur).get("defeatFlag"), "tower.signal-wraith-defeated");
  const eastConsole = east.at(-1).layers.find((layer) => layer.name === "interactions").objects
    .find((object) => properties(object).get("interactionKind") === "control-console");
  assert.equal(properties(eastConsole).get("requiredFlag"), "tower.signal-wraith-defeated");
  assert.equal(properties(eastConsole).get("flag"), "tower.east-restored");

  const towerEquipment = [...west, ...east].flatMap((map) => map.layers.find((layer) => layer.name === "interactions").objects)
    .map(properties)
    .map((entry) => entry.get("equipmentId"))
    .filter(Boolean);
  assert.deepEqual(towerEquipment.sort(), ["oracle-loop", "relay-carbine", "scout-coil", "storm-carbine", "sun-edge", "tower-aegis"]);
});

test("the central tower is a guarded encounter-free vestibule", async () => {
  const map = JSON.parse(await readFile(new URL("central-control-entry.json", mapDirectory), "utf8"));
  assert.equal(map.layers.find((layer) => layer.name === "encounters").objects.length, 0);
  const guards = map.layers.find((layer) => layer.name === "entities").objects;
  assert.equal(guards.length, 2);
  const barrier = map.layers.find((layer) => layer.name === "interactions").objects[0];
  const properties = new Map(barrier.properties.map((property) => [property.name, property.value]));
  assert.equal(properties.get("interactionKind"), "barrier");
  assert.equal(properties.get("requiredFlag"), "array.meridian-core-read", "the Meridian key must unlock the guarded tower");
});

test("the guided ferry reaches the expanded southern island and Tideglass Harbor", async () => {
  const world = JSON.parse(await readFile(new URL("glass-steppe.json", mapDirectory), "utf8"));
  const ferry = world.layers.find((layer) => layer.name === "entities").objects.find((object) => object.name === "Southern Ferry");
  const ferryProperties = new Map(ferry.properties.map((property) => [property.name, property.value]));
  assert.equal(ferryProperties.get("requiredFlag"), "quest.control-towers-restored");
  assert.equal(ferryProperties.get("travelMap"), "southern-landing");

  const landing = JSON.parse(await readFile(new URL("southern-landing.json", mapDirectory), "utf8"));
  const settlement = landing.layers.find((layer) => layer.name === "scenery").objects.find((object) => object.name === "Tideglass Harbor");
  assert.ok(settlement, "Tideglass Harbor should be visible from the island roads");
  assert.equal(settlement.properties.find((property) => property.name === "spriteId").value, "world-tideglass");
  assert.ok(landing.layers.find((layer) => layer.name === "encounters").objects.length >= 2);
  assert.ok(landing.layers.find((layer) => layer.name === "entities").objects.some((object) => object.name === "Northern Ferry"));
});

test("Tideglass foreshadows Sera Venn before she waits at Undertide Passage", async () => {
  const landing = JSON.parse(await readFile(new URL("southern-landing.json", mapDirectory), "utf8"));
  const town = JSON.parse(await readFile(new URL("tideglass-harbor.json", mapDirectory), "utf8"));
  const dialogues = await readFile(new URL("../src/dialogue/dialogues.ts", import.meta.url), "utf8");
  const moonfall = landing.layers.find((layer) => layer.name === "scenery").objects.find((object) => object.name === "Undertide Passage");
  const reservedRecruit = landing.layers.find((layer) => layer.name === "entities").objects.find((object) => object.name === "Captain Sera Venn");
  const citizens = town.layers.find((layer) => layer.name === "entities").objects;
  assert.ok(moonfall, "the next labyrinth must already be visible on Southwake Isle");
  assert.ok(reservedRecruit, "Sera must wait for a deliberate conversation at the cave entrance");
  assert.equal(reservedRecruit.properties.find((property) => property.name === "recruitMemberId").value, "sera");
  assert.equal(citizens.some((entity) => entity.name.includes("Sera")), false, "Sera has already left Tideglass to investigate");
  assert.match(dialogues, /Captain Sera Venn keeps every tidal beacon/);
  assert.match(dialogues, /she left to inspect its entrance herself/);
});

test("Tideglass is a complete fourth town with higher service prices", async () => {
  const town = JSON.parse(await readFile(new URL("tideglass-harbor.json", mapDirectory), "utf8"));
  const interactions = town.layers.find((layer) => layer.name === "interactions").objects;
  const byKind = new Map(interactions.map((object) => [object.properties.find((property) => property.name === "interactionKind")?.value, object]));
  const price = (kind) => byKind.get(kind).properties.find((property) => property.name === "price").value;
  assert.equal(town.layers.find((layer) => layer.name === "encounters").objects.length, 0);
  assert.deepEqual([...byKind.keys()].sort(), ["armor-shop", "inn", "item-shop", "revival-shop", "save-shop", "teleport", "weapon-shop"].sort());
  assert.equal(price("save-shop"), 0);
  assert.equal(price("item-shop"), 32);
  assert.equal(price("inn"), 68);
  assert.equal(price("teleport"), 120);
  assert.equal(town.layers.find((layer) => layer.name === "triggers").objects.length, 4);
});

test("every tower transition lands on a walkable tile", async () => {
  const files = (await readdir(mapDirectory)).filter((file) => file.includes("control-") && file.endsWith(".json"));
  const maps = new Map(await Promise.all(files.map(async (file) => {
    const map = JSON.parse(await readFile(new URL(file, mapDirectory), "utf8"));
    return [file.replace(/\.json$/, ""), map];
  })));
  maps.set("glass-steppe", JSON.parse(await readFile(new URL("glass-steppe.json", mapDirectory), "utf8")));
  for (const [id, map] of maps) {
    if (!id.includes("control-")) continue;
    for (const trigger of map.layers.find((layer) => layer.name === "triggers").objects) {
      const properties = new Map(trigger.properties.map((property) => [property.name, property.value]));
      const target = maps.get(properties.get("targetMap"));
      assert.ok(target, `${id}:${trigger.name} has no loaded destination`);
      const collision = target.layers.find((layer) => layer.name === "collision").data;
      const x = Number(properties.get("targetX"));
      const y = Number(properties.get("targetY"));
      assert.equal(collision[y * target.width + x], 0, `${id}:${trigger.name} lands on blocked tile ${x},${y}`);
    }
  }
});

test("the retired Relay Garden route is no longer reachable from the world", async () => {
  const world = JSON.parse(await readFile(new URL("glass-steppe.json", mapDirectory), "utf8"));
  const transitions = world.layers.find((layer) => layer.name === "triggers").objects;
  assert.ok(!transitions.some((transition) => transition.properties?.some(
    (property) => property.name === "targetMap" && ["relay-garden", "archive-hall"].includes(property.value),
  )));
});

test("the Echo Vault labyrinth is fully connected from entrance to cache and exit", async () => {
  const map = JSON.parse(await readFile(new URL("echo-vault.json", mapDirectory), "utf8"));
  const collision = map.layers.find((layer) => layer.name === "collision");
  assert.ok(map.width >= 40 && map.height >= 32, "Echo Vault should be substantially larger than its first draft");
  const start = [21, 32];
  const queue = [start];
  const visited = new Set([start.join(",")]);
  while (queue.length > 0) {
    const [x, y] = queue.shift();
    for (const [nextX, nextY] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (nextX < 0 || nextY < 0 || nextX >= map.width || nextY >= map.height) continue;
      if (collision.data[nextY * map.width + nextX] !== 0) continue;
      const key = `${nextX},${nextY}`;
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push([nextX, nextY]);
    }
  }
  const walkableTiles = collision.data.filter((value) => value === 0).length;
  assert.equal(visited.size, walkableTiles, "Echo Vault contains an unreachable traversable area");
  assert.ok(visited.has("21,33"), "the exit is unreachable from the entrance");
  const caches = map.layers.find((layer) => layer.name === "interactions").objects.filter((object) => object.type === "cache");
  assert.ok(caches.length >= 5, "Echo Vault should contain several branch rewards");
  for (const cache of caches) {
    const cacheX = Math.floor(cache.x / map.tilewidth);
    const cacheY = Math.floor(cache.y / map.tileheight);
    assert.ok([[cacheX - 1, cacheY], [cacheX + 1, cacheY], [cacheX, cacheY - 1], [cacheX, cacheY + 1]]
      .some(([x, y]) => visited.has(`${x},${y}`)), `${cache.name} cannot be approached`);
  }
  const zones = map.layers.find((layer) => layer.name === "encounters").objects;
  assert.ok(zones.length >= 5);
  assert.ok(zones.some((zone) => zone.properties.some(
    (property) => property.name === "formations" && String(property.value).includes("core-wardens"),
  )), "the deepest cache should be protected by core wardens");
});

test("tall scenery keeps rendering, depth anchors and collision footprints independent", async () => {
  const files = (await readdir(mapDirectory)).filter((file) => file.endsWith(".json"));
  const supportedSprites = new Set([
    "signal-tree",
    "lumen-study-tree",
    "lumen-hd-memory",
    "lumen-hd-transit",
    "lumen-hd-inn",
    "lumen-hd-item",
    "lumen-hd-clinic",
    "lumen-hd-armor",
    "relay-pylon",
    "echo-vault-pylon",
    "garden-pavilion",
    "hollow-inn",
    "lumen-study-home",
    "signal-market",
    "lumen-study-shop",
    "lumen-spire",
    "aster-hd-memory",
    "aster-hd-transit",
    "aster-hd-inn",
    "aster-hd-weapon",
    "aster-hd-item",
    "aster-hd-clinic",
    "aster-hd-armor",
    "vesper-hd-memory",
    "vesper-hd-transit",
    "vesper-hd-inn",
    "vesper-hd-weapon",
    "vesper-hd-item",
    "vesper-hd-clinic",
    "vesper-hd-armor",
    "tideglass-hd-memory",
    "tideglass-hd-transit",
    "tideglass-hd-inn",
    "tideglass-hd-weapon",
    "tideglass-hd-item",
    "tideglass-hd-clinic",
    "tideglass-hd-armor",
    "tideglass-hd-harbor",
    "world-village",
    "world-vault",
    "world-tideglass",
    "world-moonfall-array",
    "world-control-tower-west",
    "world-control-tower-central",
    "world-control-tower-east",
  ]);
  let tallObjectCount = 0;

  for (const file of files) {
    const map = JSON.parse(await readFile(new URL(file, mapDirectory), "utf8"));
    const collision = map.layers.find((layer) => layer.name === "collision");
    const scenery = map.layers.find((layer) => layer.name === "scenery");

    for (const object of scenery.objects) {
      const properties = new Map(object.properties.map((property) => [property.name, property.value]));
      const spriteId = properties.get("spriteId");
      const anchorX = properties.get("anchorX");
      const anchorY = properties.get("anchorY");
      const footprintX = properties.get("footprintX");
      const footprintY = properties.get("footprintY");
      const footprintWidth = properties.get("footprintWidth");
      const footprintHeight = properties.get("footprintHeight");

      assert.ok(supportedSprites.has(spriteId), `${file}:${object.name} has unsupported sprite ${spriteId}`);
      assert.ok(object.width > 0 && object.height > 0, `${file}:${object.name} has no visual bounds`);
      assert.ok(anchorX >= 0 && anchorX <= object.width, `${file}:${object.name} has an invalid X anchor`);
      assert.ok(anchorY >= 0 && anchorY <= object.height, `${file}:${object.name} has an invalid Y anchor`);
      assert.ok(footprintWidth > 0 && footprintHeight > 0, `${file}:${object.name} has no collision footprint`);
      assert.ok(footprintX >= 0 && footprintX + footprintWidth <= object.width, `${file}:${object.name} footprint exceeds its visual width`);
      assert.ok(footprintY >= 0 && footprintY + footprintHeight <= object.height, `${file}:${object.name} footprint exceeds its visual height`);
      if (object.width > map.tilewidth || object.height > map.tileheight) tallObjectCount += 1;

      const top = Math.floor((object.y + footprintY) / map.tileheight);

      const visualLeft = Math.floor(object.x / map.tilewidth);
      const visualRight = Math.ceil((object.x + object.width) / map.tilewidth);
      const visualTop = Math.floor(object.y / map.tileheight);
      const walkableBehind = [];
      for (let tileY = visualTop; tileY < top; tileY += 1) {
        for (let tileX = visualLeft; tileX < visualRight; tileX += 1) {
          if (collision.data[tileY * map.width + tileX] === 0) walkableBehind.push([tileX, tileY]);
        }
      }
      assert.ok(walkableBehind.length > 0, `${file}:${object.name} leaves no walkable space behind its upper body`);
    }
  }

  assert.ok(tallObjectCount >= 3, "the scenery milestone should demonstrate several multi-tile objects");
});

test("all map transitions resolve to existing maps", async () => {
  const files = (await readdir(mapDirectory)).filter((file) => file.endsWith(".json"));
  const maps = new Map();
  for (const file of files) {
    const map = JSON.parse(await readFile(new URL(file, mapDirectory), "utf8"));
    maps.set(path.basename(file, ".json"), map);
  }

  for (const [id, map] of maps) {
    const triggerLayer = map.layers.find((layer) => layer.name === "triggers");
    const collisionLayer = map.layers.find((layer) => layer.name === "collision");
    for (const object of triggerLayer.objects) {
      const target = object.properties.find((property) => property.name === "targetMap")?.value;
      assert.ok(maps.has(target), `${id} points to missing map ${target}`);

      const triggerX = Math.floor(object.x / map.tilewidth);
      const triggerY = Math.floor(object.y / map.tileheight);
      assert.equal(
        collisionLayer.data[triggerY * map.width + triggerX],
        0,
        `${id}:${object.name} overlaps a collision tile`,
      );

      const targetMap = maps.get(target);
      const targetX = object.properties.find((property) => property.name === "targetX")?.value;
      const targetY = object.properties.find((property) => property.name === "targetY")?.value;
      const targetCollision = targetMap.layers.find((layer) => layer.name === "collision");
      assert.equal(
        targetCollision.data[targetY * targetMap.width + targetX],
        0,
        `${id}:${object.name} targets a blocked tile`,
      );
    }
  }
});

test("Lumen Hollow is a safe village with distinct counters and mixed inhabitants", async () => {
  const map = JSON.parse(await readFile(new URL("lumen-hollow.json", mapDirectory), "utf8"));
  const encounters = map.layers.find((layer) => layer.name === "encounters");
  const interactions = map.layers.find((layer) => layer.name === "interactions");
  const entities = map.layers.find((layer) => layer.name === "entities");
  const scenery = map.layers.find((layer) => layer.name === "scenery");
  assert.equal(encounters.objects.length, 0);
  assert.ok(entities.objects.length >= 3);
  assert.ok(scenery.objects.some((object) => object.properties.some(
    (property) => property.name === "spriteId" && property.value === "lumen-hd-inn",
  )));
  const services = interactions.objects.filter((object) => object.type === "service");
  assert.deepEqual(services.map((service) => service.properties.find(
    (property) => property.name === "interactionKind",
  ).value).sort(), [
    "armor-shop",
    "inn",
    "item-shop",
    "party-house",
    "revival-shop",
    "save-shop",
    "teleport",
    "weapon-shop",
  ]);
  const saveCounter = services.find((service) => service.properties.some(
    (property) => property.name === "interactionKind" && property.value === "save-shop",
  ));
  const transit = services.find((service) => service.properties.some(
    (property) => property.name === "interactionKind" && property.value === "teleport",
  ));
  assert.equal(saveCounter.properties.find((property) => property.name === "price").value, 0);
  assert.equal(transit.properties.find((property) => property.name === "price").value, 25);
  assert.equal(transit.properties.find((property) => property.name === "destinationMap").value, "aster-reach,vesper-crossing");
  assert.equal(transit.properties.find((property) => property.name === "destinationName").value, "ASTER REACH|VESPER CROSSING");
  assert.equal(transit.properties.find((property) => property.name === "requiredFlag").value, "village.aster-reach.visited|village.vesper-crossing.visited");
  const movements = entities.objects.map((entity) => entity.properties.find(
    (property) => property.name === "movement",
  )?.value);
  assert.ok(movements.includes("fixed"));
  assert.ok(movements.includes("patrol"));
  const botanist = entities.objects.find((entity) => entity.name === "Botanist Vale");
  const botanistProperties = new Map(botanist.properties.map((property) => [property.name, property.value]));
  assert.equal(botanistProperties.get("movement"), "patrol");
  assert.equal(botanistProperties.get("patrolAxis"), "vertical");
  assert.equal(botanistProperties.get("direction"), "down");
  assert.ok(botanistProperties.get("patrolRange") <= 24, "Vale's walk should remain calm and local");
});

test("each village exit preserves its side around the world miniature", async () => {
  const world = JSON.parse(await readFile(new URL("glass-steppe.json", mapDirectory), "utf8"));
  for (const [villageId, miniatureName] of [
    ["lumen-hollow", "Lumen Hollow miniature"],
    ["aster-reach", "Aster Reach miniature"],
    ["vesper-crossing", "Vesper Crossing miniature"],
  ]) {
    const village = JSON.parse(await readFile(new URL(`${villageId}.json`, mapDirectory), "utf8"));
    const villageExits = village.layers.find((layer) => layer.name === "triggers").objects.filter(
      (object) => object.properties.some((property) => property.name === "targetMap" && property.value === "glass-steppe"),
    );
    const miniature = world.layers.find((layer) => layer.name === "scenery").objects.find(
      (object) => object.name === miniatureName,
    );
    assert.equal(
      miniature.properties.find((property) => property.name === "blocksMovement")?.value,
      false,
      `${villageId} miniature should not trap Ash at an exit`,
    );
    const entrances = world.layers.find((layer) => layer.name === "triggers").objects.filter(
      (object) => object.properties.some((property) => property.name === "targetMap" && property.value === villageId),
    );
    assert.equal(villageExits.length, 4);
    assert.equal(entrances.length, 4);
    for (const villageExit of villageExits) {
      const targetX = villageExit.properties.find((property) => property.name === "targetX").value;
      const targetY = villageExit.properties.find((property) => property.name === "targetY").value;
      const targetOffsetX = villageExit.properties.find((property) => property.name === "targetOffsetX")?.value ?? 0;
      const targetOffsetY = villageExit.properties.find((property) => property.name === "targetOffsetY")?.value ?? 0;
      const targetDirection = villageExit.properties.find((property) => property.name === "targetDirection").value;
      const side = villageExit.name.replace("world-return-", "");
      const expected = {
        north: [miniature.x + 18, miniature.y - 16, "up"],
        south: [miniature.x + 18, miniature.y + 49, "down"],
        west: [miniature.x - 7, miniature.y + 32, "left"],
        east: [miniature.x + miniature.width - 6, miniature.y + 32, "right"],
      }[side];
      assert.deepEqual([
        targetX * world.tilewidth + 2 + targetOffsetX,
        targetY * world.tileheight + targetOffsetY,
        targetDirection,
      ], expected);
    }
    const expectedEntrances = villageId === "lumen-hollow" ? {
      north: [miniature.x, miniature.y + 24, 48, 16, 13, 1, 4, "down"],
      south: [miniature.x, miniature.y + 48, 48, 16, 13, village.height - 3, 4, "up"],
      west: [miniature.x, miniature.y + 24, 16, 40, 1, 7, 0, "right"],
      east: [miniature.x + 32, miniature.y + 24, 16, 40, village.width - 2, 15, 0, "left"],
    } : {
      north: [miniature.x, miniature.y + 24, 48, 16, Math.floor(village.width / 2), 1, 0, "down"],
      south: [miniature.x, miniature.y + 48, 48, 16, Math.floor(village.width / 2), village.height - 3, 0, "up"],
      west: [miniature.x, miniature.y + 24, 16, 40, 1, Math.floor(village.height / 2), 0, "right"],
      east: [miniature.x + 32, miniature.y + 24, 16, 40, village.width - 2, Math.floor(village.height / 2), 0, "left"],
    };
    for (const entrance of entrances) {
      const side = entrance.name.replace(`${villageId}-entrance-`, "");
      const targetX = entrance.properties.find((property) => property.name === "targetX").value;
      const targetY = entrance.properties.find((property) => property.name === "targetY").value;
      const targetOffsetX = entrance.properties.find((property) => property.name === "targetOffsetX")?.value ?? 0;
      const targetDirection = entrance.properties.find((property) => property.name === "targetDirection").value;
      assert.deepEqual([
        entrance.x, entrance.y, entrance.width, entrance.height, targetX, targetY, targetOffsetX, targetDirection,
      ], expectedEntrances[side]);
      if (side === "west" || side === "east") {
        assert.ok(entrance.y > miniature.y, `${villageId}:${side} must ignore the decorative upper tower`);
      }

      const villageExit = villageExits.find((candidate) => candidate.name === `world-return-${side}`);
      const exitOffsetX = villageExit.properties.find((property) => property.name === "targetOffsetX")?.value ?? 0;
      const exitOffsetY = villageExit.properties.find((property) => property.name === "targetOffsetY")?.value ?? 0;
      const exitX = villageExit.properties.find((property) => property.name === "targetX").value * world.tilewidth + 8 + exitOffsetX;
      const exitY = villageExit.properties.find((property) => property.name === "targetY").value * world.tileheight + 15 + exitOffsetY;
      const towardVillage = {
        north: [0, world.tileheight * 2],
        south: [0, -world.tileheight],
        west: [world.tilewidth, 0],
        east: [-world.tilewidth, 0],
      }[side];
      const contains = (x, y) => x >= entrance.x && x < entrance.x + entrance.width
        && y >= entrance.y && y < entrance.y + entrance.height;
      assert.equal(contains(exitX, exitY), false, `${villageId}:${side} exit should start outside its entrance`);
      assert.equal(contains(exitX + towardVillage[0], exitY + towardVillage[1]), true, `${villageId}:${side} should re-enter by moving toward the village`);
    }
  }
});

test("every Lumen Hollow world entrance lands Ash on a visible paved approach", async () => {
  const world = JSON.parse(await readFile(new URL("glass-steppe.json", mapDirectory), "utf8"));
  const village = JSON.parse(await readFile(new URL("lumen-hollow.json", mapDirectory), "utf8"));
  const terrain = village.layers.find((layer) => layer.name === "terrain").data;
  const scenery = village.layers.find((layer) => layer.name === "scenery").objects;
  const entrances = world.layers.find((layer) => layer.name === "triggers").objects.filter(
    (object) => object.properties.some((property) => property.name === "targetMap" && property.value === "lumen-hollow"),
  );
  for (const entrance of entrances) {
    const properties = new Map(entrance.properties.map((property) => [property.name, property.value]));
    const targetX = properties.get("targetX");
    const targetY = properties.get("targetY");
    const offsetX = properties.get("targetOffsetX") ?? 0;
    assert.equal(terrain[targetY * village.width + targetX], 15, `${entrance.name} is not paved`);
    const player = {
      left: targetX * village.tilewidth + 2 + offsetX - 4,
      top: targetY * village.tileheight - 16,
      right: targetX * village.tilewidth + 2 + offsetX + 20,
      bottom: targetY * village.tileheight + 16,
    };
    const hiddenByBuilding = scenery.some((object) => player.left < object.x + object.width
      && player.right > object.x
      && player.top < object.y + object.height
      && player.bottom > object.y);
    assert.equal(hiddenByBuilding, false, `${entrance.name} puts Ash behind scenery`);
  }
});

test("village shops have open door thresholds and walkable exterior tiles", async () => {
  for (const villageId of ["lumen-hollow", "aster-reach", "vesper-crossing"]) {
    const map = JSON.parse(await readFile(new URL(`${villageId}.json`, mapDirectory), "utf8"));
    const collision = map.layers.find((layer) => layer.name === "collision");
    const services = map.layers.find((layer) => layer.name === "interactions").objects.filter(
      (object) => object.type === "service",
    );
    for (const service of services) {
      const tileY = Math.floor(service.y / map.tileheight);
      const firstTileX = Math.floor(service.x / map.tilewidth);
      const lastTileX = Math.floor((service.x + service.width - 1) / map.tilewidth);
      for (let tileX = firstTileX; tileX <= lastTileX; tileX += 1) {
        assert.equal(collision.data[tileY * map.width + tileX], 0, `${villageId}:${service.name} door is blocked at ${tileX},${tileY}`);
        assert.equal(collision.data[(tileY + 1) * map.width + tileX], 0, `${villageId}:${service.name} exterior is blocked at ${tileX},${tileY + 1}`);
      }
    }
  }
});

test("villages without walls can be exited along every map edge", async () => {
  for (const villageId of ["lumen-hollow", "aster-reach", "vesper-crossing"]) {
    const map = JSON.parse(await readFile(new URL(`${villageId}.json`, mapDirectory), "utf8"));
    const collision = map.layers.find((layer) => layer.name === "collision");
    const triggers = map.layers.find((layer) => layer.name === "triggers").objects;
    assert.ok(triggers.some((trigger) => trigger.y === 0 && trigger.width === map.width * map.tilewidth));
    assert.ok(triggers.some((trigger) => trigger.y === (map.height - 1) * map.tileheight && trigger.width === map.width * map.tilewidth));
    assert.ok(triggers.some((trigger) => trigger.x === 0 && trigger.height === (map.height - 2) * map.tileheight));
    assert.ok(triggers.some((trigger) => trigger.x === (map.width - 1) * map.tilewidth && trigger.height === (map.height - 2) * map.tileheight));
    for (let x = 0; x < map.width; x += 1) {
      assert.equal(collision.data[x], 0);
      assert.equal(collision.data[(map.height - 1) * map.width + x], 0);
    }
    for (let y = 0; y < map.height; y += 1) {
      assert.equal(collision.data[y * map.width], 0);
      assert.equal(collision.data[y * map.width + map.width - 1], 0);
    }
  }
});

test("Aster Reach is a safe second village with paid return transit", async () => {
  const map = JSON.parse(await readFile(new URL("aster-reach.json", mapDirectory), "utf8"));
  assert.ok(map.width >= 28 && map.height >= 20, "Aster Reach should be larger than its first draft");
  assert.equal(map.layers.find((layer) => layer.name === "encounters").objects.length, 0);
  const services = map.layers.find((layer) => layer.name === "interactions").objects;
  const transit = services.find((service) => service.properties.some(
    (property) => property.name === "interactionKind" && property.value === "teleport",
  ));
  assert.equal(transit.properties.find((property) => property.name === "price").value, 35);
  assert.equal(transit.properties.find((property) => property.name === "destinationMap").value, "lumen-hollow,vesper-crossing");
  assert.equal(transit.properties.find((property) => property.name === "requiredFlag").value, "village.lumen-hollow.visited|village.vesper-crossing.visited");
  assert.ok(services.some((service) => service.properties.some(
    (property) => property.name === "interactionKind" && property.value === "save-shop",
  )));
  const kinds = new Set(services.map((service) => service.properties.find(
    (property) => property.name === "interactionKind",
  )?.value));
  for (const kind of ["inn", "item-shop", "weapon-shop", "armor-shop", "revival-shop", "save-shop", "teleport"]) {
    assert.ok(kinds.has(kind), `Aster Reach is missing ${kind}`);
  }
  const pell = map.layers.find((layer) => layer.name === "entities").objects.find(
    (entity) => entity.name === "Pell",
  );
  const pellProperties = new Map(pell.properties.map((property) => [property.name, property.value]));
  assert.deepEqual([pell.x, pell.y], [256, 224], "Pell should patrol the open road below the shop fronts");
  assert.equal(pellProperties.get("patrolAxis"), "horizontal");
  assert.equal(pellProperties.get("patrolRange"), 32);
});

test("Vesper Crossing is a safe third village linked to discovered transit beacons", async () => {
  const map = JSON.parse(await readFile(new URL("vesper-crossing.json", mapDirectory), "utf8"));
  assert.equal(map.layers.find((layer) => layer.name === "encounters").objects.length, 0);
  const services = map.layers.find((layer) => layer.name === "interactions").objects;
  const transit = services.find((service) => service.properties.some(
    (property) => property.name === "interactionKind" && property.value === "teleport",
  ));
  assert.equal(transit.properties.find((property) => property.name === "price").value, 50);
  assert.equal(transit.properties.find((property) => property.name === "destinationMap").value, "aster-reach,lumen-hollow");
  assert.ok(services.some((service) => service.properties.some(
    (property) => property.name === "interactionKind" && property.value === "save-shop",
  )));
  assert.ok(services.some((service) => service.properties.some(
    (property) => property.name === "interactionKind" && property.value === "revival-shop",
  )));
  assert.ok(services.some((service) => service.properties.some(
    (property) => property.name === "interactionKind" && property.value === "weapon-shop",
  )));
  const entities = map.layers.find((layer) => layer.name === "entities").objects;
  const movingResidents = entities.filter((entity) => ["Warden Mae", "Boatman Ors"].includes(entity.name));
  assert.equal(movingResidents.length, 2);
  for (const resident of movingResidents) {
    assert.equal(resident.properties.find((property) => property.name === "movement")?.value, "patrol");
    assert.ok(resident.properties.find((property) => property.name === "patrolRange")?.value <= 32);
  }
  const movingSprites = movingResidents.map((resident) => resident.properties.find(
    (property) => property.name === "spriteId",
  )?.value);
  assert.equal(new Set(movingSprites).size, movingSprites.length, "moving Vesper residents need distinct silhouettes");
  const armorShop = map.layers.find((layer) => layer.name === "scenery").objects.find(
    (object) => object.name === "Vesper Armor Shop",
  );
  const armorProperties = new Map(armorShop.properties.map((property) => [property.name, property.value]));
  assert.equal(armorProperties.get("footprintX"), 4, "the armor-shop footprint should begin at the painted wall");
  assert.equal(armorProperties.get("footprintWidth"), 44, "the removed armor-shop fragment still has collision");
  const collision = map.layers.find((layer) => layer.name === "collision").data;
  assert.equal(collision[12 * map.width + 16], 0, "the armor shop still has a legacy collision tile on its left");
  assert.equal(collision[12 * map.width + 19], 0, "the removed armor-shop fragment still has a legacy collision tile");
});

test("village service prices rise along the route while saving remains free", async () => {
  const prices = {};
  for (const villageId of ["lumen-hollow", "aster-reach", "vesper-crossing"]) {
    const map = JSON.parse(await readFile(new URL(`${villageId}.json`, mapDirectory), "utf8"));
    const services = map.layers.find((layer) => layer.name === "interactions").objects.filter(
      (object) => object.type === "service",
    );
    prices[villageId] = Object.fromEntries(services.map((service) => {
      const kind = service.properties.find((property) => property.name === "interactionKind").value;
      const price = service.properties.find((property) => property.name === "price").value;
      return [kind, price];
    }));
  }
  assert.deepEqual([prices["lumen-hollow"]["item-shop"], prices["aster-reach"]["item-shop"], prices["vesper-crossing"]["item-shop"]], [8, 12, 16]);
  assert.deepEqual([prices["lumen-hollow"].inn, prices["aster-reach"].inn, prices["vesper-crossing"].inn], [12, 18, 24]);
  assert.deepEqual([prices["lumen-hollow"].teleport, prices["aster-reach"].teleport, prices["vesper-crossing"].teleport], [25, 35, 50]);
  assert.deepEqual([prices["lumen-hollow"]["revival-shop"], prices["aster-reach"]["revival-shop"], prices["vesper-crossing"]["revival-shop"]], [15, 20, 25]);
  assert.deepEqual([prices["lumen-hollow"]["save-shop"], prices["aster-reach"]["save-shop"], prices["vesper-crossing"]["save-shop"]], [0, 0, 0]);
});

test("Ione and Nox are recruited by conversation and wait at Ash's house", async () => {
  const lumen = JSON.parse(await readFile(new URL("lumen-hollow.json", mapDirectory), "utf8"));
  const aster = JSON.parse(await readFile(new URL("aster-reach.json", mapDirectory), "utf8"));
  const vesper = JSON.parse(await readFile(new URL("vesper-crossing.json", mapDirectory), "utf8"));
  const lumenNarrative = lumen.layers.find((layer) => layer.name === "narrative").objects;
  assert.ok(!lumenNarrative.some((object) => object.properties?.some(
    (property) => property.name === "flag" && property.value === "party.ione-recruited",
  )), "Ione must no longer join automatically at Lumen Hollow");
  const recruitment = [
    [aster, "ione", "party.ione-recruited"],
    [vesper, "nox", "party.nox-recruited"],
  ];
  for (const [map, memberId, flag] of recruitment) {
    const entity = map.layers.find((layer) => layer.name === "entities").objects.find((object) => object.properties?.some(
      (property) => property.name === "recruitMemberId" && property.value === memberId,
    ));
    assert.ok(entity, `${memberId} is missing from the intended village`);
    const properties = new Map(entity.properties.map((property) => [property.name, property.value]));
    assert.equal(properties.get("recruitFlag"), flag);
    assert.equal(properties.get("hiddenFlag"), flag);
    assert.equal(typeof properties.get("dialogueId"), "string");
  }
});

test("the southern village is gated by a narrow bridge and a stronger encounter zone", async () => {
  const map = JSON.parse(await readFile(new URL("glass-steppe.json", mapDirectory), "utf8"));
  const terrain = map.layers.find((layer) => layer.name === "terrain");
  const objects = map.layers.find((layer) => layer.name === "objects");
  const collision = map.layers.find((layer) => layer.name === "collision");
  for (let x = 4; x <= 51; x += 1) {
    const value = collision.data[40 * map.width + x];
    if ([21, 22, 23].includes(x)) {
      assert.equal(value, 0, `bridge tile ${x},40 should be walkable`);
      assert.equal(objects.data[40 * map.width + x], 12, `bridge tile ${x},40 should be visibly reinforced`);
    } else {
      assert.notEqual(value, 0, `the southern channel leaks at ${x},40`);
      assert.equal(terrain.data[40 * map.width + x], 0);
    }
  }
  const zones = map.layers.find((layer) => layer.name === "encounters").objects;
  const north = zones.find((zone) => zone.name === "Western greenway");
  const south = zones.find((zone) => zone.name === "Southern bridge wilds");
  const farSouth = zones.find((zone) => zone.name === "Far southern frontier");
  const properties = new Map(south.properties.map((property) => [property.name, property.value]));
  assert.ok(properties.get("minDistance") < north.properties.find((property) => property.name === "minDistance").value);
  assert.match(properties.get("formations"), /rift-hunter/);
  assert.match(properties.get("formations"), /rift-pack/);
  assert.match(properties.get("formations"), /storm-colossus/);
  assert.match(properties.get("formations"), /dust-escort/);
  assert.ok(farSouth, "the enlarged southern territory needs its own encounter region");
  assert.match(farSouth.properties.find((property) => property.name === "formations").value, /storm-patrol/);
  const barrier = map.layers.find((layer) => layer.name === "interactions").objects.find(
    (interaction) => interaction.name === "southern-bridge-barrier",
  );
  assert.ok(barrier, "the southern bridge needs a visible quest barrier");
  assert.deepEqual([barrier.x, barrier.y, barrier.width, barrier.height], [336, 640, 48, 16]);
  assert.equal(barrier.properties.find((property) => property.name === "requiredFlag").value, "quest.south-bridge-open");
});

test("the mayor, Mira and her visible guardian form a complete rescue quest", async () => {
  const lumen = JSON.parse(await readFile(new URL("lumen-hollow.json", mapDirectory), "utf8"));
  const vault = JSON.parse(await readFile(new URL("echo-vault.json", mapDirectory), "utf8"));
  const lumenEntities = lumen.layers.find((layer) => layer.name === "entities").objects;
  const vaultEntities = vault.layers.find((layer) => layer.name === "entities").objects;
  const mayor = lumenEntities.find((entity) => entity.name === "Mayor Orren");
  const homeMira = lumenEntities.find((entity) => entity.name === "Mira");
  const trappedMira = vaultEntities.find((entity) => entity.name === "Mira");
  const guardian = vaultEntities.find((entity) => entity.name === "Archive Guardian");
  assert.ok(mayor && homeMira && trappedMira && guardian);
  assert.equal(mayor.properties.find((property) => property.name === "dialogueAfterFlag").value, "quest.mira-home");
  assert.equal(homeMira.properties.find((property) => property.name === "requiredFlag").value, "quest.mira-home");
  assert.equal(trappedMira.properties.find((property) => property.name === "hiddenFlag").value, "quest.mira-rescued");
  assert.equal(guardian.properties.find((property) => property.name === "battleFormation").value, "archive-guardian");
  assert.equal(guardian.properties.find((property) => property.name === "escortFlag").value, "quest.mira-escorting");
  assert.equal(guardian.properties.find((property) => property.name === "hiddenFlag").value, "quest.mira-rescued");
});

test("all narrative triggers resolve to existing English dialogue nodes", async () => {
  const dialogueIds = new Set(Object.keys(DIALOGUES));
  const files = (await readdir(mapDirectory)).filter((file) => file.endsWith(".json"));

  for (const file of files) {
    const map = JSON.parse(await readFile(new URL(file, mapDirectory), "utf8"));
    const narrativeLayer = map.layers.find((layer) => layer.name === "narrative");
    const flags = new Set();
    for (const object of narrativeLayer.objects) {
      const dialogueId = object.properties.find((property) => property.name === "dialogueId")?.value;
      const flag = object.properties.find((property) => property.name === "flag")?.value;
      assert.ok(dialogueIds.has(dialogueId), `${file}:${object.name} points to missing dialogue ${dialogueId}`);
      assert.equal(typeof flag, "string", `${file}:${object.name} is missing a narrative flag`);
      assert.ok(!flags.has(flag), `${file} repeats narrative flag ${flag}`);
      flags.add(flag);
    }
    const entityLayer = map.layers.find((layer) => layer.name === "entities");
    for (const entity of entityLayer.objects) {
      for (const propertyName of ["dialogueId", "dialogueAfterId", "victoryDialogueId"]) {
        const dialogueId = entity.properties.find((property) => property.name === propertyName)?.value;
        if (dialogueId) assert.ok(dialogueIds.has(dialogueId), `${file}:${entity.name} points to missing dialogue ${dialogueId}`);
      }
    }
  }
});
