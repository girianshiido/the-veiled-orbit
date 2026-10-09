/** Rebuild derived seals from persistent switches and archive evidence. */
export function synchronizeCentralQuestFlags(flags: Set<string>): void {
  if (flags.has("relay.central-west-online") && flags.has("relay.central-east-online")) {
    flags.add("relay.central-gate-open");
  }
  if (flags.has("weather.pressure-stable") && flags.has("weather.charge-stable")) {
    flags.add("weather.eye-open");
  }
  if (["crown.foundation-read", "crown.evacuation-read", "crown.override-read"].every((flag) => flags.has(flag))) {
    flags.add("crown.evidence-complete");
  }
}

export function centralChapterDialogue(spriteId: string, flags: ReadonlySet<string>): string | null {
  if (spriteId !== "vesper-engineer") return null;
  if (flags.has("quest.crown-command-restored")) return "rhea-crown-after";
  if (flags.has("quest.weather-record-recovered")) return "rhea-weather-after";
  if (flags.has("quest.launch-cradle-online")) return "rhea-cradle-after";
  if (flags.has("quest.central-archive-read")) return "rhea-archive-after";
  if (flags.has("array.meridian-core-read")) return "rhea-meridian-key";
  return null;
}
