import type {
  Direction,
  EncounterEntry,
  EncounterZone,
  EquipmentId,
  FormationId,
  Interaction,
  InteractionKind,
  LoadedMap,
  MapEntity,
  NarrativeTrigger,
  PartyMemberId,
  SceneryObject,
  ScenerySpriteId,
  TiledLayer,
  TiledMap,
  TiledObject,
  TiledObjectLayer,
  TiledProperty,
  TiledTileLayer,
  Transition,
} from "../types/game";

const MAP_FILES: Record<string, string> = {
  "relay-garden": "relay-garden.json",
  "archive-hall": "archive-hall.json",
  "glass-steppe": "glass-steppe.json",
  "echo-vault": "echo-vault.json",
  "lumen-hollow": "lumen-hollow.json",
  "aster-reach": "aster-reach.json",
  "vesper-crossing": "vesper-crossing.json",
  "west-control-1f": "west-control-1f.json",
  "west-control-2f": "west-control-2f.json",
  "west-control-3f": "west-control-3f.json",
  "west-control-summit": "west-control-summit.json",
  "central-control-entry": "central-control-entry.json",
  "east-control-1f": "east-control-1f.json",
  "east-control-2f": "east-control-2f.json",
  "east-control-3f": "east-control-3f.json",
  "east-control-summit": "east-control-summit.json",
  "southern-landing": "southern-landing.json",
  "tideglass-harbor": "tideglass-harbor.json",
  "undertide-passage": "undertide-passage.json",
  "meridian-basin": "meridian-basin.json",
  "cairn-meridian": "cairn-meridian.json",
  "meridian-array": "meridian-array.json",
  "central-control-galleries": "central-control-galleries.json",
  "central-control-archives": "central-control-archives.json",
  "central-control-core": "central-control-core.json",
  "windscar-cliffs": "windscar-cliffs.json",
  "cradle-workshop": "cradle-workshop.json",
  "cradle-hangar": "cradle-hangar.json",
  "skyglass-relay": "skyglass-relay.json",
  "stormbreak-ridge": "stormbreak-ridge.json",
  "weather-dome": "weather-dome.json",
  "weather-eye": "weather-eye.json",
  "crown-causeway": "crown-causeway.json",
  "crown-archives": "crown-archives.json",
  "crown-sanctum": "crown-sanctum.json",
};

function propertyValue<T extends string | number | boolean>(
  properties: TiledProperty[] | undefined,
  name: string,
  fallback: T,
): T {
  const property = properties?.find((candidate) => candidate.name === name);
  return (property?.value as T | undefined) ?? fallback;
}

function isTileLayer(layer: TiledLayer): layer is TiledTileLayer {
  return layer.type === "tilelayer";
}

function isObjectLayer(layer: TiledLayer): layer is TiledObjectLayer {
  return layer.type === "objectgroup";
}

function toTransition(object: TiledObject): Transition {
  return {
    id: object.id,
    x: object.x,
    y: object.y,
    width: object.width,
    height: object.height,
    targetMap: propertyValue(object.properties, "targetMap", "lumen-hollow"),
    targetX: propertyValue(object.properties, "targetX", 10),
    targetY: propertyValue(object.properties, "targetY", 10),
    targetOffsetX: propertyValue(object.properties, "targetOffsetX", 0),
    targetOffsetY: propertyValue(object.properties, "targetOffsetY", 0),
    targetDirection: propertyValue<Direction>(object.properties, "targetDirection", "down"),
  };
}

