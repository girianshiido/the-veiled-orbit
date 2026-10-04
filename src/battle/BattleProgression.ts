import { experienceForNextLevel, grantExperience } from "../progression/levelData.ts";
import type { PartyMemberId, PartyMemberProgress, SpellId } from "../types/game";

export interface BattleResultMember {
  id: PartyMemberId;
  name: string;
  previousLevel: number;
  level: number;
  experience: number;
  earnedExperience: number;
  nextLevelExperience: number;
  learnedSpells: SpellId[];
}

export function applyVictoryProgress(
  members: readonly PartyMemberProgress[],
  experience: number,
): BattleResultMember[] {
  const survivors = members.filter((member) => member.hp > 0);
  const baseShare = survivors.length > 0 ? Math.floor(experience / survivors.length) : 0;
  let remainder = survivors.length > 0 ? experience % survivors.length : 0;
  return members.map((member) => {
    const previousLevel = member.level;
    const defeated = member.hp <= 0;
    const earnedExperience = defeated ? 0 : baseShare + (remainder-- > 0 ? 1 : 0);
    const advances = defeated ? [] : grantExperience(member, earnedExperience);
    return {
      id: member.id,
      name: member.name,
      previousLevel,
      level: member.level,
      experience: member.experience,
      earnedExperience,
      nextLevelExperience: experienceForNextLevel(member.level),
      learnedSpells: advances
        .map((advance) => advance.learnedSpell)
        .filter((spell): spell is SpellId => spell !== null),
    };
  });
}
