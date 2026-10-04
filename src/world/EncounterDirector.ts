import type { EncounterEntry, EncounterZone, FormationId, LoadedMap } from "../types/game";

const VESPER_NORTHERN_REINFORCEMENTS: Readonly<Record<string, readonly EncounterEntry[]>> = {
  "verdant-west": [
    { formationId: "mite-cluster", weight: 4 },
    { formationId: "glint-pair", weight: 3 },
    { formationId: "dust-escort", weight: 3 },
  ],
  "verdant-east": [
    { formationId: "dust-escort", weight: 4 },
    { formationId: "stalker-pair", weight: 2 },
    { formationId: "vault-guard", weight: 2 },
    { formationId: "glint-pair", weight: 2 },
  ],
};

export class EncounterDirector {
  private travelled = 0;
  private nextEncounter = Number.POSITIVE_INFINITY;
  private activeZone: EncounterZone | null = null;
  private activeZoneKey = "";
  private readonly random: () => number;

  constructor(random: () => number = Math.random) {
    this.random = random;
  }

  public update(
    map: LoadedMap,
    x: number,
    y: number,
    movedDistance: number,
    worldFlags: ReadonlySet<string> = new Set(),
  ): FormationId | null {
    const zone = map.encounterZones.find((candidate) => x >= candidate.x
      && x < candidate.x + candidate.width
      && y >= candidate.y
      && y < candidate.y + candidate.height) ?? null;
    const zoneKey = zone ? `${map.id}:${zone.id}` : "";
    if (zoneKey !== this.activeZoneKey) {
      this.activeZoneKey = zoneKey;
      this.activeZone = zone;
      this.reset();
    }
    if (!zone || movedDistance <= 0) return null;
    this.travelled += movedDistance;
    if (this.travelled < this.nextEncounter) return null;
    const reinforced = map.id === "glass-steppe" && worldFlags.has("village.vesper-crossing.visited")
      ? VESPER_NORTHERN_REINFORCEMENTS[zone.biome]
      : undefined;
    const formation = this.rollFormation(reinforced ?? zone.entries);
    this.reset();
    return formation;
  }

  public reset(): void {
    this.travelled = 0;
    this.nextEncounter = this.activeZone ? this.rollDistance(this.activeZone) : Number.POSITIVE_INFINITY;
  }

  private rollDistance(zone: EncounterZone): number {
    return zone.minDistance + this.random() * (zone.maxDistance - zone.minDistance);
  }

  private rollFormation(entries: readonly EncounterEntry[]): FormationId {
    const totalWeight = entries.reduce((total, entry) => total + entry.weight, 0);
    let roll = this.random() * totalWeight;
    for (const entry of entries) {
      roll -= entry.weight;
      if (roll < 0) return entry.formationId;
    }
    return entries[entries.length - 1]?.formationId ?? "prism-mite";
  }
}
