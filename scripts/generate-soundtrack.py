#!/usr/bin/env python3
"""Compose and render The Veiled Orbit's original loopable soundtrack.

No MIDI package is required: this script writes standard MIDI format 1 files,
renders them through FluidSynth, and encodes the browser assets as Ogg Vorbis.
"""

from __future__ import annotations

import argparse
import shutil
import struct
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

PPQ = 480
BEAT = PPQ
BAR = BEAT * 4
REST = -99


@dataclass(frozen=True)
class Score:
    title: str
    bpm: int
    bars: int
    root: int
    progression: tuple[int, ...]
    melody: tuple[int, ...]
    mood: str
    programs: tuple[int, int, int, int]


SCORES: dict[str, Score] = {
    "title": Score("Orbit Beyond the Veil", 92, 32, 52, (0, -2, 3, -4, 0, 5, 3, 0),
        (7, REST, 10, 12, 14, 12, 10, REST, 7, REST, 5, 7, 10, 7, 5, REST, 3, 5, 7, REST, 10, 7, 5, 3, 0, REST, 3, 5, 7, 5, 3, REST),
        "gentle", (4, 48, 89, 73)),
    "world": Score("Green Circuit Horizon", 108, 48, 52, (0, 3, -2, 5, 0, 7, 3, 0),
        (7, 10, 12, REST, 14, 12, 10, 7, 5, 7, 10, REST, 12, 10, 7, 5, 3, 5, 7, 10, 12, REST, 10, 7, 5, 3, 0, 3, 5, 7, REST, 5),
        "bright", (46, 48, 88, 74)),
    "village": Score("Canopies and Circuits", 88, 32, 55, (0, -3, 5, 2, 0, 4, -3, 0),
        (4, 7, 9, REST, 11, 9, 7, 4, 2, 4, 7, REST, 9, 7, 4, REST, 0, 2, 4, 7, 9, REST, 7, 4, 2, REST, 0, 2, 4, 2, 0, REST),
        "gentle", (24, 48, 12, 73)),
    "dungeon": Score("Signals Under Stone", 100, 48, 50, (0, 1, -2, 3, 0, -4, 1, 0),
        (0, REST, 3, REST, 6, 5, 3, REST, 1, REST, 5, 6, 8, REST, 6, 5, 3, 1, 0, REST, -2, REST, 1, 3, 5, REST, 3, 1, 0, REST, REST, REST),
        "shadow", (44, 52, 91, 81)),
    "battle": Score("Steel Against the Rift", 146, 56, 52, (0, -2, 3, 5, 0, 7, 5, -2),
        (12, 15, 14, 10, 12, 7, 10, REST, 19, 17, 15, 14, 12, 15, 10, REST, 7, 10, 12, 15, 14, 12, 10, 7, 5, 7, 10, 12, 15, 14, 10, REST),
        "machine-battle", (81, 30, 80, 81)),
    "victory": Score("A Clear Signal", 126, 16, 55, (0, 5, 7, 0),
        (0, 4, 7, 12, 11, 12, 16, 14, 12, 9, 11, 12, 7, 9, 11, 12, 16, 14, 12, 11, 9, 7, 5, 7, 9, 11, 12, REST, 12, REST, 12, REST),
        "fanfare", (56, 61, 48, 73)),
    "game-over": Score("The Signal Fades", 66, 16, 48, (0, -2, -5, -7, 0, -3, -5, 0),
        (12, REST, 10, REST, 7, REST, 5, REST, 3, REST, 2, REST, 0, REST, -2, REST, 7, REST, 5, 3, 2, REST, 0, REST, -2, REST, -5, REST, REST, REST, REST, REST),
        "shadow", (0, 48, 52, 72)),
    "inn": Score("Rest Beneath Lumen", 72, 24, 57, (0, 5, 2, 7, 0, 4, 5, 0),
        (0, REST, 4, 7, 9, REST, 7, 4, 2, REST, 4, 7, 11, REST, 9, 7, 5, REST, 4, 2, 0, REST, 2, 4, 7, REST, 5, 4, 2, REST, 0, REST),
        "gentle", (4, 24, 48, 68)),
    "item-shop": Score("Bottles and Bright Ideas", 112, 24, 60, (0, 5, 7, 4, 0, 9, 5, 0),
        (0, 4, 7, 9, 7, 4, 2, 4, 5, 9, 12, 9, 7, 5, 4, 2, 0, 2, 4, 7, 9, 7, 5, 4, 2, 4, 5, 7, 4, 2, 0, REST),
        "bright", (11, 13, 46, 71)),
    "weapon-shop": Score("Tempered in Starlight", 124, 32, 50, (0, 3, 5, 7, 0, -2, 3, 0),
        (0, 3, 7, 10, 7, 5, 3, 0, 5, 7, 10, 12, 10, 7, 5, 3, 0, 3, 5, 7, 10, 12, 10, 7, 5, 3, 0, -2, 0, 3, 5, REST),
        "urgent", (29, 61, 48, 56)),
    "armor-shop": Score("Aegis Foundry", 92, 24, 48, (0, 5, 3, 7, 0, 8, 5, 0),
        (7, REST, 5, 7, 12, REST, 10, 7, 5, REST, 3, 5, 7, REST, 5, 3, 0, REST, 3, 7, 10, REST, 7, 5, 3, REST, 0, 3, 5, REST, 3, 0),
        "steady", (60, 47, 48, 71)),
    "save-shop": Score("Memory of the Archive", 78, 24, 55, (0, 7, 5, 2, 0, 4, 7, 0),
        (12, REST, 11, 7, 9, REST, 7, 4, 5, REST, 7, 9, 11, REST, 9, 7, 4, REST, 5, 7, 9, REST, 7, 5, 2, REST, 4, 5, 7, REST, 4, 0),
        "gentle", (8, 48, 89, 72)),
    "revival-shop": Score("Pulse Returned", 84, 24, 53, (0, -2, 3, 5, 0, 7, 3, 0),
        (0, REST, 3, 7, 10, REST, 7, 5, 3, REST, 5, 8, 12, REST, 10, 8, 7, REST, 5, 3, 0, REST, 3, 5, 7, REST, 5, 3, 2, REST, 0, REST),
        "mystic", (52, 48, 92, 74)),
    "teleport": Score("Relay Gate", 118, 32, 54, (0, 2, 7, 9, 0, 5, 7, 0),
        (0, 7, 12, 14, 19, 14, 12, 7, 2, 9, 14, 16, 21, 16, 14, 9, 5, 12, 17, 19, 17, 12, 9, 7, 5, 7, 11, 14, 12, 9, 7, REST),
        "bright", (84, 81, 99, 82)),
    "party-house": Score("Home Team", 82, 32, 55, (0, 4, 5, 2, 0, 7, 5, 0),
        (7, REST, 9, 11, 12, REST, 11, 9, 7, REST, 4, 7, 9, REST, 7, 4, 2, REST, 4, 7, 11, REST, 9, 7, 5, REST, 4, 2, 0, REST, 2, 4),
        "gentle", (5, 48, 25, 73)),
}


