import type { MapEntity } from "../types/game";

export function isMapEntityVisible(entity: MapEntity, worldFlags: ReadonlySet<string>): boolean {
  if (entity.requiredFlag && !worldFlags.has(entity.requiredFlag)) return false;
  if (entity.hiddenFlag && worldFlags.has(entity.hiddenFlag)) return false;
  return true;
}
