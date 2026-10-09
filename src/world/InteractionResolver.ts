import type { Interaction, InventoryState } from "../types/game";
import { EQUIPMENT } from "../progression/equipmentData.ts";

export interface InteractionOutcome {
  speaker: string;
  text: string;
  changed: boolean;
}

export function resolveInteraction(
  interaction: Interaction,
  inventory: InventoryState,
  worldFlags: Set<string>,
): InteractionOutcome {
  if (interaction.kind === "control-console" || interaction.kind === "archive-authenticator") {
    if (worldFlags.has(interaction.flag)) {
      return { speaker: "CONTROL ARRAY", text: interaction.restoredText || "The restored array hums steadily. Southern transmission is stable.", changed: false };
    }
    if (interaction.requiredFlag && !worldFlags.has(interaction.requiredFlag)) {
      return { speaker: "CONTROL ARRAY", text: interaction.emptyText, changed: false };
    }
    worldFlags.add(interaction.flag);
    return { speaker: "CONTROL ARRAY", text: interaction.text, changed: true };
  }
  if (interaction.kind !== "cache") {
    return { speaker: "SYSTEM", text: interaction.text, changed: false };
  }
  if (interaction.requiredFlag && !worldFlags.has(interaction.requiredFlag)) {
    return { speaker: "CACHE", text: interaction.emptyText, changed: false };
  }
  if (worldFlags.has(interaction.flag)) {
    return { speaker: "CACHE", text: interaction.emptyText, changed: false };
  }

  inventory.credits += interaction.credits;
  inventory.tonics += interaction.tonics;
  inventory.returnBeacons += interaction.returnBeacons;
  if (interaction.equipmentId) inventory.gear.push(interaction.equipmentId);
  worldFlags.add(interaction.flag);
  const rewards = [
    interaction.credits > 0 ? `${interaction.credits} CREDITS` : "",
    interaction.tonics > 0 ? `${interaction.tonics} FIELD TONIC${interaction.tonics === 1 ? "" : "S"}` : "",
    interaction.returnBeacons > 0 ? `${interaction.returnBeacons} RETURN BEACON${interaction.returnBeacons === 1 ? "" : "S"}` : "",
    interaction.equipmentId ? EQUIPMENT[interaction.equipmentId].name : "",
  ].filter(Boolean).join(" · ");
  const text = rewards ? `${interaction.text} Acquired: ${rewards}.` : interaction.text;
  return { speaker: "CACHE", text, changed: true };
}
