import type { SceneryObject } from "../types/game";
import type { CollisionRect } from "./ActorCollision";
import { rectanglesOverlap } from "./ActorCollision.ts";

export function sceneryFootprintRect(object: SceneryObject): CollisionRect {
  return {
    left: object.x + object.footprintX,
    top: object.y + object.footprintY,
    right: object.x + object.footprintX + object.footprintWidth,
    bottom: object.y + object.footprintY + object.footprintHeight,
  };
}

export function sceneryBlocksFeet(
  object: SceneryObject,
  feet: CollisionRect,
): boolean {
  // World-map villages are entered through transition zones spanning all four
  // sides. Their illustration must therefore never trap a player spawned
  // immediately beside it after leaving the village.
  if (object.blocksMovement === false) return false;
  const footprint = sceneryFootprintRect(object);
  // The service menu opens while Ash's feet are still immediately outside
  // the threshold. The building footprint therefore remains solid everywhere,
  // including at the painted doorway, so it can never be crossed backwards.
  return rectanglesOverlap(feet, footprint);
}