def vlq(value: int) -> bytes:
    result = [value & 0x7F]
    value >>= 7
    while value:
        result.append((value & 0x7F) | 0x80)
        value >>= 7
    return bytes(reversed(result))


def chunk(kind: bytes, data: bytes) -> bytes:
    return kind + struct.pack(">I", len(data)) + data


def meta_text(kind: int, value: str) -> bytes:
    encoded = value.encode("utf-8")
    return bytes((0xFF, kind)) + vlq(len(encoded)) + encoded


class MidiTrack:
    def __init__(self, name: str, channel: int | None = None, program: int = 0, volume: int = 100, pan: int = 64):
        self.events: list[tuple[int, int, bytes]] = [(0, 0, meta_text(0x03, name))]
        self.channel = channel
        if channel is not None:
            self.events.extend([
                (0, 1, bytes((0xB0 | channel, 7, volume))),
                (0, 1, bytes((0xB0 | channel, 10, pan))),
                (0, 1, bytes((0xB0 | channel, 91, 28))),
                (0, 1, bytes((0xB0 | channel, 93, 10))),
                (0, 2, bytes((0xC0 | channel, program))),
            ])

    def note(self, tick: int, duration: int, pitch: int, velocity: int) -> None:
        if self.channel is None or pitch < 0:
            return
        pitch = max(0, min(127, pitch))
        self.events.append((tick, 3, bytes((0x90 | self.channel, pitch, velocity))))
        self.events.append((tick + max(1, duration), 2, bytes((0x80 | self.channel, pitch, 0))))

    def data(self, end_tick: int) -> bytes:
        normalized: list[tuple[int, int, bytes]] = []
        for tick, priority, event in self.events:
            if tick >= end_tick:
                if priority != 2:
                    continue
                tick = end_tick - 1
            normalized.append((tick, priority, event))
        ordered = sorted(normalized + [(end_tick, 9, b"\xff\x2f\x00")], key=lambda item: (item[0], item[1]))
        output = bytearray()
        previous = 0
        for tick, _priority, event in ordered:
            output.extend(vlq(tick - previous))
            output.extend(event)
            previous = tick
        return bytes(output)


