# Science-Fantasy JRPG

An original browser JRPG engine prototype. The game is written in strict TypeScript and rendered with Canvas 2D at an internal resolution of 640 × 480 pixels.

The current chapter continues beyond Southwake Isle, Sera's recruitment, Undertide Passage, Cairn Meridian and the Meridian Array. Recovering the Meridian authorization signal opens the Central Control Tower near Vesper Crossing. Reading its sealed archive opens Windscar Cliffs west of Tideglass Harbor. The Launch Cradle has a branching maintenance maze, a coupler/reactor puzzle, three equipment lockers and a guardian with drone support. Restoring the flight computer enables free reversible atmospheric travel to Skyglass Relay, a safe outpost with memory, inn, clinic, supplies and transit. The eastern weather dome is a future destination, not yet playable. Four characters remain available; no fifth companion is introduced. Original generated art and generation prompts are kept under `art/source/`.

The obsolete outer console bezel, page masthead and on-page directional/action pad have been removed. Keyboard controls now follow the in-game A/B vocabulary: **Enter** confirms or interacts (A), while **Space** cancels or opens/closes the field menu (B).

## Development

```sh
npm install
npm run dev
```

## Production build

```sh
npm run build
```

The production build is emitted to `dist/` and has no runtime network dependency.

## Current milestone

- Layered 16 × 16 tile maps, collisions, camera scrolling and four-direction movement.
- Multi-tile trees, pylons, buildings and world sites with independent visual depth and collision footprints.
- An enlarged northern world map and separate southern island/basin maps, with winding coastlines and miniature landmarks.
- Mountain ranges form natural barriers, while a connected road network offers several looping routes between Lumen Hollow, Echo Vault and Aster Reach.
- Beyond the locked bridge, the expanded southern territory branches past Vesper Crossing toward three prepared frontier plateaus for future villages and labyrinths.
- Five safe villages: Lumen Hollow, Aster Reach, Vesper Crossing, Tideglass Harbor and Cairn Meridian.
- Fixed and patrolling outdoor inhabitants with directional sprites, English dialogue and dynamic collision bodies.
- Phantasy Star II-inspired full-screen service counters with a portrait, title and command menu.
- Distinct weapon, armor, item, inn, memory and transit signs mounted above visible, traversable doors.
- Service doors use their real collision tile, accept symmetric off-centre approaches and return Ash one pixel beyond the threshold when their menu closes.
- Terrain and building collisions use Ash's feet, allowing his body to overlap facades while he stands directly in front of them.
- Weapon, defensive equipment and item shops with BUY, SELL, TALK and GOOD BYE commands.
- Paid inns and 25-credit transit between villages that have already been visited on foot.
- Three reusable manual save slots with visible timestamps at free village memory counters; there is no autosave.
- A full title screen with NEW GAME, timestamped CONTINUE slots and a short four-part introduction narrated by Ash.
- Total party defeat leads to GAME OVER and then back to the title; the last village saves remain unchanged.
- Ash's house, where recruited companions can be consulted and the active party can be reformed.
- Ash is permanently active; the party can contain one to four members and is ready for an eight-character roster.
- The game begins with Ash alone outside his house after he introduces Lumen Hollow and the planet Nydra.
- Ione waits in Aster Reach and Nox waits in Vesper Crossing. Talking to them sends them to Ash's house without changing the active party.
- Recruited companions can then be added to or removed from the formation only at Ash's house.
- Unwalled villages can be left along any edge; their settlement-cluster miniatures can be entered anywhere along the perimeter and preserve the chosen side on arrival and departure.
- Random encounters only in dangerous outdoor areas and labyrinths, with a stronger southern region beyond a quest-locked bridge.
- Rear-view, turn-based combat for up to four characters, with multi-enemy formations and target selection.
- Attack, magic, item, defense and escape commands, plus HP, MP, experience, credits and level progression.
- Fallen allies receive no experience after victory and require revival at a clinic.
- A field console with navigable item and equipment lists, unequip support, shared storage and character-specific equipment restrictions.
- Return Beacons sold in item shops and hidden in a cache; each one instantly extracts the party from a labyrinth and is consumed only after a successful return.
- A larger, branching Echo Vault labyrinth with five persistent caches, four unique equipment rewards and stronger Vault Stalker and Phase Warden encounters near its deepest branches.
- Mira's rescue quest: defeat her visible guardian, escort her back to Lumen Hollow and receive the mayor's authorization to open the southern bridge.
- Keyboard and touch controls, offline service-worker caching and pixel-perfect 640 × 480 rendering.

