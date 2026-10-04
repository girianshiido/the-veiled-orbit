import type { PartyMemberId, PartyMemberProgress, SpellId } from "../types/game";

export interface LevelAdvance {
  level: number;
  hpGain: number;
  mpGain: number;
  attackGain: number;
  defenseGain: number;
  agilityGain: number;
  learnedSpell: SpellId | null;
}

const SPELL_MILESTONES: Record<PartyMemberId, Readonly<Partial<Record<number, SpellId>>>> = {
  ash: {
    3: "guard-pulse", 6: "flare-lance", 11: "solar-wave",
    16: "radiant-edge", 20: "aurora-guard", 25: "nova-drive",
  },
  ione: {
    2: "static-field", 5: "signal-break", 9: "renewal-wave", 13: "aegis-veil",
    17: "deep-mend", 21: "archive-storm", 25: "restoration-wave",
  },
  nox: {
    3: "shock-round", 6: "scattershot", 10: "armor-piercer", 14: "overclock",
    18: "breach-burst", 22: "rail-shot", 25: "zero-volley",
  },
  sera: {
    3: "undertow-hex", 7: "pressure-veil", 11: "mending-tide",
    15: "stillwater-field", 19: "tidal-aegis", 23: "low-tide", 25: "horizon-current",
  },
};

export interface CharacterLevelStats {
  maxHp: number;
  maxMp: number;
  attack: number;
  defense: number;
  agility: number;
}

export function statsForLevel(memberId: PartyMemberId, level: number): CharacterLevelStats {
  const current = Math.max(1, Math.floor(level));
  const steps = current - 1;
  if (memberId === "ash") return {
    maxHp: 34 + steps * 5 + Math.floor(steps / 3),
    maxMp: 12 + steps * 2 + Math.floor(steps / 4),
    attack: 11 + steps + Math.floor(steps / 4),
    defense: 6 + Math.floor(current / 2) + Math.floor(steps / 7),
    agility: 8 + steps,
  };
  if (memberId === "ione") return {
    maxHp: 25 + steps * 4,
    maxMp: 18 + steps * 3 + Math.floor(steps / 3),
    attack: 7 + steps + Math.floor(steps / 8),
    defense: 4 + Math.floor(current / 2),
    agility: 12 + steps + Math.floor(steps / 4),
  };
  if (memberId === "nox") return {
    maxHp: 30 + steps * 4 + Math.floor(steps / 5),
    maxMp: 10 + steps * 2 + Math.floor(steps / 4),
    attack: 9 + steps + Math.floor(steps / 3),
    defense: 5 + Math.floor(current / 2),
    agility: 14 + steps + Math.floor(steps / 3),
  };
  return {
    maxHp: 27 + steps * 3 + Math.floor(steps / 3),
    maxMp: 20 + steps * 3 + Math.floor(steps / 3),
    attack: 7 + Math.floor(steps * 3 / 4),
    defense: 4 + Math.floor(current / 2),
    agility: 17 + steps + Math.floor(steps / 4),
  };
}

export function knownSpellsAtLevel(memberId: PartyMemberId, level: number): SpellId[] {
  const startingSpell: Record<PartyMemberId, SpellId> = {
    ash: "arc-bolt",
    ione: "mend",
    nox: "pulse-round",
    sera: "quick-current",
  };
  const learned = Object.entries(SPELL_MILESTONES[memberId])
    .filter(([milestone]) => Number(milestone) <= level)
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([, spell]) => spell)
    .filter((spell): spell is SpellId => !!spell);
  return [startingSpell[memberId], ...learned];
}

export function experienceForNextLevel(level: number): number {
  const current = Math.max(1, level);
  return current * 18 + (current - 1) ** 2;
}

export function grantExperience(member: PartyMemberProgress, amount: number): LevelAdvance[] {
  member.experience += Math.max(0, amount);
  const advances: LevelAdvance[] = [];
  while (member.experience >= experienceForNextLevel(member.level)) {
    member.experience -= experienceForNextLevel(member.level);
    const advance = advanceLevel(member);
    advances.push(advance);
  }
  return advances;
}

function advanceLevel(member: PartyMemberProgress): LevelAdvance {
  const previousStats = statsForLevel(member.id, member.level);
  member.level += 1;
  const nextStats = statsForLevel(member.id, member.level);
  const hpGain = nextStats.maxHp - previousStats.maxHp;
  const mpGain = nextStats.maxMp - previousStats.maxMp;
  const attackGain = nextStats.attack - previousStats.attack;
  const defenseGain = nextStats.defense - previousStats.defense;
  const agilityGain = nextStats.agility - previousStats.agility;
  member.maxHp = nextStats.maxHp;
  member.maxMp = nextStats.maxMp;
  member.attack = nextStats.attack;
  member.defense = nextStats.defense;
  member.agility = nextStats.agility;
  member.hp = member.maxHp;
  member.mp = member.maxMp;
  const learnedSpell = SPELL_MILESTONES[member.id][member.level] ?? null;
  if (learnedSpell && !member.spells.includes(learnedSpell)) member.spells.push(learnedSpell);
  return {
    level: member.level,
    hpGain,
    mpGain,
    attackGain,
    defenseGain,
    agilityGain,
    learnedSpell,
  };
}
