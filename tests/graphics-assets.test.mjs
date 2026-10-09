import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const graphicsDirectory = new URL("../public/assets/graphics/", import.meta.url);
const mapDirectory = new URL("../public/assets/maps/", import.meta.url);

test("the game uses a real 640 by 480 internal canvas", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /<canvas id="game" width="640" height="480"/);
});

async function pngDimensions(filename) {
  const source = await readFile(new URL(filename, graphicsDirectory));
  assert.deepEqual([...source.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.ok(source.length > 100, `${filename} is unexpectedly empty`);
  return [source.readUInt32BE(16), source.readUInt32BE(20)];
}

test("the graphic study uses exact production sprite and atlas dimensions", async () => {
  assert.deepEqual(await pngDimensions("ash-overworld-v2.png"), [60, 112]);
  assert.deepEqual(await pngDimensions("ash-overworld-hd-v1.png"), [144, 256]);
  assert.deepEqual(await pngDimensions("lumen-tiles-hd-v1.png"), [256, 32]);
  assert.deepEqual(await pngDimensions("world-terrain-hd-v1.png"), [512, 64]);
  assert.deepEqual(await pngDimensions("world-landmarks-hd-v1.png"), [384, 128]);
  assert.deepEqual(await pngDimensions("echo-vault-tiles-hd-v1.png"), [512, 64]);
  assert.deepEqual(await pngDimensions("echo-vault-guardian-hd-v1.png"), [256, 72]);
  assert.deepEqual(await pngDimensions("echo-vault-pylon-hd-v1.png"), [80, 160]);
  assert.deepEqual(await pngDimensions("battle-party-hd-v1.png"), [384, 448]);
  assert.deepEqual(await pngDimensions("battle-nox-carbine-fire-hd-v1.png"), [96, 112]);
  assert.deepEqual(await pngDimensions("battle-enemies-hd-v1.png"), [512, 256]);
  assert.deepEqual(await pngDimensions("tower-enemies-hd-v1.png"), [256, 256]);
  assert.deepEqual(await pngDimensions("aegis-specter-hd-v1.png"), [128, 128]);
  assert.deepEqual(await pngDimensions("control-towers-hd-v1.png"), [288, 128]);
  assert.deepEqual(await pngDimensions("control-array-console-hd-v1.png"), [96, 128]);
  assert.deepEqual(await pngDimensions("southwake-landmarks-hd-v1.png"), [192, 128]);
  assert.deepEqual(await pngDimensions("southwake-enemies-hd-v1.png"), [512, 128]);
  assert.deepEqual(await pngDimensions("undertide-enemies-hd-v1.png"), [512, 128]);
  assert.deepEqual(await pngDimensions("sera-overworld-hd-v1.png"), [192, 64]);
  for (const region of ["aster", "vesper"]) {
    for (const role of ["memory", "transit", "weapon", "item", "clinic", "armor"]) {
      assert.deepEqual(await pngDimensions(`${region}-${role}-hd-v1.png`), [128, 160]);
    }
    assert.deepEqual(await pngDimensions(`${region}-inn-hd-v1.png`), [160, 160]);
  }
  for (const role of ["memory", "transit", "weapon", "item", "clinic", "armor"]) {
    assert.deepEqual(await pngDimensions(`tideglass-${role}-hd-v1.png`), [128, 160]);
  }
  assert.deepEqual(await pngDimensions("tideglass-inn-hd-v1.png"), [160, 160]);
  assert.deepEqual(await pngDimensions("tideglass-harbor-hd-v1.png"), [160, 160]);
  assert.deepEqual(await pngDimensions("lumen-study-scenery-v1.png"), [192, 80]);
  assert.deepEqual(await pngDimensions("lumen-home-hd-v1.png"), [160, 160]);
  assert.deepEqual(await pngDimensions("lumen-shop-hd-v1.png"), [160, 192]);
  assert.deepEqual(await pngDimensions("lumen-memory-hd-v1.png"), [160, 160]);
  assert.deepEqual(await pngDimensions("lumen-transit-hd-v1.png"), [160, 160]);
  assert.deepEqual(await pngDimensions("lumen-tree-hd-v1.png"), [160, 192]);
  assert.deepEqual(await pngDimensions("lumen-inn-hd-v1.png"), [160, 160]);
  assert.deepEqual(await pngDimensions("lumen-item-shop-hd-v1.png"), [160, 160]);
  assert.deepEqual(await pngDimensions("lumen-clinic-hd-v1.png"), [160, 160]);
  assert.deepEqual(await pngDimensions("lumen-armor-shop-hd-v1.png"), [160, 160]);
  assert.deepEqual(await pngDimensions("village-npcs-hd-v3.png"), [192, 448]);
  assert.deepEqual(await pngDimensions("archive-custodian-hd-v1.png"), [128, 128]);
  assert.deepEqual(await pngDimensions("tempest-regent-hd-v1.png"), [128, 128]);
  assert.deepEqual(await pngDimensions("crown-judicator-hd-v1.png"), [128, 128]);
  assert.deepEqual(await pngDimensions("cipher-drone-hd-v1.png"), [128, 128]);
  assert.deepEqual(await pngDimensions("village-npcs-regional-hd-v3.png"), [192, 256]);
  assert.deepEqual(await pngDimensions("service-portraits-hd-v1.png"), [1536, 864]);
  assert.deepEqual(await pngDimensions("party-portraits-hd-v1.png"), [2048, 512]);
});

test("Lumen Hollow opts into the new scenery study without changing other villages", async () => {
  const lumen = JSON.parse(await readFile(new URL("lumen-hollow.json", mapDirectory), "utf8"));
  const scenery = lumen.layers.find((layer) => layer.name === "scenery").objects;
  const spriteByName = Object.fromEntries(scenery.map((object) => [
    object.name,
    object.properties.find((property) => property.name === "spriteId").value,
  ]));
  assert.equal(spriteByName["Ash's House"], "lumen-study-home");
  assert.equal(spriteByName["Signal Market"], "lumen-study-shop");
  assert.equal(spriteByName["Northern signal tree"], "lumen-study-tree");
  assert.equal(spriteByName["Memory Counter"], "lumen-hd-memory");
  assert.equal(spriteByName["Lumen Spire"], "lumen-hd-transit");
  assert.equal(spriteByName["Hollow Inn"], "lumen-hd-inn");
  assert.equal(spriteByName["Item Shop"], "lumen-hd-item");
  assert.equal(spriteByName["Lumen Regeneration Clinic"], "lumen-hd-clinic");
  assert.equal(spriteByName["Armor Shop"], "lumen-hd-armor");

  const lumenOnlySprites = new Set([
    "lumen-study-home", "lumen-study-shop", "lumen-study-tree", "lumen-hd-memory", "lumen-hd-transit",
    "lumen-hd-inn", "lumen-hd-item", "lumen-hd-clinic", "lumen-hd-armor",
  ]);
  for (const villageId of ["aster-reach", "vesper-crossing"]) {
    const map = JSON.parse(await readFile(new URL(`${villageId}.json`, mapDirectory), "utf8"));
    const sprites = map.layers.find((layer) => layer.name === "scenery").objects.map((object) => (
      object.properties.find((property) => property.name === "spriteId").value
    ));
    assert.ok(!sprites.some((sprite) => lumenOnlySprites.has(sprite)));
  }
});

test("Surveyor Leth has a field-scientist sprite distinct from Mayor Orren", async () => {
  const lumen = JSON.parse(await readFile(new URL("lumen-hollow.json", mapDirectory), "utf8"));
  const entities = lumen.layers.find((layer) => layer.name === "entities").objects;
  const spriteFor = (name) => entities.find((entity) => entity.name === name)
    .properties.find((property) => property.name === "spriteId").value;
  assert.equal(spriteFor("Surveyor Leth"), "surveyor-leth");
  assert.equal(spriteFor("Mayor Orren"), "hollow-host");
  assert.notEqual(spriteFor("Surveyor Leth"), spriteFor("Mayor Orren"));
});

test("villages use distinct regional residents and Boatman Ors looks like a ferryman", async () => {
  const spriteFor = (map, name) => map.layers.find((layer) => layer.name === "entities").objects
    .find((entity) => entity.name === name)
    .properties.find((property) => property.name === "spriteId").value;
  const lumen = JSON.parse(await readFile(new URL("lumen-hollow.json", mapDirectory), "utf8"));
  const aster = JSON.parse(await readFile(new URL("aster-reach.json", mapDirectory), "utf8"));
  const vesper = JSON.parse(await readFile(new URL("vesper-crossing.json", mapDirectory), "utf8"));
  assert.equal(spriteFor(lumen, "Botanist Vale"), "lumen-botanist");
  assert.equal(spriteFor(aster, "Pell"), "aster-courier");
  assert.equal(spriteFor(vesper, "Engineer Rhea"), "vesper-engineer");
  assert.equal(spriteFor(vesper, "Boatman Ors"), "vesper-boatman");
});

test("Lumen Hollow service doors are centred on separated building footprints", async () => {
  const lumen = JSON.parse(await readFile(new URL("lumen-hollow.json", mapDirectory), "utf8"));
  const scenery = lumen.layers.find((layer) => layer.name === "scenery").objects.filter(
    (object) => object.name !== "Northern signal tree",
  );
  const interactions = lumen.layers.find((layer) => layer.name === "interactions").objects;
  const serviceToBuilding = {
    "hollow-inn-service": "Hollow Inn",
    "ash-house-service": "Ash's House",
    "weapon-shop-service": "Signal Market",
    "transit-gate-service": "Lumen Spire",
    "item-shop-service": "Item Shop",
    "lumen-regeneration-clinic": "Lumen Regeneration Clinic",
    "memory-counter-service": "Memory Counter",
    "armor-shop-service": "Armor Shop",
  };
  for (const [serviceName, buildingName] of Object.entries(serviceToBuilding)) {
    const service = interactions.find((object) => object.name === serviceName);
    const building = scenery.find((object) => object.name === buildingName);
    assert.equal(service.x + service.width / 2, building.x + building.width / 2, `${buildingName} door is off-centre`);
    assert.equal(service.y + service.height, building.y + building.height, `${buildingName} threshold does not meet its visible entrance`);
  }
  for (let left = 0; left < scenery.length; left += 1) {
    for (let right = left + 1; right < scenery.length; right += 1) {
      const a = scenery[left];
      const b = scenery[right];
      const overlaps = a.x < b.x + b.width && a.x + a.width > b.x
        && a.y < b.y + b.height && a.y + a.height > b.y;
      assert.equal(overlaps, false, `${a.name} overlaps ${b.name}`);
    }
  }
});

test("the Root Archive reads as a sealed landmark rather than an unlabelled door", async () => {
  const lumen = JSON.parse(await readFile(new URL("lumen-hollow.json", mapDirectory), "utf8"));
  const interactions = lumen.layers.find((layer) => layer.name === "interactions").objects;
  const archive = interactions.find((object) => object.name === "root-archive-seal");
  assert.equal(archive.type, "message");
  assert.match(archive.properties.find((property) => property.name === "text").value, /entrance is sealed/i);
});

test("Lumen Hollow's vertical road runs between shops instead of beneath two doors", async () => {
  const lumen = JSON.parse(await readFile(new URL("lumen-hollow.json", mapDirectory), "utf8"));
  const terrain = lumen.layers.find((layer) => layer.name === "terrain");
  const tile = (x, y) => terrain.data[y * lumen.width + x];
  for (const y of [9, 17, 19]) {
    assert.equal(tile(13, y), 15);
    assert.equal(tile(14, y), 15);
    assert.equal(tile(17, y), 0);
    assert.equal(tile(18, y), 0);
  }
});

test("the Root Archive tree stands on a green enclave instead of the paved road", async () => {
  const lumen = JSON.parse(await readFile(new URL("lumen-hollow.json", mapDirectory), "utf8"));
  const terrain = lumen.layers.find((layer) => layer.name === "terrain").data;
  for (let y = 6; y <= 8; y += 1) {
    for (let x = 28; x <= 34; x += 1) assert.equal(terrain[y * lumen.width + x], 0);
  }
});
