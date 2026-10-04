import type { MapEntity } from "../types/game";

export function nearestInteractionEntity(
  entities: readonly MapEntity[],
  centerX: number,
  centerY: number,
  maximumDistance = 24,
): MapEntity | undefined {
  return entities
    .filter((entity) => entity.spriteId !== "cradle-shuttle" || centerY >= entity.y + 16)
    .map((entity) => ({
      entity,
      distance: Math.hypot(centerX - (entity.x + 8), centerY - (entity.y + 8)),
    }))
    .filter((candidate) => candidate.distance <= maximumDistance)
    .sort((left, right) => left.distance - right.distance)[0]?.entity;
}