function toInteraction(object: TiledObject): Interaction {
  return {
    id: object.id,
    name: object.name,
    x: object.x,
    y: object.y,
    width: object.width,
    height: object.height,
    kind: propertyValue<InteractionKind>(object.properties, "interactionKind", "message"),
    restoredText: propertyValue(object.properties, "restoredText", ""),
    dialogueId: propertyValue(object.properties, "dialogueId", ""),
    text: propertyValue(object.properties, "text", "The old relay remains silent."),
    emptyText: propertyValue(object.properties, "emptyText", "Nothing else answers."),
    flag: propertyValue(object.properties, "flag", `interaction-${object.id}`),
    credits: propertyValue(object.properties, "credits", 0),
    tonics: propertyValue(object.properties, "tonics", 0),
    returnBeacons: propertyValue(object.properties, "returnBeacons", 0),
    equipmentId: propertyValue<EquipmentId | "">(object.properties, "equipmentId", "") || null,
    price: propertyValue(object.properties, "price", 0),
    destinationMap: propertyValue(object.properties, "destinationMap", ""),
    destinationName: propertyValue(object.properties, "destinationName", ""),
    requiredFlag: propertyValue(object.properties, "requiredFlag", ""),
  };
}

function toEntity(object: TiledObject): MapEntity {
  const patrolAxis = propertyValue<"horizontal" | "vertical">(object.properties, "patrolAxis", "horizontal");
  return {
    id: object.id,
    name: object.name,
    x: object.x,
    y: object.y,
    spriteId: propertyValue(object.properties, "spriteId", "keeper"),
    dialogueId: propertyValue(object.properties, "dialogueId", "keeper-veyra"),
    dialogueAfterFlag: propertyValue(object.properties, "dialogueAfterFlag", ""),
    dialogueAfterId: propertyValue(object.properties, "dialogueAfterId", ""),
    dialogueMiddleFlag: propertyValue(object.properties, "dialogueMiddleFlag", ""),
    dialogueMiddleId: propertyValue(object.properties, "dialogueMiddleId", ""),
    requiredFlag: propertyValue(object.properties, "requiredFlag", ""),
    hiddenFlag: propertyValue(object.properties, "hiddenFlag", ""),
    battleFormation: propertyValue<FormationId | "">(object.properties, "battleFormation", "") || null,
    defeatFlag: propertyValue(object.properties, "defeatFlag", ""),
    escortFlag: propertyValue(object.properties, "escortFlag", ""),
    victoryDialogueId: propertyValue(object.properties, "victoryDialogueId", ""),
    recruitMemberId: propertyValue<PartyMemberId | "">(object.properties, "recruitMemberId", "") || null,
    recruitFlag: propertyValue(object.properties, "recruitFlag", ""),
    travelMap: propertyValue(object.properties, "travelMap", ""),
    travelX: propertyValue(object.properties, "travelX", 0),
    travelY: propertyValue(object.properties, "travelY", 0),
    movement: propertyValue<"fixed" | "patrol">(object.properties, "movement", "fixed"),
    patrolAxis,
    patrolRange: propertyValue(object.properties, "patrolRange", 0),
    speed: propertyValue(object.properties, "speed", 12),
    originX: object.x,
    originY: object.y,
    direction: propertyValue<Direction>(object.properties, "direction", patrolAxis === "horizontal" ? "right" : "down"),
    frame: 1,
    animationTime: 0,
    patrolSign: 1,
    patrolPause: 0.45 + ((object.id * 37) % 80) / 100,
  };
}

function toScenery(object: TiledObject): SceneryObject {
  return {
    id: object.id,
    name: object.name,
    x: object.x,
    y: object.y,
    width: object.width,
    height: object.height,
    spriteId: propertyValue<ScenerySpriteId>(object.properties, "spriteId", "signal-tree"),
    anchorX: propertyValue(object.properties, "anchorX", object.width / 2),
    anchorY: propertyValue(object.properties, "anchorY", object.height),
    footprintX: propertyValue(object.properties, "footprintX", 0),
    footprintY: propertyValue(object.properties, "footprintY", object.height - 16),
    footprintWidth: propertyValue(object.properties, "footprintWidth", object.width),
    footprintHeight: propertyValue(object.properties, "footprintHeight", 16),
    blocksMovement: propertyValue(object.properties, "blocksMovement", true),
  };
}

function toNarrativeTrigger(object: TiledObject): NarrativeTrigger {
  return {
    id: object.id,
    x: object.x,
    y: object.y,
    width: object.width,
    height: object.height,
    dialogueId: propertyValue(object.properties, "dialogueId", "archive-awakening"),
    flag: propertyValue(object.properties, "flag", `narrative-${object.id}`),
  };
}

