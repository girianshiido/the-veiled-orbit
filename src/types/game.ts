export type Direction = "down" | "left" | "right" | "up";
export type InputAction = Direction | "confirm" | "menu";

export interface Position {
  x: number;
  y: number;
}

export interface PlayerState extends Position {
  direction: Direction;
  frame: number;
  animationTime: number;
}

export type PartyMemberId = "ash" | "ione" | "nox" | "sera";
export type SpellId =
  | "arc-bolt"
  | "guard-pulse"
  | "flare-lance"
  | "solar-wave"
  | "radiant-edge"
  | "aurora-guard"
  | "nova-drive"
  | "mend"
  | "static-field"
  | "signal-break"
  | "renewal-wave"
  | "aegis-veil"
  | "deep-mend"
  | "archive-storm"
  | "restoration-wave"
  | "pulse-round"
  | "shock-round"
  | "scattershot"
  | "armor-piercer"
  | "overclock"
  | "breach-burst"
  | "rail-shot"
  | "zero-volley"
  | "quick-current"
  | "undertow-hex"
  | "pressure-veil"
  | "mending-tide"
  | "stillwater-field"
  | "tidal-aegis"
  | "low-tide"
  | "horizon-current";
export type BattleStatusId = "barrier" | "burn" | "shock" | "weaken" | "overclock" | "haste" | "slow";
export type EquipmentId =
  | "relay-blade"
  | "archive-rod"
  | "pulse-saber"
  | "ion-whip"
  | "field-suit"
  | "woven-mantle"
  | "guard-plate"
  | "signal-shield"
  | "echo-core"
  | "vault-edge"
  | "phase-lash"
  | "vault-aegis"
  | "memory-prism"
  | "starforged-saber"
  | "resonance-lash"
  | "arc-carbine"
  | "frontier-mail"
  | "phase-weave"
  | "storm-shield"
  | "relay-carbine"
  | "scout-coil"
  | "sun-edge"
  | "oracle-loop"
  | "storm-carbine"
  | "tower-aegis"
  | "tidebreaker-saber"
  | "mooncurrent-lash"
  | "harbor-carbine"
  | "pelagic-mail"
  | "current-weave"
  | "deepwater-aegis"
  | "harbor-disc"
  | "tidal-jacket"
  | "undertide-ring"
  | "cavern-weave"
  | "meridian-disc"
  | "meridian-guard"
  | "cipher-carbine" | "prism-lash" | "dawn-saber" | "horizon-disc" | "aurora-mantle"
  | "aeroweave-mail" | "vector-core" | "skyglass-guard"
  | "thunder-edge" | "ion-carbine" | "tempest-disc" | "pressure-mantle";
export type EnemyId =
  | "prism-mite"
  | "glint-hopper"
  | "dust-sentinel"
  | "vault-stalker"
  | "phase-warden"
  | "rift-hunter"
  | "storm-colossus"
  | "relay-wasp"
  | "circuit-hound"
  | "coil-knight"
  | "aegis-specter"
  | "signal-wraith"
  | "saltwire-crab"
  | "reef-drone"
  | "tidal-stalker"
  | "abyss-sentinel"
  | "burrow-maw"
  | "cave-skitter"
  | "blind-drake"
  | "rogue-borer" | "cipher-drone" | "archive-custodian"
  | "gale-drone" | "nimbus-shell" | "tempest-regent";
export type FormationId = EnemyId
  | "mite-cluster"
  | "glint-pair"
  | "dust-escort"
  | "stalker-pair"
  | "vault-guard"
  | "archive-guardian"
  | "core-wardens"
  | "rift-pack"
  | "storm-patrol"
  | "southern-onslaught"
  | "relay-swarm"
  | "tower-pack"
  | "coil-escort"
  | "control-patrol"
  | "relay-assault"
  | "control-legion"
  | "aegis-guard"
  | "aegis-command"
  | "signal-saboteur"
  | "reef-swarm"
  | "tidal-pack"
  | "southwake-patrol"
  | "skitter-nest"
  | "undertide-pack"
  | "deep-burrow"
  | "borer-escort" | "cipher-patrol" | "cipher-wing" | "cradle-warden"
  | "gale-flight" | "nimbus-patrol" | "weather-security";

export interface PartyMemberProgress {
  id: PartyMemberId;
  name: string;
  role: string;
  level: number;
  experience: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  agility: number;
  spells: SpellId[];
  equipment: EquipmentLoadout;
}

export interface EquipmentLoadout {
  weapon: EquipmentId | null;
  armor: EquipmentId | null;
  shield: EquipmentId | null;
  core: EquipmentId | null;
}

export interface PartyState {
  activeMemberIds: PartyMemberId[];
  roster: PartyMemberProgress[];
}

export interface InventoryState {
  credits: number;
  tonics: number;
  returnBeacons: number;
  transitBeacons: number;
  gear: EquipmentId[];
}

export interface SaveData {
  version: 13;
  mapId: string;
  player: Pick<PlayerState, "x" | "y" | "direction">;
  worldFlags: string[];
  party: PartyState;
  inventory: InventoryState;
  savedAt: number;
}

