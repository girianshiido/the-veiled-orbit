# The Veiled Orbit soundtrack

The files in `midi/` are the editable source scores for the game's original
soundtrack. The browser plays the rendered Ogg Vorbis files from
`public/assets/audio/music/`.

To rebuild the soundtrack locally:

```sh
npm run generate:music
```

The renderer expects `soundfonts/MuseScore_General_HQ.sf2`, FluidSynth and
FFmpeg. The large SoundFont is deliberately excluded from Git and from the
browser build. The current renders use MuseScore General HQ, distributed under
the MIT license.
