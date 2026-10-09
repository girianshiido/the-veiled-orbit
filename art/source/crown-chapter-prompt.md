# Crown Judicator — built-in image generation

Style reference: `public/assets/graphics/archive-custodian-hd-v1.png`.

Final prompt:

Create ONE production enemy sprite for the original JRPG The Veiled Orbit. The attached image is only a reference for detailed science-fantasy pixel art shading and compact readable pixel clusters; do not copy its humanoid design. New enemy: CROWN JUDICATOR, an ancient archive sentinel shaped like a tall floating ivory-and-dark-navy mechanical obelisk, an amber crystalline eye at its center, a wide crown-shaped bronze fan of segmented plates, two long articulated arms with narrow brass claws, three short landing struts underneath, compact folded mechanical wing panels at its sides. A solemn judicial machine, not a person, no face, no humanoid legs. Three-quarter front view facing down-left. Large clear silhouette, restrained ivory/bronze/navy/amber palette, fine but readable old-school JRPG pixel art matching the reference. Single centered full-body sprite occupying most of a square frame with at least 8 percent empty margin on every edge; all crown tips and claws fully inside frame. True transparent RGBA background including all gaps between arms and plates. No magenta, no background color, no white halo, no ground, no shadow, no text, no floating particles, no extra objects. Intended to be normalized to 128 by 128 pixels.

Original RGBA source: `art/source/crown-judicator-hd-v1.png`.
Production frame: `public/assets/graphics/crown-judicator-hd-v1.png`.
Normalization: `scripts/process-crown-guardian.py` (nearest-neighbor, thresholded alpha, six-pixel border; no chroma-keying).

Crown Seeker and Oath Sentinel are palette variants of existing Cipher Drone and Aegis Specter artwork, with their own stats and behaviors. The Survey Drone uses the existing Cipher Drone image in exploration.