Manual saves use schema 13 and version-independent storage keys. Older records are migrated, not deleted. Local development also maintains disk backups in `.codex-saves/`. The central chapter preserves existing slots and recognizes all five new equipment IDs; quest switches and opened lockers remain persistent. Saving still requires a village memory counter: return and save between expeditions.

## Central archive chapter

1. Read the Meridian Array core in the southern basin.
2. Return by the free ferry or a Transit Beacon and speak with Rhea in Vesper Crossing.
3. Enter the Central Control Tower. Activate both side consoles in the Relay Galleries.
4. Explore the Memory Archives and collect optional equipment for the party.
5. Confront the Archive Custodian in the Sealed Core. Its charged sphere attack is announced one action ahead; defend before it fires.
6. Read the core terminal, then report to Rhea to learn the Windscar route.

Return Beacons extract the party to the world outside the central tower from all four floors. The vestibule and final chamber have no random encounters. The Meridian key, relay seals and boss defeat remain independent quest flags so backtracking does not repeat rewards.

Regenerate this chapter with `node scripts/generate-central-chapter.mjs`; normalize its enemy art with `python3 scripts/process-central-enemies.py`. Tower and southern-arc generation also restore this chapter's maps and dialogue hooks.

## Launch Cradle chapter

1. Follow the old observatory road west of Tideglass Harbor on Southwake.
2. Cross Windscar Cliffs; the central archive carrier releases the access seal.
3. Recover the magnetic coupler in the western service rooms and use the central reactor.
4. Collect optional Aeroweave Mail and a Vector Core. Take the powered lift to the hangar.
5. Defeat the Cradle Warden and its Cipher Drone. The hangar has no random encounters; the drone can be attacked separately and the guardian announces PHASE NOVA before firing.
6. Collect the Skyglass Guard and activate the eastern flight computer.
7. Board from the southern ramp for a short automatic flight to Skyglass Relay. Return flights cost nothing. The shuttle remains available when travelling by transit.
8. Speak with the three relay inhabitants and save at the free memory archive. The cyclone-sealed eastern ridge marks the end of this chapter.

Return Beacons from either launch floor extract to Windscar Cliffs, outside the works. Skyglass joins transit destinations only after the first visit. Save schema and storage keys are unchanged; all three new equipment IDs are migrated correctly. Debug routes never overwrite slots. Regenerate using `node scripts/generate-launch-chapter.mjs`, and normalize the generated transparent shuttle using `python3 scripts/process-shuttle.py`.

## Debug routes

- `?debugMap=glass-steppe` opens the Verdant Expanse world map.
- `?debugMap=lumen-hollow&debugParty=duo` opens the first village with Ash and Ione.
- `?debugMap=aster-reach&debugParty=duo` opens the expanded second village.
- `?debugMap=vesper-crossing&debugParty=duo` opens the southern third village.
- `?debugMap=echo-vault&debugParty=duo` opens the first labyrinth.
- `?debugBattle=mite-cluster&debugParty=duo` tests a multi-enemy battle and both level-2 spell unlocks.
- `?debugBattle=dust-escort&debugParty=duo` tests another multi-enemy formation.
- `?debugMap=central-control-galleries&debugParty=quartet&debugLevel=22` previews the unlocked central expedition without changing manual saves.
- `?debugMap=central-control-core&debugParty=quartet&debugLevel=22` previews the final chamber.
- `?debugBattle=archive-custodian&debugParty=quartet&debugLevel=22` previews the boss battle.
- `?debugMap=windscar-cliffs&debugParty=quartet&debugLevel=23` previews the cliff approach.
- `?debugMap=cradle-workshop&debugParty=quartet&debugLevel=23` previews the maintenance maze.
- `?debugBattle=cradle-warden&debugParty=quartet&debugLevel=24` previews the hangar guardian and drone.
- `?debugMap=skyglass-relay&debugParty=quartet&debugLevel=24` previews the relay and enables return-shuttle travel.

Debug sessions never write to the manual save slots.

All artwork in this milestone is temporary and original to this project.
