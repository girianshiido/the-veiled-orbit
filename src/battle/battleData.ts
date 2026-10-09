import type {
  EnemyId,
  FormationId,
  InventoryState,
  PartyMemberProgress,
  PartyState,
} from "../types/game";
import { createDefaultLoadout } from "../progression/equipmentData.ts";

export type { EnemyId } from "../types/game";
export type { FormationId } from "../types/game";

export type EnemyBattleTheme = "violet-grid" | "verdant-grid" | "amber-grid";
export type EnemyBehavior =
  | "disruptor"
  | "skirmisher"
  | "protector"
  | "predator"
  | "controller"
  | "piercer"
  | "artillery";

export interface EnemyDefinition {
  id: EnemyId;
  name: string;
  maxHp: number;
  attack: number;
  defense: number;
  agility: number;
  experience: number;
  credits: number;
  battleTheme: EnemyBattleTheme;
  accentColor: string;
  behavior: EnemyBehavior;
}

export const ENEMIES: Record<EnemyId, EnemyDefinition> = {
  "gale-drone": { id:"gale-drone",name:"GALE DRONE",maxHp:175,attack:40,defense:16,agility:30,experience:105,credits:115,battleTheme:"violet-grid",accentColor:"#7ddcf1",behavior:"disruptor" },
  "nimbus-shell": { id:"nimbus-shell",name:"NIMBUS SHELL",maxHp:245,attack:43,defense:24,agility:14,experience:135,credits:145,battleTheme:"violet-grid",accentColor:"#b5cfee",behavior:"protector" },
  "tempest-regent": { id:"tempest-regent",name:"TEMPEST REGENT",maxHp:980,attack:55,defense:25,agility:20,experience:900,credits:1200,battleTheme:"violet-grid",accentColor:"#8adeef",behavior:"artillery" },
  "cipher-drone": { id: "cipher-drone", name: "CIPHER DRONE", maxHp: 158, attack: 38, defense: 14, agility: 24, experience: 80, credits: 85, battleTheme: "amber-grid", accentColor: "#d4ae66", behavior: "disruptor" },
  "archive-custodian": { id: "archive-custodian", name: "ARCHIVE CUSTODIAN", maxHp: 760, attack: 50, defense: 23, agility: 12, experience: 520, credits: 600, battleTheme: "amber-grid", accentColor: "#70dfd2", behavior: "artillery" },
  "prism-mite": {
    id: "prism-mite",
    name: "PRISM MITE",
    maxHp: 28,
    attack: 9,
    defense: 3,
    agility: 7,
    experience: 8,
    credits: 11,
    battleTheme: "violet-grid",
    accentColor: "#9a5ee0",
    behavior: "disruptor",
  },
  "glint-hopper": {
    id: "glint-hopper",
    name: "GLINT HOPPER",
    maxHp: 22,
    attack: 8,
    defense: 2,
    agility: 14,
    experience: 7,
    credits: 9,
    battleTheme: "verdant-grid",
    accentColor: "#45d9b7",
    behavior: "skirmisher",
  },
  "dust-sentinel": {
    id: "dust-sentinel",
    name: "DUST SENTINEL",
    maxHp: 44,
    attack: 12,
    defense: 7,
    agility: 4,
    experience: 16,
    credits: 19,
    battleTheme: "amber-grid",
    accentColor: "#d19a5b",
    behavior: "protector",
  },
  "vault-stalker": {
    id: "vault-stalker",
    name: "VAULT STALKER",
    maxHp: 60,
    attack: 17,
    defense: 7,
    agility: 13,
    experience: 26,
    credits: 23,
    battleTheme: "violet-grid",
    accentColor: "#55dbc7",
    behavior: "predator",
  },
  "phase-warden": {
    id: "phase-warden",
    name: "PHASE WARDEN",
    maxHp: 86,
    attack: 20,
    defense: 11,
    agility: 7,
    experience: 40,
    credits: 32,
    battleTheme: "violet-grid",
    accentColor: "#d578d8",
    behavior: "controller",
  },
  "rift-hunter": {
    id: "rift-hunter",
    name: "RIFT HUNTER",
    maxHp: 110,
    attack: 26,
    defense: 14,
    agility: 15,
    experience: 32,
    credits: 34,
    battleTheme: "verdant-grid",
    accentColor: "#66d7a6",
    behavior: "piercer",
  },
  "storm-colossus": {
    id: "storm-colossus",
    name: "STORM COLOSSUS",
    maxHp: 168,
    attack: 31,
    defense: 20,
    agility: 7,
    experience: 54,
    credits: 52,
    battleTheme: "amber-grid",
    accentColor: "#e0aa5c",
    behavior: "artillery",
  },
  "relay-wasp": {
    id: "relay-wasp",
    name: "RELAY WASP",
    maxHp: 82,
    attack: 20,
    defense: 8,
    agility: 18,
    experience: 34,
    credits: 28,
    battleTheme: "verdant-grid",
    accentColor: "#61e4d1",
    behavior: "disruptor",
  },
  "circuit-hound": {
    id: "circuit-hound",
    name: "CIRCUIT HOUND",
    maxHp: 105,
    attack: 24,
    defense: 11,
    agility: 15,
    experience: 42,
    credits: 36,
    battleTheme: "violet-grid",
    accentColor: "#50c8c9",
    behavior: "predator",
  },
  "coil-knight": {
    id: "coil-knight",
    name: "COIL KNIGHT",
    maxHp: 150,
    attack: 28,
    defense: 18,
    agility: 7,
    experience: 58,
    credits: 50,
    battleTheme: "amber-grid",
    accentColor: "#c89152",
    behavior: "protector",
  },
  "aegis-specter": {
    id: "aegis-specter",
    name: "AEGIS SPECTER",
    maxHp: 172,
    attack: 30,
    defense: 16,
    agility: 20,
    experience: 72,
    credits: 68,
    battleTheme: "violet-grid",
    accentColor: "#9d6ae8",
    behavior: "controller",
  },
  "signal-wraith": {
    id: "signal-wraith",
    name: "SIGNAL WRAITH",
    maxHp: 260,
    attack: 34,
    defense: 20,
    agility: 14,
    experience: 130,
    credits: 140,
    battleTheme: "violet-grid",
    accentColor: "#be65dd",
    behavior: "artillery",
  },
  "saltwire-crab": {
    id: "saltwire-crab",
    name: "SALTWIRE CRAB",
    maxHp: 118,
    attack: 27,
    defense: 17,
    agility: 8,
    experience: 45,
    credits: 54,
    battleTheme: "verdant-grid",
    accentColor: "#56d8cf",
    behavior: "protector",
  },
  "reef-drone": {
    id: "reef-drone",
    name: "REEF DRONE",
    maxHp: 92,
    attack: 25,
    defense: 11,
    agility: 21,
    experience: 43,
    credits: 49,
    battleTheme: "verdant-grid",
    accentColor: "#69e4d3",
    behavior: "skirmisher",
  },
  "tidal-stalker": {
    id: "tidal-stalker",
    name: "TIDAL STALKER",
    maxHp: 146,
    attack: 31,
    defense: 15,
    agility: 17,
    experience: 61,
    credits: 66,
    battleTheme: "violet-grid",
    accentColor: "#4fd4ba",
    behavior: "predator",
  },
  "abyss-sentinel": {
    id: "abyss-sentinel",
    name: "ABYSS SENTINEL",
    maxHp: 205,
    attack: 34,
    defense: 23,
    agility: 6,
    experience: 86,
    credits: 92,
    battleTheme: "amber-grid",
    accentColor: "#a775d8",
    behavior: "artillery",
  },
  "burrow-maw": {
    id: "burrow-maw",
    name: "BURROW MAW",
    maxHp: 176,
    attack: 34,
    defense: 21,
    agility: 7,
    experience: 74,
    credits: 72,
    battleTheme: "amber-grid",
    accentColor: "#b89972",
    behavior: "protector",
  },
  "cave-skitter": {
    id: "cave-skitter",
    name: "CAVE SKITTER",
    maxHp: 108,
    attack: 29,
    defense: 12,
    agility: 25,
    experience: 58,
    credits: 55,
    battleTheme: "violet-grid",
    accentColor: "#65dbea",
    behavior: "skirmisher",
  },
  "blind-drake": {
    id: "blind-drake",
    name: "BLIND DRAKE",
    maxHp: 154,
    attack: 36,
    defense: 15,
    agility: 19,
    experience: 78,
    credits: 81,
    battleTheme: "verdant-grid",
    accentColor: "#d8cfb6",
    behavior: "predator",
  },
  "rogue-borer": {
    id: "rogue-borer",
    name: "ROGUE BORER",
    maxHp: 224,
    attack: 38,
    defense: 25,
    agility: 9,
    experience: 104,
    credits: 118,
    battleTheme: "amber-grid",
    accentColor: "#5ce0dc",
    behavior: "piercer",
  },
};