def chord_intervals(mood: str, bar: int) -> tuple[int, ...]:
    if mood in {"shadow", "urgent", "mystic"}:
        qualities = ((0, 3, 7, 10), (0, 3, 6, 10), (0, 4, 7, 10), (0, 3, 7, 9))
    elif mood == "fanfare":
        qualities = ((0, 4, 7, 12), (0, 5, 9, 12), (0, 4, 7, 11), (0, 4, 7, 12))
    else:
        qualities = ((0, 4, 7, 11), (0, 3, 7, 10), (0, 4, 7, 9), (0, 4, 7, 11))
    return qualities[bar % len(qualities)]


def compose(score: Score, output: Path) -> None:
    if score.mood == "machine-battle":
        compose_machine_battle(score, output)
        return
    end_tick = score.bars * BAR
    tempo = round(60_000_000 / score.bpm)
    conductor = MidiTrack(score.title)
    conductor.events.extend([
        (0, 1, b"\xff\x51\x03" + tempo.to_bytes(3, "big")),
        (0, 1, b"\xff\x58\x04\x04\x02\x18\x08"),
        (0, 1, meta_text(0x01, "Original music for The Veiled Orbit")),
    ])
    harmony = MidiTrack("Harmony", 0, score.programs[0], 78, 46)
    strings = MidiTrack("Atmosphere", 1, score.programs[1], 65, 82)
    arpeggio = MidiTrack("Circuit pulse", 2, score.programs[2], 66, 36)
    lead = MidiTrack("Signal melody", 3, score.programs[3], 92, 74)
    bass_program = 38 if score.mood in {"urgent", "bright"} else 35
    bass = MidiTrack("Bass", 4, bass_program, 92, 64)
    counter = MidiTrack("Counter signal", 5, 89 if score.mood != "urgent" else 62, 56, 92)
    drums = MidiTrack("Percussion", 9, 0, 90, 64)

    for bar in range(score.bars):
        start = bar * BAR
        root = score.root + score.progression[bar % len(score.progression)]
        chord = chord_intervals(score.mood, bar)
        section = (bar // 8) % 4
        release = BAR - (BEAT // 8 if bar == score.bars - 1 else 28)

        for voice, interval in enumerate(chord):
            harmony.note(start, release, root + interval + (12 if voice >= 2 else 0), 50 + section * 3)
            if voice < 3:
                strings.note(start, release, root + interval + 12, 40 + section * 2)

        arp_order = (0, 1, 2, 1, 3 if len(chord) > 3 else 0, 2, 1, 2)
        for step, voice in enumerate(arp_order):
            if score.mood == "shadow" and step % 2:
                continue
            pitch = root + 12 + chord[voice % len(chord)]
            arpeggio.note(start + step * BEAT // 2, int(BEAT * 0.39), pitch, 47 + (step % 4) * 3)

        bass_pattern = (0, 0, 7, 0, 0, 12, 7, 5)
        for step, interval in enumerate(bass_pattern):
            if score.mood == "gentle" and step % 2:
                continue
            bass.note(start + step * BEAT // 2, int(BEAT * (0.42 if score.mood == "urgent" else 0.72)), root - 24 + interval, 68 + (8 if step in {0, 4} else 0))

        for step in range(8):
            melody_index = (bar * 8 + step + section * 3) % len(score.melody)
            interval = score.melody[melody_index]
            enabled = score.mood in {"urgent", "fanfare"} or section > 0 or bar >= 8
            if interval != REST and enabled and (score.mood in {"urgent", "fanfare"} or step % 2 == 0 or section >= 2):
                duration = int(BEAT * (0.42 if score.mood == "urgent" else 0.82))
                lead.note(start + step * BEAT // 2, duration, score.root + 12 + interval, 72 + section * 5)
            if section == 3 and step in {2, 6}:
                counter.note(start + step * BEAT // 2, int(BEAT * 0.8), root + 19 + chord[step // 2 % len(chord)], 42)

        add_drums(drums, start, score.mood, bar)

    tracks = [conductor, harmony, strings, arpeggio, lead, bass, counter, drums]
    header = chunk(b"MThd", struct.pack(">HHH", 1, len(tracks), PPQ))
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(header + b"".join(chunk(b"MTrk", track.data(end_tick)) for track in tracks))


def compose_machine_battle(score: Score, output: Path) -> None:
    """Dense FM-era battle arrangement with an entirely original score."""
    end_tick = score.bars * BAR
    tempo = round(60_000_000 / score.bpm)
    conductor = MidiTrack(score.title)
    conductor.events.extend([
        (0, 1, b"\xff\x51\x03" + tempo.to_bytes(3, "big")),
        (0, 1, b"\xff\x58\x04\x04\x02\x18\x08"),
        (0, 1, meta_text(0x01, "Original science-fantasy battle theme for The Veiled Orbit")),
    ])
    sub_bass = MidiTrack("Reactor bass", 0, 39, 112, 64)
    drive = MidiTrack("Distorted drive", 1, 30, 73, 48)
    high_pulse = MidiTrack("High pulse", 2, 80, 68, 35)
    left_stab = MidiTrack("Left phase stabs", 3, 81, 83, 35)
    right_stab = MidiTrack("Right phase stabs", 4, 81, 72, 93)
    syncopation = MidiTrack("Syncopated signal", 5, 82, 64, 78)
    lead = MidiTrack("Rift melody", 6, 81, 96, 70)
    octave_bass = MidiTrack("Octave bass", 7, 38, 70, 104)
    brass = MidiTrack("Alarm brass", 8, 62, 58, 58)
    low_hit = MidiTrack("Reactor hit", 10, 16, 65, 78)
    drums = MidiTrack("Machine percussion", 9, 0, 102, 64)

    bass_gate = (0, 12, 0, 7, 0, 12, 3, 7, 0, 12, 0, 10, 0, 7, 3, 12)
    pulse_gate = (12, 0, 7, 12, 3, 7, 15, 12, 7, 3, 12, 10, 7, 15, 12, 19)
    stab_offsets = ((0, 3, 7), (0, 4, 7), (0, 3, 6), (0, 4, 8))

    for bar in range(score.bars):
        start = bar * BAR
        root = score.root + score.progression[bar % len(score.progression)]
        section = min(5, bar // 8)
        final_bar = bar == score.bars - 1

        # The bass is the engine: sixteenth-note gates with octave and fifth jumps.
        for step, interval in enumerate(bass_gate):
            velocity = 98 if step in {0, 4, 8, 12} else 76 + (step % 3) * 5
            sub_bass.note(start + step * BEAT // 4, int(BEAT * 0.18), root - 24 + interval, velocity)
            if step % 2 == 0 and bar >= 2:
                octave_bass.note(start + step * BEAT // 4, int(BEAT * 0.19), root - 12 + (12 if step % 4 else 0), 58)

        # Palm-muted guitar answers the bass on eighth notes.
        if bar >= 2:
            drive_pattern = (0, 0, 3, 0, 5, 3, 7, 5)
            for step, interval in enumerate(drive_pattern):
                drive.note(start + step * BEAT // 2, int(BEAT * 0.30), root - 12 + interval, 67 + (15 if step in {2, 5} else 0))

        # Mirrored synth stabs are deliberately displaced by one sixteenth note.
        chord = stab_offsets[bar % len(stab_offsets)]
        if bar >= 4:
            for beat in (0, 2):
                for voice, interval in enumerate(chord):
                    left_stab.note(start + beat * BEAT, int(BEAT * 0.76), root + 12 + interval, 66 + voice * 5)
                    right_stab.note(start + beat * BEAT + BEAT // 4, int(BEAT * 0.62), root + 12 + interval, 55 + voice * 4)

        # Fast high-frequency pulse supplies the 16-bit/FM flavour.
        if bar >= 1:
            for step, interval in enumerate(pulse_gate):
                if section == 0 and step % 2:
                    continue
                high_pulse.note(start + step * BEAT // 4, int(BEAT * 0.12), root + 24 + interval, 43 + (step % 4) * 5)

        # The lead enters only after the rhythm section is established.
        if bar >= 8:
            for step in range(8):
                melody_index = (bar * 5 + step + section * 7) % len(score.melody)
                interval = score.melody[melody_index]
                if interval == REST:
                    continue
                lead.note(start + step * BEAT // 2, int(BEAT * (0.32 if step % 3 else 0.70)), score.root + 12 + interval, 78 + section * 3)
                if section >= 3 and step in {1, 4, 6}:
                    syncopation.note(start + step * BEAT // 2 + BEAT // 4, int(BEAT * 0.24), score.root + interval, 53)

        # Brass alarms and a low electronic hit mark section boundaries.
        if bar % 8 == 0 and bar > 0:
            for interval in (0, 7, 12):
                brass.note(start, int(BEAT * 1.45), root + interval, 69)
            low_hit.note(start, int(BEAT * 0.82), 38, 92)
        if section >= 4 and bar % 4 == 3:
            for offset, interval in enumerate((12, 10, 7, 3)):
                brass.note(start + (offset + 4) * BEAT // 2, int(BEAT * 0.38), root + interval, 62 + offset * 4)

        add_machine_drums(drums, start, bar, final_bar)

    tracks = [conductor, sub_bass, drive, high_pulse, left_stab, right_stab,
              syncopation, lead, octave_bass, brass, low_hit, drums]
    header = chunk(b"MThd", struct.pack(">HHH", 1, len(tracks), PPQ))
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(header + b"".join(chunk(b"MTrk", track.data(end_tick)) for track in tracks))


def add_machine_drums(track: MidiTrack, start: int, bar: int, final_bar: bool) -> None:
    for step in range(16):
        tick = start + step * BEAT // 4
        track.note(tick, 36, 42 if step % 4 else 44, 48 + (step % 4) * 5)
    for step in (0, 3, 6, 8, 11, 14):
        track.note(start + step * BEAT // 4, 66, 36, 75 + (15 if step in {0, 8} else 0))
    for step in (4, 12):
        track.note(start + step * BEAT // 4, 72, 38, 92)
        track.note(start + step * BEAT // 4, 54, 39, 57)
    if bar % 8 == 0:
        track.note(start, 105, 49, 86)
    if bar % 8 == 7 or final_bar:
        for offset, drum in enumerate((45, 47, 48, 50, 47, 50)):
            track.note(start + (10 + offset) * BEAT // 4, 58, drum, 66 + offset * 5)


def add_drums(track: MidiTrack, start: int, mood: str, bar: int) -> None:
    if mood == "shadow":
        track.note(start, 70, 36, 54)
        track.note(start + 3 * BEAT, 60, 42, 37)
        return
    if mood == "gentle":
        for beat in (0, 2):
            track.note(start + beat * BEAT, 70, 36, 45)
        for beat in (1, 3):
            track.note(start + beat * BEAT, 55, 42, 38)
        return
    steps = 16 if mood == "urgent" else 8
    for step in range(steps):
        tick = start + step * BAR // steps
        if mood == "urgent" or step % 2 == 0:
            track.note(tick, 45, 42 if step % 4 else 44, 43 + (step % 4) * 3)
    for beat in (0, 2):
        track.note(start + beat * BEAT, 70, 36, 82 if mood == "urgent" else 65)
    if mood == "urgent":
        track.note(start + BEAT // 2, 60, 36, 58)
        track.note(start + 3 * BEAT + BEAT // 2, 60, 36, 58)
    for beat in (1, 3):
        track.note(start + beat * BEAT, 75, 38, 78 if mood == "urgent" else 60)
    if bar % 8 == 0:
        track.note(start, 110, 49, 72)


def command_path(candidates: tuple[str, ...]) -> str:
    for candidate in candidates:
        found = shutil.which(candidate)
        if found:
            return found
    raise SystemExit(f"Missing required command: {candidates[0]}")


def run(command: list[str]) -> None:
    subprocess.run(command, check=True, stdout=subprocess.DEVNULL)


def render(score_id: str, score: Score, midi: Path, ogg: Path, sf2: Path, temp: Path, fluidsynth: str, ffmpeg: str) -> None:
    wav = temp / f"{score_id}.wav"
    temp.mkdir(parents=True, exist_ok=True)
    duration = score.bars * 4 * 60 / score.bpm
    run([fluidsynth, "-ni", "-C", "0", "-R", "0", "-g", "0.55", "-r", "44100", "-F", str(wav), "-T", "wav", str(sf2), str(midi)])
    ogg.parent.mkdir(parents=True, exist_ok=True)
    run([
        ffmpeg, "-y", "-hide_banner", "-loglevel", "error", "-i", str(wav),
        "-af", f"apad,loudnorm=I=-17:TP=-1.5:LRA=10,atrim=0:{duration:.6f},afade=t=in:st=0:d=0.025,afade=t=out:st={max(0, duration - 0.025):.6f}:d=0.025",
        "-ar", "44100", "-c:a", "libvorbis", "-q:a", "6", "-metadata", f"title={score.title}",
        "-metadata", "artist=The Veiled Orbit", "-metadata", "album=The Veiled Orbit Original Soundtrack",
        str(ogg),
    ])
    wav.unlink(missing_ok=True)


def main() -> int:
    project = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser()
    parser.add_argument("--track", choices=tuple(SCORES))
    parser.add_argument("--midi-only", action="store_true")
    parser.add_argument("--sf2", type=Path, default=project / "soundfonts" / "MuseScore_General_HQ.sf2")
    args = parser.parse_args()
    selected = {args.track: SCORES[args.track]} if args.track else SCORES
    midi_dir = project / "music" / "midi"
    ogg_dir = project / "public" / "assets" / "audio" / "music"
    temp = project / "tmp" / "audio-render"

    if not args.midi_only and not args.sf2.is_file():
        raise SystemExit(f"SoundFont not found: {args.sf2}")
    fluidsynth = command_path(("fluidsynth", "/opt/homebrew/bin/fluidsynth")) if not args.midi_only else ""
    ffmpeg = command_path(("ffmpeg", "/opt/homebrew/bin/ffmpeg")) if not args.midi_only else ""

    for index, (score_id, score) in enumerate(selected.items(), 1):
        midi = midi_dir / f"{score_id}.mid"
        ogg = ogg_dir / f"{score_id}.ogg"
        print(f"[{index}/{len(selected)}] {score.title}", flush=True)
        compose(score, midi)
        if not args.midi_only:
            render(score_id, score, midi, ogg, args.sf2, temp, fluidsynth, ffmpeg)
    print(f"Generated {len(selected)} MIDI score(s){' and OGG render(s)' if not args.midi_only else ''}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
