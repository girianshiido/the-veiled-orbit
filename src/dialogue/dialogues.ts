import { WEATHER_DIALOGUES } from './weatherDialogues.ts';
import { CROWN_DIALOGUES } from './crownDialogues.ts';

export interface DialogueChoice {
  label: string;
  next?: string;
  close?: boolean;
  cancelCallback?: boolean;
}

export interface DialogueNode {
  id: string;
  speaker: string;
  text: string;
  next?: string;
  choices?: DialogueChoice[];
}

export const DIALOGUES: Readonly<Record<string, DialogueNode>> = {
  ...WEATHER_DIALOGUES,
  ...CROWN_DIALOGUES,
  "meridian-key-recovered": { id: "meridian-key-recovered", speaker: "NOX", text: "This is not another damaged relay. It is an authorization key for the sealed tower beside Vesper Crossing. I can copy its carrier without shutting down the basin.", next: "meridian-key-route" },
  "meridian-key-route": { id: "meridian-key-route", speaker: "SERA", text: "Then the guarded tower is our next stop. Ors can take us back across the water, or we can use a Transit Beacon outside the array. Tell Rhea what we found." },
  "cairn-provost-key": { id: "cairn-provost-key", speaker: "PROVOST HALE", text: "The Meridian key? Our records call the central tower a shelter archive. Take the signal back to Vesper Crossing. Whatever damaged our array may have been trying to keep that archive closed." },
  "cairn-reader-key": { id: "cairn-reader-key", speaker: "SIGNAL READER YORI", text: "The key broadcasts on the same carrier as the northern control towers. The central guards should recognize it. You can return here freely; the basin route remains open." },
  "rhea-meridian-key": { id: "rhea-meridian-key", speaker: "ENGINEER RHEA", text: "That carrier is genuine! The central guards can finally release their seal. Inside, restart both gallery relays before climbing to the archives. Their security machines will not recognize you as friendly." },
  "central-guard-cleared": { id: "central-guard-cleared", speaker: "CENTRAL GUARD", text: "The Meridian carrier matches our orders. The upper passage is open. We will hold this vestibule; no security machines can cross it. Be careful beyond the stairs." },
  "central-guard-after": { id: "central-guard-after", speaker: "CENTRAL GUARD", text: "The archive has stopped broadcasting its alarm. Rhea is waiting in Vesper Crossing. The vestibule remains safe if you need to turn back." },
  "central-gallery-entry": { id: "central-gallery-entry", speaker: "NOX", text: "Two relay locks, one on each side. We need both online to open the upper seal. The side lockers may still hold equipment. A Return Beacon will extract us all the way outside, from any floor." },
  "central-archive-entry": { id: "central-archive-entry", speaker: "IONE", text: "These are evacuation records, not weapons plans. Someone has overwritten every living settlement with a hostile identifier. The sabotage was meant to turn the towers against their own people." },
  "central-core-entry": { id: "central-core-entry", speaker: "SERA", text: "The carrier is stronger here. That guardian is linked to the final seal. We can still retreat, but we cannot reach the core until it stands down." },
  "archive-custodian-challenge": { id: "archive-custodian-challenge", speaker: "ARCHIVE CUSTODIAN", text: "UNREGISTERED LIFE SIGNS. ARCHIVE LOCKDOWN. PURGE ORDER ACTIVE.", next: "archive-custodian-warning" },
  "archive-custodian-warning": { id: "archive-custodian-warning", speaker: "NOX", text: "Its orders have been rewritten. Watch the sphere in its chest: when it begins to overload, defend. We need to disable its weapon loop without destroying the memory core." },
  "archive-custodian-defeated": { id: "archive-custodian-defeated", speaker: "ARCHIVE CUSTODIAN", text: "PURGE LOOP DISCONNECTED. MERIDIAN AUTHORIZATION ACCEPTED. SURVIVOR RECORDS PRESERVED.", next: "archive-custodian-core-open" },
  "archive-custodian-core-open": { id: "archive-custodian-core-open", speaker: "ASH", text: "Survivors? Of what? The seal is down. Let us read the terminal before anything else can rewrite it." },
  "central-archive-revelation": { id: "central-archive-revelation", speaker: "ARCHIVE CORE", text: "EVACUATION NETWORK: FIVE SETTLEMENTS ACTIVE. LAUNCH CRADLE: DORMANT. COMMAND ROUTE: RECOVERABLE. PURGE ORDER: EXTERNAL ORIGIN.", next: "central-archive-nox" },
  "central-archive-nox": { id: "central-archive-nox", speaker: "NOX", text: "The towers were built to protect the towns. The same false order hit the west relay, the east relay and this guardian. Whoever sent it needed the launch cradle to stay silent.", next: "central-archive-sera" },
  "central-archive-sera": { id: "central-archive-sera", speaker: "SERA", text: "I have seen that cradle mark on a chart of Southwake's outer cliffs. It was listed as an abandoned observatory. Copy the route. Rhea can help us understand what still needs power." },
  "rhea-archive-after": { id: "rhea-archive-after", speaker: "ENGINEER RHEA", text: "The archive carrier opens the old road west of Tideglass Harbor. Follow Windscar Cliffs to the abandoned launch works.", next: "rhea-cradle-instructions" },
  "rhea-cradle-instructions": { id: "rhea-cradle-instructions", speaker: "ENGINEER RHEA", text: "Find a magnetic coupler in the western service rooms, then reconnect the central reactor. An armed keeper still guards the hangar." },
  "rhea-cradle-after": { id: "rhea-cradle-after", speaker: "ENGINEER RHEA", text: "Skyglass is answering again! The shuttle connects isolated stations on Nydra; it cannot leave the planet.", next: "rhea-skyglass-signal" },
  "rhea-skyglass-signal": { id: "rhea-skyglass-signal", speaker: "ENGINEER RHEA", text: "If the purge order came from above the storms, the relay's observers may have seen its source. Keep that route open." },
  "windscar-arrival": { id: "windscar-arrival", speaker: "SERA", text: "Windscar Cliffs. The old observatory lies beyond the switchbacks. The archive carrier should open its seal. Stay above the sea." },
  "windscar-surveyor": { id: "windscar-surveyor", speaker: "SURVEYOR DAIN", text: "They called it an observatory, but I found landing lights under the dust. Follow the shelf east, then north.", next: "windscar-surveyor-coupler" },
  "windscar-surveyor-coupler": { id: "windscar-surveyor-coupler", speaker: "SURVEYOR DAIN", text: "The seal answers to the central archive. A spare magnetic coupler may remain in the western service lockers." },
  "cradle-workshop-arrival": { id: "cradle-workshop-arrival", speaker: "NOX", text: "No power at the lift. Find a magnetic coupler in the western rooms, then I can connect the reactor in the middle.", next: "cradle-workshop-retreat" },
  "cradle-workshop-retreat": { id: "cradle-workshop-retreat", speaker: "NOX", text: "Search the other lockers too. A Return Beacon will take us outside the entire works, not just down one floor." },
  "cradle-reactor-online": { id: "cradle-reactor-online", speaker: "NOX", text: "The coupling is stable. The hangar lift is awake. Its keeper still has power, so rest before going up. We can always turn back." },
  "cradle-hangar-arrival": { id: "cradle-hangar-arrival", speaker: "IONE", text: "A shuttle... and another corrupted keeper, with a drone supporting it. Disable them to reach the flight computer behind the seal." },
  "cradle-warden-challenge": { id: "cradle-warden-challenge", speaker: "CRADLE WARDEN", text: "FLIGHT ACCESS REVOKED. PURGE ORDER ACTIVE. NO SURVIVORS MAY DEPART.", next: "cradle-warden-warning" },
  "cradle-warden-warning": { id: "cradle-warden-warning", speaker: "NOX", text: "The drone is covering it. Cut that support first. When the keeper prepares PHASE NOVA, defend before the next pulse." },
  "cradle-warden-defeated": { id: "cradle-warden-defeated", speaker: "CRADLE WARDEN", text: "WEAPON LOOP DISCONNECTED. ARCHIVE CARRIER ACCEPTED. FLIGHT-CONTROL DECK RELEASED." },
  "cradle-shuttle-dormant": { id: "cradle-shuttle-dormant", speaker: "NOX", text: "The hull is intact. Use the flight computer on the eastern deck; the archive copy should release its route." },
  "cradle-flight-restored": { id: "cradle-flight-restored", speaker: "FLIGHT COMPUTER", text: "ARCHIVE ROUTE ACCEPTED. DESTINATION: SKYGLASS RELAY. ATMOSPHERIC CORRIDOR CLEAR. RETURN ROUTE STORED.", next: "cradle-flight-ready" },
  "cradle-flight-ready": { id: "cradle-flight-ready", speaker: "SERA", text: "Skyglass stands above the storm belt. The shuttle can take us there and back for free. Board from the southern ramp when ready." },
  "board-skyglass-shuttle": { id: "board-skyglass-shuttle", speaker: "FLIGHT COMPUTER", text: "Fly to Skyglass Relay? The return route remains available. No credits required.", choices: [{ label: "Fly to Skyglass" }, { label: "Not yet", close: true, cancelCallback: true }] },
  "board-cradle-return-shuttle": { id: "board-cradle-return-shuttle", speaker: "FLIGHT COMPUTER", text: "Return to the Launch Cradle on Southwake? The passage is free.", choices: [{ label: "Return to Southwake" }, { label: "Not yet", close: true, cancelCallback: true }] },
  "skyglass-arrival": { id: "skyglass-arrival", speaker: "ASH", text: "A town above the clouds... There are people here. And their beacon is still working.", next: "skyglass-arrival-keeper" },
  "skyglass-arrival-keeper": { id: "skyglass-arrival-keeper", speaker: "RELAY KEEPER ELIAN", text: "Welcome to Skyglass. You reopened our supply route. Use our archive, beds and clinic; this deck is safe.", next: "skyglass-arrival-transit" },
  "skyglass-arrival-transit": { id: "skyglass-arrival-transit", speaker: "RELAY KEEPER ELIAN", text: "The transit beacon connects to the lower towns. You can also return by shuttle whenever you wish." },
  "skyglass-keeper": { id: "skyglass-keeper", speaker: "RELAY KEEPER ELIAN", text: "The launch works fell silent with the false purge order. We could see the towns' lights but could not reach them.", next: "skyglass-keeper-services" },
  "skyglass-keeper-services": { id: "skyglass-keeper-services", speaker: "RELAY KEEPER ELIAN", text: "Your shuttle crosses the storm belt in either direction. Our memory archive is free. Save there before another expedition." },
  "skyglass-observer": { id: "skyglass-observer", speaker: "OBSERVER SEN", text: "The purge carrier passed through the weather dome. Reopening our supply route let me find a quiet corridor along the eastern ridge.", next: "skyglass-observer-records" },
  "skyglass-observer-records": { id: "skyglass-observer-records", speaker: "OBSERVER SEN", text: "Take the eastern road. Restore both dome regulators to reach its command record. Whoever sent that signal knew our entire shelter network." },
  "skyglass-technician": { id: "skyglass-technician", speaker: "TECHNICIAN MARA", text: "Our transit beacon links to the towns you know. Now their gates and your Transit Beacons can bring you back here.", next: "skyglass-technician-shuttle" },
  "skyglass-technician-shuttle": { id: "skyglass-technician-shuttle", speaker: "TECHNICIAN MARA", text: "The shuttle stays on the landing deck, even if you teleport away. Its return route to Southwake is always available." },
  "lumen-arrival": {
    id: "lumen-arrival",
    speaker: "IONE",
    text: "Lumen Hollow. The old survey routes still converge here. We should rest, resupply, and ask what crossed the eastern sky.",
  },
  "hollow-host": {
    id: "hollow-host",
    speaker: "HOST MAREN",
    text: "The resonance beds still remember how a healthy traveller should sound. Twelve credits buys a quiet night.",
    choices: [
      { label: "Ask about the Hollow", next: "hollow-host-history" },
      { label: "Goodbye", close: true },
    ],
  },
  "hollow-host-history": {
    id: "hollow-host-history",
    speaker: "HOST MAREN",
    text: "We built beneath the lumen spire after the glass storms buried the northern road. Its signal keeps the worst things distant.",
  },
  "glass-smith": {
    id: "glass-smith",
    speaker: "SMITH ORREN",
    text: "Vault dust on your boots, relay light on your blade... You are following a route that should not exist anymore.",
    choices: [
      { label: "What did you see?", next: "glass-smith-sky" },
      { label: "Leave", close: true },
    ],
  },
  "glass-smith-sky": {
    id: "glass-smith-sky",
    speaker: "SMITH ORREN",
    text: "A silent flare crossed the eastern sky three nights ago. The spire answered it with a voice no one here understood.",
  },
  "wind-child": {
    id: "wind-child",
    speaker: "TAVI",
    text: "If you stand beside the spire at dusk, the lights above it form a path. Maren says it is only old machinery. I do not believe her.",
  },
  "surveyor-leth": {
    id: "surveyor-leth",
    speaker: "SURVEYOR LETH",
    text: "The miniature sites beyond the gate are more than landmarks. Their old beacons still tell our instruments where each road begins.",
  },
  "rook-walker": {
    id: "rook-walker",
    speaker: "ROOK",
    text: "I patrol the lower street when the glass wind rises. Keep to the marked road and the village signal will guide you home.",
  },
  "lumen-botanist": {
    id: "lumen-botanist",
    speaker: "BOTANIST VALE",
    text: "The roots beneath Lumen Hollow are growing through buried circuits. They do not merely consume the old machines; sometimes they make them answer.",
  },
  "aster-arrival": {
    id: "aster-arrival",
    speaker: "ASH",
    text: "Aster Reach. Its beacon answers Lumen Hollow cleanly; someone here may know why the old routes are waking.",
  },
  "aster-elder": {
    id: "aster-elder",
    speaker: "ELDER SIRA",
    text: "Our village watches the glass basin. The old tower beyond the ridge began shining again when the eastern signal appeared.",
  },
  "aster-runner": {
    id: "aster-runner",
    speaker: "PELL",
    text: "The transit gate is faster than walking, but the capacitors charge twenty-five credits for every passage.",
  },
  "vesper-arrival": {
    id: "vesper-arrival",
    speaker: "ASH",
    text: "Vesper Crossing. That bridge was built to contain the southern signals, not merely to cross the water.",
  },
  "vesper-warden": {
    id: "vesper-warden",
    speaker: "WARDEN MAE",
    text: "The bridge admits one narrow route. If the sentinels gather behind you, keep moving until our beacon takes hold.",
  },
  "vesper-scout": {
    id: "vesper-scout",
    speaker: "NOX",
    text: "The northern fields breed mites. South of the bridge, the old war machines hunt in coordinated pairs.",
  },
  "vesper-control-engineer": {
    id: "vesper-control-engineer",
    speaker: "ENGINEER RHEA",
    text: "Two control towers have stopped carrying the southern transmission. Start with the western tower. Its circuits are older, and Nox knows their field language.",
  },
  "vesper-control-engineer-east": {
    id: "vesper-control-engineer-east",
    speaker: "ENGINEER RHEA",
    text: "The western carrier is stable again. The eastern tower is answering with a hostile signal now. Expect stronger machines inside.",
  },
  "vesper-control-engineer-complete": {
    id: "vesper-control-engineer-complete",
    speaker: "ENGINEER RHEA",
    text: "Both outer towers are synchronized. The southern channel is clear, but the central tower remains under guard. Leave it alone for now.",
  },
  "vesper-boatman": {
    id: "vesper-boatman",
    speaker: "BOATMAN ORS",
    text: "I own a boat. A good one. That is all I have to say while the southern transmission keeps tearing compasses apart.",
  },
  "vesper-boatman-ready": {
    id: "vesper-boatman-ready",
    speaker: "BOATMAN ORS",
    text: "The channel is quiet again. My boat is waiting on the southern shore beyond the three towers. Step aboard when you are ready.",
  },
  "board-southern-ferry": {
    id: "board-southern-ferry",
    speaker: "ASH",
    text: "Boatman Ors waits at the guidance console. Cross to Southwake Isle? The passage is free.",
    choices: [
      { label: "Cross the sea" },
      { label: "Not yet", close: true, cancelCallback: true },
    ],
  },
  "central-tower-guard": {
    id: "central-tower-guard",
    speaker: "CONTROL GUARD",
    text: "The central tower is under planetary authority. You may enter the vestibule, but you will go no farther.",
  },
  "west-control-summit": {
    id: "west-control-summit",
    speaker: "NOX",
    text: "There is the carrier array. Give me a moment at the console and I can rebuild its transmission sequence.",
  },
  "east-control-summit": {
    id: "east-control-summit",
    speaker: "IONE",
    text: "The interference has a deliberate pattern. Something at the summit is not merely feeding on the signal — it is sabotaging it.",
  },
  "signal-saboteur": {
    id: "signal-saboteur",
    speaker: "UNKNOWN SIGNAL",
    text: "OUTER CONTROL WILL FAIL. SOUTHERN PASSAGE WILL REMAIN CLOSED. WITNESSES WILL BE ERASED.",
  },
  "signal-saboteur-defeated": {
    id: "signal-saboteur-defeated",
    speaker: "IONE",
    text: "It was linked to both failures. Whatever sent it did not want anyone crossing the southern sea.",
  },
  "southern-island-arrival": {
    id: "southern-island-arrival",
    speaker: "ASH",
    text: "Southwake Isle. The old road divides around the central ridge, and a harbor signal is answering to the northwest.",
  },
  "board-northern-return-ferry": {
    id: "board-northern-return-ferry",
    speaker: "NOX",
    text: "Boatman Ors answers through the guidance link. Cross to the northern island? The passage is free.",
    choices: [
      { label: "Cross the sea" },
      { label: "Not yet", close: true, cancelCallback: true },
    ],
  },
  "tideglass-arrival": {
    id: "tideglass-arrival",
    speaker: "IONE",
    text: "Tideglass Harbor. Every beacon is stable except one: the signal east of town keeps falling out of phase.",
    next: "tideglass-arrival-2",
  },
  "tideglass-arrival-2": {
    id: "tideglass-arrival-2",
    speaker: "ASH",
    text: "And someone important is missing. We should ask who went after that signal before we approach it ourselves.",
  },
  "tideglass-harbor-master": {
    id: "tideglass-harbor-master",
    speaker: "HARBOR MASTER ORLA",
    text: "Captain Sera Venn keeps every tidal beacon on Southwake aligned. When the Moonfall Array began skipping pulses, she left to inspect its entrance herself.",
    next: "tideglass-harbor-master-2",
  },
  "tideglass-harbor-master-2": {
    id: "tideglass-harbor-master-2",
    speaker: "HARBOR MASTER ORLA",
    text: "Sera is our warden, our best explorer, and the reason half these docks survived the last signal storm. If she has not returned, the Array is worse than we feared.",
  },
  "tideglass-cartographer": {
    id: "tideglass-cartographer",
    speaker: "CARTOGRAPHER EDDA",
    text: "The Moonfall Array lies beyond the eastern ridge. Captain Venn took the direct pass, but the southern loop is safer if the reef machines gather in force.",
  },
  "tideglass-beacon-keeper": {
    id: "tideglass-beacon-keeper",
    speaker: "BEACON KEEPER NEMI",
    text: "Sera can hear a failing beacon before my instruments register it. She said the Array sounded frightened, then she took her field pack and left.",
  },
  "tideglass-dockhand": {
    id: "tideglass-dockhand",
    speaker: "DOCKHAND VARRO",
    text: "The automated ferry stays at the southern landing. It will carry you north whenever you need it; no fare while the tower channel remains open.",
  },
  "sera-entrance": {
    id: "sera-entrance",
    speaker: "SERA VENN",
    text: "The surface road did not merely collapse. The central ridge shifted over it. These maintenance galleries are now the only route to the western basin.",
    next: "sera-entrance-2",
  },
  "sera-entrance-2": {
    id: "sera-entrance-2",
    speaker: "SERA VENN",
    text: "The tremors reopened Undertide Passage, but everything living below has moved into its conduits. I need a team that can keep several creatures occupied at once.",
    next: "sera-entrance-3",
  },
  "sera-entrance-3": {
    id: "sera-entrance-3",
    speaker: "SERA VENN",
    text: "Your house beacon is registered in Lumen Hollow. I will meet you there. If you add me to the formation, my returning disc can sweep an entire hostile group.",
  },
  "sera-after-recruit": {
    id: "sera-after-recruit",
    speaker: "TIDEGLASS MARKER",
    text: "Sera's survey marker points through the reopened western maintenance gate.",
  },
  "undertide-entry": {
    id: "undertide-entry",
    speaker: "IONE",
    text: "Natural stone has grown through an older service network. The western airflow is real, but the branching signals will make the route difficult to read.",
  },
  "meridian-basin-arrival": {
    id: "meridian-basin-arrival",
    speaker: "ASH",
    text: "We crossed beneath the ridge. These roads could never reach Tideglass from the surface — the mountain divides the island completely.",
  },
  "cairn-arrival": {
    id: "cairn-arrival",
    speaker: "SERA",
    text: "Cairn Meridian is still standing. Its people have been cut off since the tremors began, and the Array beyond town is transmitting again.",
  },
  "cairn-provost": {
    id: "cairn-provost",
    speaker: "PROVOST HALE",
    text: "The Undertide route has opened? Then our isolation is over. Yet the Meridian Array woke at the same moment, and its doors sealed before our readers could enter.",
  },
  "cairn-miner": {
    id: "cairn-miner",
    speaker: "MINER TAL",
    text: "We heard the borers moving under the ridge for days. They were maintenance machines once. Now crystal growth drives them like hungry animals.",
  },
  "cairn-signal-reader": {
    id: "cairn-signal-reader",
    speaker: "SIGNAL READER YORI",
    text: "The Array is not calling Tideglass or Vesper. Its beam points beyond the sky, repeating coordinates that do not belong to this planet.",
  },
  "meridian-array-entry": {
    id: "meridian-array-entry",
    speaker: "SERA",
    text: "The exterior seal has yielded, but the Array has rerouted its maintenance corridors. Whatever woke the core is still rewriting the path ahead of us.",
  },
  "nox-recruit": {
    id: "nox-recruit",
    speaker: "NOX",
    text: "You opened the northern bridge and crossed the machine fields alive. I have been waiting for someone who could do both.",
    next: "nox-recruit-2",
  },
  "nox-recruit-2": {
    id: "nox-recruit-2",
    speaker: "NOX",
    text: "I am a scout, not a gate guard. I will make my way to your house in Lumen Hollow. Find me there if you want my speed on the road.",
  },
  "echo-vault-entry": {
    id: "echo-vault-entry",
    speaker: "VAULT SIGNAL",
    text: "Power persists. Two surviving circuits have folded the corridors around the upper core.",
    next: "echo-vault-entry-2",
  },
  "echo-vault-entry-2": {
    id: "echo-vault-entry-2",
    speaker: "ASH",
    text: "Then we find the bypass, reach the upper core, and leave before the signal learns our names.",
  },
  "mayor-missing": {
    id: "mayor-missing",
    speaker: "MAYOR ORREN",
    text: "My daughter Mira went searching for a working memory relay and never returned. Her trail ends at Echo Vault. If you enter that place, please find her.",
  },
  "guardian-signal": {
    id: "guardian-signal",
    speaker: "ARCHIVE GUARDIAN",
    text: "UNREGISTERED LIFE SIGN CONTAINED. RECOVERY ACCESS DENIED.",
  },
  "mira-trapped": {
    id: "mira-trapped",
    speaker: "MIRA",
    text: "I cannot get past that guardian. Please do not leave me here!",
  },
  "mira-rescued": {
    id: "mira-rescued",
    speaker: "MIRA",
    text: "You broke its containment field! I can keep up with you. Please take me back to my father in Lumen Hollow.",
  },
  "mira-homecoming": {
    id: "mira-homecoming",
    speaker: "MIRA",
    text: "Father! Ash found me inside Echo Vault and brought me all the way home.",
    next: "mira-homecoming-2",
  },
  "mira-homecoming-2": {
    id: "mira-homecoming-2",
    speaker: "MAYOR ORREN",
    text: "You returned my daughter to me. Lumen Hollow owes you a passage: I am releasing the mayoral lock on the southern bridge. Vesper Crossing is now within reach.",
  },
  "mayor-thanks": {
    id: "mayor-thanks",
    speaker: "MAYOR ORREN",
    text: "The southern bridge remains open by my authority. Thank you again for bringing Mira home.",
  },
  "mira-home": {
    id: "mira-home",
    speaker: "MIRA",
    text: "I thought the Vault would keep me forever. I will stay close to home for a while.",
  },
  "archive-awakening": {
    id: "archive-awakening",
    speaker: "ARCHIVE",
    text: "A low harmonic passes through the floor. Somewhere beyond the sealed walls, an ancient mechanism wakes.",
    next: "archive-awakening-2",
  },
  "archive-awakening-2": {
    id: "archive-awakening-2",
    speaker: "UNKNOWN VOICE",
    text: "At last... the garden has chosen another pathfinder.",
  },
  "ione-recruit": {
    id: "ione-recruit",
    speaker: "IONE",
    text: "Ash? The Archive transmitted your name before you ever reached Aster Reach. I came here to learn why.",
    next: "ione-recruit-2",
  },
  "ione-recruit-2": {
    id: "ione-recruit-2",
    speaker: "IONE",
    text: "I can read that lattice, and mend the wounds it leaves behind. You will need both before long.",
    choices: [
      { label: "Who are you?", next: "ione-recruit-join" },
      { label: "Why help me?", next: "ione-recruit-reason" },
    ],
  },
  "ione-recruit-reason": {
    id: "ione-recruit-reason",
    speaker: "IONE",
    text: "Because the Archive spoke your name before you arrived. I intend to learn how that was possible.",
    next: "ione-recruit-join",
  },
  "ione-recruit-join": {
    id: "ione-recruit-join",
    speaker: "IONE",
    text: "I am Ione, an Archive adept. I will travel to your house in Lumen Hollow. Come and find me there when you are ready.",
  },
  "keeper-veyra": {
    id: "keeper-veyra",
    speaker: "KEEPER VEYRA",
    text: "You came through the garden gate. I had begun to think it would never answer again.",
    choices: [
      { label: "Who are you?", next: "keeper-veyra-identity" },
      { label: "Why was it silent?", next: "keeper-veyra-gate" },
      { label: "Leave", close: true },
    ],
  },
  "keeper-veyra-identity": {
    id: "keeper-veyra-identity",
    speaker: "KEEPER VEYRA",
    text: "Veyra, last keeper of this archive. I preserve memories that no living kingdom remembers making.",
    next: "keeper-veyra-return",
  },
  "keeper-veyra-gate": {
    id: "keeper-veyra-gate",
    speaker: "KEEPER VEYRA",
    text: "Its power did not fail. The gate was waiting for a resonance it recognized. Yours, apparently.",
    next: "keeper-veyra-return",
  },
  "keeper-veyra-return": {
    id: "keeper-veyra-return",
    speaker: "KEEPER VEYRA",
    text: "There will be time for longer answers once we know why the archive has awakened.",
    choices: [
      { label: "Ask something else", next: "keeper-veyra" },
      { label: "Goodbye", close: true },
    ],
  },
};
