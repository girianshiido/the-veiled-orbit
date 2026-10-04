export const MIRA_RESCUED_FLAG = "quest.mira-rescued";
export const MIRA_ESCORTING_FLAG = "quest.mira-escorting";
export const MIRA_HOME_FLAG = "quest.mira-home";
export const SOUTH_BRIDGE_OPEN_FLAG = "quest.south-bridge-open";

export function completeMiraEscort(worldFlags: Set<string>): boolean {
  if (!worldFlags.has(MIRA_ESCORTING_FLAG)) return false;
  worldFlags.delete(MIRA_ESCORTING_FLAG);
  worldFlags.add(MIRA_HOME_FLAG);
  worldFlags.add(SOUTH_BRIDGE_OPEN_FLAG);
  return true;
}