export interface FormationDefinition {
  id: FormationId;
  name: string;
  enemyIds: readonly EnemyId[];
  boss?: boolean;
}

export const FORMATIONS: Record<FormationId, FormationDefinition> = {
  "gale-drone": { id:"gale-drone",name:"GALE DRONE",enemyIds:["gale-drone"] },
  "nimbus-shell": { id:"nimbus-shell",name:"NIMBUS SHELL",enemyIds:["nimbus-shell"] },
  "tempest-regent": { id:"tempest-regent",name:"TEMPEST REGENT",enemyIds:["tempest-regent","gale-drone"],boss:true },
  "gale-flight": { id:"gale-flight",name:"GALE FLIGHT",enemyIds:["gale-drone","gale-drone"] },
  "nimbus-patrol": { id:"nimbus-patrol",name:"NIMBUS PATROL",enemyIds:["nimbus-shell","gale-drone"] },
  "weather-security": { id:"weather-security",name:"WEATHER SECURITY",enemyIds:["nimbus-shell","cipher-drone","gale-drone"] },
  "prism-mite": { id: "prism-mite", name: "PRISM MITE", enemyIds: ["prism-mite"] },
  "glint-hopper": { id: "glint-hopper", name: "GLINT HOPPER", enemyIds: ["glint-hopper"] },
  "dust-sentinel": { id: "dust-sentinel", name: "DUST SENTINEL", enemyIds: ["dust-sentinel"] },
  "vault-stalker": { id: "vault-stalker", name: "VAULT STALKER", enemyIds: ["vault-stalker"] },
  "phase-warden": { id: "phase-warden", name: "PHASE WARDEN", enemyIds: ["phase-warden"] },
  "rift-hunter": { id: "rift-hunter", name: "RIFT HUNTER", enemyIds: ["rift-hunter"] },
  "storm-colossus": { id: "storm-colossus", name: "STORM COLOSSUS", enemyIds: ["storm-colossus"] },
  "relay-wasp": { id: "relay-wasp", name: "RELAY WASP", enemyIds: ["relay-wasp"] },
  "circuit-hound": { id: "circuit-hound", name: "CIRCUIT HOUND", enemyIds: ["circuit-hound"] },
  "coil-knight": { id: "coil-knight", name: "COIL KNIGHT", enemyIds: ["coil-knight"] },
  "aegis-specter": { id: "aegis-specter", name: "AEGIS SPECTER", enemyIds: ["aegis-specter"] },
  "cipher-drone": { id: "cipher-drone", name: "CIPHER DRONE", enemyIds: ["cipher-drone"] },
  "cipher-patrol": { id: "cipher-patrol", name: "CIPHER PATROL", enemyIds: ["cipher-drone", "aegis-specter"] },
  "cipher-wing": { id: "cipher-wing", name: "CIPHER WING", enemyIds: ["cipher-drone", "cipher-drone", "relay-wasp"] },
  "archive-custodian": { id: "archive-custodian", name: "ARCHIVE CUSTODIAN", enemyIds: ["archive-custodian"], boss: true },
  "cradle-warden": { id: "cradle-warden", name: "CRADLE WARDEN", enemyIds: ["archive-custodian", "cipher-drone"], boss: true },
  "signal-wraith": { id: "signal-wraith", name: "SIGNAL WRAITH", enemyIds: ["signal-wraith"] },
  "saltwire-crab": { id: "saltwire-crab", name: "SALTWIRE CRAB", enemyIds: ["saltwire-crab"] },
  "reef-drone": { id: "reef-drone", name: "REEF DRONE", enemyIds: ["reef-drone"] },
  "tidal-stalker": { id: "tidal-stalker", name: "TIDAL STALKER", enemyIds: ["tidal-stalker"] },
  "abyss-sentinel": { id: "abyss-sentinel", name: "ABYSS SENTINEL", enemyIds: ["abyss-sentinel"] },
  "burrow-maw": { id: "burrow-maw", name: "BURROW MAW", enemyIds: ["burrow-maw"] },
  "cave-skitter": { id: "cave-skitter", name: "CAVE SKITTER", enemyIds: ["cave-skitter"] },
  "blind-drake": { id: "blind-drake", name: "BLIND DRAKE", enemyIds: ["blind-drake"] },
  "rogue-borer": { id: "rogue-borer", name: "ROGUE BORER", enemyIds: ["rogue-borer"] },
  "mite-cluster": {
    id: "mite-cluster",
    name: "PRISM CLUSTER",
    enemyIds: ["prism-mite", "prism-mite", "prism-mite"],
  },
  "glint-pair": {
    id: "glint-pair",
    name: "GLINT PAIR",
    enemyIds: ["glint-hopper", "glint-hopper"],
  },
  "dust-escort": {
    id: "dust-escort",
    name: "DUST ESCORT",
    enemyIds: ["dust-sentinel", "glint-hopper"],
  },
  "stalker-pair": {
    id: "stalker-pair",
    name: "STALKER PAIR",
    enemyIds: ["vault-stalker", "vault-stalker"],
  },
  "vault-guard": {
    id: "vault-guard",
    name: "VAULT GUARD",
    enemyIds: ["phase-warden", "vault-stalker"],
  },
  "archive-guardian": {
    id: "archive-guardian",
    name: "ARCHIVE GUARDIAN",
    enemyIds: ["phase-warden"],
    boss: true,
  },
  "core-wardens": {
    id: "core-wardens",
    name: "CORE WARDENS",
    enemyIds: ["phase-warden", "phase-warden"],
  },
  "rift-pack": {
    id: "rift-pack",
    name: "RIFT PACK",
    enemyIds: ["rift-hunter", "rift-hunter"],
  },
  "storm-patrol": {
    id: "storm-patrol",
    name: "STORM PATROL",
    enemyIds: ["storm-colossus", "rift-hunter"],
  },
  "southern-onslaught": {
    id: "southern-onslaught",
    name: "SOUTHERN ONSLAUGHT",
    enemyIds: ["rift-hunter", "storm-colossus", "rift-hunter"],
  },
  "relay-swarm": {
    id: "relay-swarm",
    name: "RELAY SWARM",
    enemyIds: ["relay-wasp", "relay-wasp"],
  },
  "tower-pack": {
    id: "tower-pack",
    name: "TOWER PACK",
    enemyIds: ["circuit-hound", "relay-wasp"],
  },
  "coil-escort": {
    id: "coil-escort",
    name: "COIL ESCORT",
    enemyIds: ["coil-knight", "relay-wasp"],
  },
  "control-patrol": {
    id: "control-patrol",
    name: "CONTROL PATROL",
    enemyIds: ["circuit-hound", "coil-knight"],
  },
  "relay-assault": {
    id: "relay-assault",
    name: "RELAY ASSAULT",
    enemyIds: ["circuit-hound", "relay-wasp", "relay-wasp"],
  },
  "control-legion": {
    id: "control-legion",
    name: "CONTROL LEGION",
    enemyIds: ["coil-knight", "circuit-hound", "relay-wasp"],
  },
  "aegis-guard": {
    id: "aegis-guard",
    name: "AEGIS GUARD",
    enemyIds: ["aegis-specter", "relay-wasp"],
  },
  "aegis-command": {
    id: "aegis-command",
    name: "AEGIS COMMAND",
    enemyIds: ["aegis-specter", "coil-knight"],
  },
  "signal-saboteur": {
    id: "signal-saboteur",
    name: "SIGNAL SABOTEUR",
    enemyIds: ["signal-wraith"],
    boss: true,
  },
  "reef-swarm": {
    id: "reef-swarm",
    name: "REEF SWARM",
    enemyIds: ["saltwire-crab", "reef-drone"],
  },
  "tidal-pack": {
    id: "tidal-pack",
    name: "TIDAL PACK",
    enemyIds: ["tidal-stalker", "reef-drone"],
  },
  "southwake-patrol": {
    id: "southwake-patrol",
    name: "SOUTHWAKE PATROL",
    enemyIds: ["abyss-sentinel", "saltwire-crab"],
  },
  "skitter-nest": {
    id: "skitter-nest",
    name: "SKITTER NEST",
    enemyIds: ["cave-skitter", "cave-skitter", "cave-skitter"],
  },
  "undertide-pack": {
    id: "undertide-pack",
    name: "UNDERTIDE PACK",
    enemyIds: ["blind-drake", "cave-skitter"],
  },
  "deep-burrow": {
    id: "deep-burrow",
    name: "DEEP BURROW",
    enemyIds: ["burrow-maw", "cave-skitter"],
  },
  "borer-escort": {
    id: "borer-escort",
    name: "BORER ESCORT",
    enemyIds: ["rogue-borer", "blind-drake"],
  },
};