export interface TiledProperty {
  name: string;
  type: string;
  value: string | number | boolean;
}

export interface TiledTileLayer {
  id: number;
  name: string;
  type: "tilelayer";
  width: number;
  height: number;
  visible: boolean;
  data: number[];
}

export interface TiledObject {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties?: TiledProperty[];
}

export interface TiledObjectLayer {
  id: number;
  name: string;
  type: "objectgroup";
  visible: boolean;
  objects: TiledObject[];
}

export type TiledLayer = TiledTileLayer | TiledObjectLayer;

export interface TiledMap {
  type: "map";
  version: string;
  tiledversion: string;
  orientation: "orthogonal";
  renderorder: string;
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  properties?: TiledProperty[];
  layers: TiledLayer[];
}

export interface Transition {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  targetMap: string;
  targetX: number;
  targetY: number;
  targetOffsetX: number;
  targetOffsetY: number;
  targetDirection: Direction;
}

export type InteractionKind =
  | "message"
  | "cache"
  | "inn"
  | "item-shop"
  | "weapon-shop"
  | "armor-shop"
  | "save-shop"
  | "revival-shop"
  | "teleport"
  | "party-house"
  | "barrier"
  | "control-console";

export interface Interaction {
  id: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  kind: InteractionKind;
  text: string;
  restoredText?: string;
  dialogueId?: string;
  emptyText: string;
  flag: string;
  credits: number;
  tonics: number;
  returnBeacons: number;
  equipmentId: EquipmentId | null;
  price: number;
  destinationMap: string;
  destinationName: string;
  requiredFlag: string;
}

export interface MapEntity {
  id: number;
  name: string;
  x: number;
  y: number;
  spriteId: string;
  dialogueId: string;
  dialogueAfterFlag: string;
  dialogueAfterId: string;
  dialogueMiddleFlag: string;
  dialogueMiddleId: string;
  requiredFlag: string;
  hiddenFlag: string;
  battleFormation: FormationId | null;
  defeatFlag: string;
  escortFlag: string;
  victoryDialogueId: string;
  recruitMemberId: PartyMemberId | null;
  recruitFlag: string;
  travelMap: string;
  travelX: number;
  travelY: number;
  movement: "fixed" | "patrol";
  patrolAxis: "horizontal" | "vertical";
  patrolRange: number;
  speed: number;
  originX: number;
  originY: number;
  direction: Direction;
  frame: number;
  animationTime: number;
  patrolSign: -1 | 1;
  patrolPause: number;
}

export type ScenerySpriteId =
  | "signal-tree"
  | "lumen-study-tree"
  | "lumen-hd-memory"
  | "lumen-hd-transit"
  | "lumen-hd-inn"
  | "lumen-hd-item"
  | "lumen-hd-clinic"
  | "lumen-hd-armor"
  | "relay-pylon"
  | "echo-vault-pylon"
  | "garden-pavilion"
  | "hollow-inn"
  | "lumen-study-home"
  | "signal-market"
  | "lumen-study-shop"
  | "lumen-spire"
  | "aster-hd-memory"
  | "aster-hd-transit"
  | "aster-hd-inn"
  | "aster-hd-weapon"
  | "aster-hd-item"
  | "aster-hd-clinic"
  | "aster-hd-armor"
  | "vesper-hd-memory"
  | "vesper-hd-transit"
  | "vesper-hd-inn"
  | "vesper-hd-weapon"
  | "vesper-hd-item"
  | "vesper-hd-clinic"
  | "vesper-hd-armor"
  | "tideglass-hd-memory"
  | "tideglass-hd-transit"
  | "tideglass-hd-inn"
  | "tideglass-hd-weapon"
  | "tideglass-hd-item"
  | "tideglass-hd-clinic"
  | "tideglass-hd-armor"
  | "tideglass-hd-harbor"
  | "world-village"
  | "world-vault"
  | "world-tideglass"
  | "world-moonfall-array"
  | "world-control-tower-west"
  | "world-control-tower-central"
  | "world-control-tower-east";

export interface SceneryObject {
  id: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  spriteId: ScenerySpriteId;
  anchorX: number;
  anchorY: number;
  footprintX: number;
  footprintY: number;
  footprintWidth: number;
  footprintHeight: number;
  blocksMovement: boolean;
}

export interface NarrativeTrigger {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  dialogueId: string;
  flag: string;
}

export interface EncounterEntry {
  formationId: FormationId;
  weight: number;
}

export interface EncounterZone {
  id: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  biome: string;
  minDistance: number;
  maxDistance: number;
  entries: EncounterEntry[];
}

export interface LoadedMap {
  id: string;
  name: string;
  width: number;
  height: number;
  tileWidth: number;
  tileHeight: number;
  tileLayers: Map<string, TiledTileLayer>;
  transitions: Transition[];
  interactions: Interaction[];
  entities: MapEntity[];
  scenery: SceneryObject[];
  encounterZones: EncounterZone[];
  narrativeTriggers: NarrativeTrigger[];
}