function parseEncounterEntries(source: string): EncounterEntry[] {
  const entries = source.split(",").map((entry) => {
    const [formationId, rawWeight] = entry.trim().split(":");
    const weight = Number(rawWeight);
    if (!formationId || !Number.isFinite(weight) || weight <= 0) return null;
    return { formationId: formationId as FormationId, weight };
  }).filter((entry): entry is EncounterEntry => entry !== null);
  return entries.length > 0 ? entries : [{ formationId: "prism-mite", weight: 1 }];
}

function toEncounterZone(object: TiledObject): EncounterZone {
  const minDistance = propertyValue(object.properties, "minDistance", 190);
  const maxDistance = Math.max(minDistance, propertyValue(object.properties, "maxDistance", 300));
  return {
    id: object.id,
    name: object.name,
    x: object.x,
    y: object.y,
    width: object.width,
    height: object.height,
    biome: propertyValue(object.properties, "biome", "unknown"),
    minDistance,
    maxDistance,
    entries: parseEncounterEntries(propertyValue(object.properties, "formations", "prism-mite:1")),
  };
}

export class MapLoader {
  private readonly cache = new Map<string, LoadedMap>();

  public reset(): void {
    this.cache.clear();
  }

  public async load(id: string): Promise<LoadedMap> {
    const cached = this.cache.get(id);
    if (cached) return cached;

    const file = MAP_FILES[id];
    if (!file) throw new Error(`Unknown map: ${id}`);

    const response = await fetch(`${import.meta.env.BASE_URL}assets/maps/${file}`);
    if (!response.ok) throw new Error(`Unable to load map: ${id}`);
    const source = await response.json() as TiledMap;
    this.validate(source, id);

    const tileLayers = new Map<string, TiledTileLayer>();
    source.layers.filter(isTileLayer).forEach((layer) => tileLayers.set(layer.name, layer));
    const objectLayers = source.layers.filter(isObjectLayer);
    const triggers = objectLayers.find((layer) => layer.name === "triggers")?.objects ?? [];
    const interactions = objectLayers.find((layer) => layer.name === "interactions")?.objects ?? [];
    const entities = objectLayers.find((layer) => layer.name === "entities")?.objects ?? [];
    const scenery = objectLayers.find((layer) => layer.name === "scenery")?.objects ?? [];
    const encounters = objectLayers.find((layer) => layer.name === "encounters")?.objects ?? [];
    const narrative = objectLayers.find((layer) => layer.name === "narrative")?.objects ?? [];

    const loaded: LoadedMap = {
      id,
      name: propertyValue(source.properties, "displayName", id.toUpperCase()),
      width: source.width,
      height: source.height,
      tileWidth: source.tilewidth,
      tileHeight: source.tileheight,
      tileLayers,
      transitions: triggers.map(toTransition),
      interactions: interactions.map(toInteraction),
      entities: entities.map(toEntity),
      scenery: scenery.map(toScenery),
      encounterZones: encounters.map(toEncounterZone),
      narrativeTriggers: narrative.map(toNarrativeTrigger),
    };
    this.cache.set(id, loaded);
    return loaded;
  }

  private validate(source: TiledMap, id: string): void {
    if (source.type !== "map" || source.orientation !== "orthogonal") {
      throw new Error(`Map ${id} is not an orthogonal Tiled map.`);
    }
    if (source.tilewidth !== 16 || source.tileheight !== 16) {
      throw new Error(`Map ${id} must use 16 × 16 tiles.`);
    }
    for (const layer of source.layers.filter(isTileLayer)) {
      if (layer.data.length !== source.width * source.height) {
        throw new Error(`Layer ${layer.name} in ${id} has invalid dimensions.`);
      }
    }
    if (!source.layers.some((layer) => layer.name === "ground")) {
      throw new Error(`Map ${id} has no ground layer.`);
    }
    if (!source.layers.some((layer) => layer.name === "collision")) {
      throw new Error(`Map ${id} has no collision layer.`);
    }
  }
}