export function createAsh(): PartyMemberProgress {
  return {
    id: "ash",
    name: "ASH",
    role: "PATHFINDER",
    level: 1,
    experience: 0,
    hp: 34,
    maxHp: 34,
    mp: 12,
    maxMp: 12,
    attack: 11,
    defense: 6,
    agility: 8,
    spells: ["arc-bolt"],
    equipment: createDefaultLoadout("ash"),
  };
}

export function createIone(): PartyMemberProgress {
  return {
    id: "ione",
    name: "IONE",
    role: "ARCHIVE ADEPT",
    level: 1,
    experience: 0,
    hp: 25,
    maxHp: 25,
    mp: 18,
    maxMp: 18,
    attack: 7,
    defense: 4,
    agility: 12,
    spells: ["mend"],
    equipment: createDefaultLoadout("ione"),
  };
}

export function createNox(): PartyMemberProgress {
  return {
    id: "nox",
    name: "NOX",
    role: "BRIDGE SCOUT",
    level: 1,
    experience: 0,
    hp: 30,
    maxHp: 30,
    mp: 10,
    maxMp: 10,
    attack: 9,
    defense: 5,
    agility: 14,
    spells: ["pulse-round"],
    equipment: createDefaultLoadout("nox"),
  };
}

export function createSera(): PartyMemberProgress {
  return {
    id: "sera",
    name: "SERA",
    role: "TIDAL WARDEN",
    level: 1,
    experience: 0,
    hp: 27,
    maxHp: 27,
    mp: 20,
    maxMp: 20,
    attack: 7,
    defense: 4,
    agility: 17,
    spells: ["quick-current"],
    equipment: createDefaultLoadout("sera"),
  };
}

export function createDefaultParty(): PartyState {
  return {
    activeMemberIds: ["ash"],
    roster: [createAsh()],
  };
}

export function createDefaultInventory(): InventoryState {
  return { credits: 0, tonics: 2, returnBeacons: 0, transitBeacons: 0, gear: ["echo-core"] };
}
