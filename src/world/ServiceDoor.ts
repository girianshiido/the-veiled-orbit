import type { Direction, Interaction } from "../types/game";

export const DOOR_ENTRY_MARGIN = 8;
// The activation band needs enough depth that a normal movement frame cannot
// jump from "too far" straight into the solid building footprint.
const DOOR_EXTERIOR_REACH = 5;
const DOOR_EXIT_GAP = 3;

export interface ServiceDoorThreshold {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export function serviceDoorThreshold(interaction: Interaction): ServiceDoorThreshold {
  return {
    left: interaction.x,
    right: interaction.x + interaction.width,
    top: interaction.y,
    bottom: interaction.y + interaction.height,
  };
}

export function isWithinServiceDoor(
  interaction: Interaction,
  footX: number,
  footY: number,
  approachDirection: Direction,
): boolean {
  const door = serviceDoorThreshold(interaction);
  // A service door is a one-way threshold: Ash may approach it from the
  // exterior below (including while sliding left or right along the facade),
  // but crossing the same pixels from inside the building must not open it.
  if (footY < door.bottom || footY > door.bottom + DOOR_EXTERIOR_REACH) return false;
  if (approachDirection === "up") {
    return footX >= door.left - DOOR_ENTRY_MARGIN
      && footX <= door.right + DOOR_ENTRY_MARGIN;
  }
  if (approachDirection === "right") {
    return footX >= door.left - DOOR_ENTRY_MARGIN && footX < door.left;
  }
  if (approachDirection === "left") {
    return footX > door.right && footX <= door.right + DOOR_ENTRY_MARGIN;
  }
  return false;
}

export function serviceDoorExitPosition(
  interaction: Interaction,
  playerWidth: number,
  footOffsetY: number,
): { x: number; y: number } {
  const door = serviceDoorThreshold(interaction);
  return {
    x: door.left + (door.right - door.left) / 2 - playerWidth / 2,
    y: door.bottom + DOOR_EXIT_GAP - footOffsetY,
  };
}

export function saveCounterExitPosition(
  interactions: readonly Interaction[],
  playerWidth: number,
  footOffsetY: number,
): { x: number; y: number } | null {
  const counter = interactions.find((interaction) => interaction.kind === "save-shop");
  return counter ? serviceDoorExitPosition(counter, playerWidth, footOffsetY) : null;
}
