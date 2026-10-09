import type { InputAction, InteractionKind } from "../types/game";
import type { BattleAnimation, BattleEffect } from "../battle/BattleSystem";
import type { BattleTransitionPhase } from "../battle/BattleTransitionRenderer";

export type MusicTheme =
  | "title"
  | "world"
  | "village"
  | "dungeon"
  | "battle"
  | "victory"
  | "game-over"
  | "inn"
  | "item-shop"
  | "weapon-shop"
  | "armor-shop"
  | "save-shop"
  | "revival-shop"
  | "teleport"
  | "party-house"
  | "silence";

export interface AudioSceneState {
  theme: MusicTheme;
  menuInput: boolean;
  mapId: string | null;
  battleAnimation: BattleAnimation | null;
  battleEffect: BattleEffect | null;
  battleTransition: BattleTransitionPhase | null;
  serviceActive: boolean;
  serviceKind: InteractionKind | null;
}

const SETTINGS_KEY = "veiled-orbit-audio-settings-v2";
const MUSIC_BASE_URL = `${import.meta.env?.BASE_URL ?? "./"}assets/audio/music/`;

export interface AudioControls {
  menuButton: HTMLButtonElement;
  panel: HTMLElement;
  musicSlider: HTMLInputElement;
  sfxSlider: HTMLInputElement;
  musicReadout: HTMLOutputElement;
  sfxReadout: HTMLOutputElement;
  previewButton: HTMLButtonElement;
}

export function musicFileForTheme(theme: Exclude<MusicTheme, "silence">): string {
  return `${MUSIC_BASE_URL}${theme}.ogg`;
}

const VILLAGES = new Set(["lumen-hollow", "aster-reach", "vesper-crossing", "tideglass-harbor", "cairn-meridian", "skyglass-relay"]);
const WORLD_MAPS = new Set(["glass-steppe", "southern-landing", "meridian-basin", "windscar-cliffs", "stormbreak-ridge"]);

export function musicThemeForMap(mapId: string): MusicTheme {
  if (VILLAGES.has(mapId)) return "village";
  if (WORLD_MAPS.has(mapId)) return "world";
  return "dungeon";
}

export function musicThemeForService(kind: InteractionKind): MusicTheme | null {
  if (kind === "inn" || kind === "item-shop" || kind === "weapon-shop" || kind === "armor-shop"
    || kind === "save-shop" || kind === "revival-shop" || kind === "teleport" || kind === "party-house") {
    return kind;
  }
  return null;
}

export class AudioManager {
  private readonly controls: AudioControls;
  private context: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private themeBus: GainNode | null = null;
  private themeSource: AudioBufferSourceNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private readonly musicBuffers = new Map<Exclude<MusicTheme, "silence">, Promise<AudioBuffer>>();
  private themeRequestId = 0;
  private requestedTheme: MusicTheme = "silence";
  private playingTheme: MusicTheme = "silence";
  private menuInput = false;
  private previousState: AudioSceneState | null = null;
  private musicVolume = 0.75;
  private sfxVolume = 0.8;

  constructor(controls: AudioControls) {
    this.controls = controls;
    this.loadSettings();
    this.refreshControls();
    controls.menuButton.addEventListener("click", () => { void this.toggleMenu(); });
    controls.musicSlider.addEventListener("input", () => this.updateMusicVolume());
    controls.sfxSlider.addEventListener("input", () => this.updateSfxVolume());
    controls.previewButton.addEventListener("click", () => { void this.previewSfx(); });
    controls.panel.addEventListener("keydown", (event) => event.stopPropagation());
    window.addEventListener("keydown", this.unlockFromGesture, { once: true });
    window.addEventListener("pointerdown", this.unlockFromGesture, { once: true });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void this.context?.resume();
    });
  }

  public handleInput(action: InputAction): void {
    if (!this.menuInput) return;
    void this.playInputSfx(action);
  }

  public sync(state: AudioSceneState): void {
    this.menuInput = state.menuInput;
    this.requestedTheme = state.theme;
    if (this.context && state.theme !== this.playingTheme) this.startTheme(state.theme);

    const previous = this.previousState;
    if (previous) {
      if (!previous.battleTransition && state.battleTransition === "enter") this.playSfx("encounter");
      if (!previous.serviceActive && state.serviceActive) this.playSfx("door");
      if (previous.serviceActive && !state.serviceActive) this.playSfx("door");
      if (state.battleAnimation !== previous.battleAnimation && state.battleAnimation) {
        if (state.battleAnimation === "hero-strike") this.playSfx("attack");
        else if (state.battleAnimation === "enemy-strike") this.playSfx("enemy-attack");
        else if (state.battleAnimation === "hero-cast" || state.battleAnimation === "enemy-cast") {
          this.playSfx(state.battleEffect === "mend" ? "heal" : "magic");
        } else if (state.battleAnimation === "enemy-hit" || state.battleAnimation === "hero-hit") this.playSfx("hit");
        else if (state.battleAnimation === "victory") this.playSfx("victory");
      }
    }
    this.previousState = { ...state };
  }

  private readonly unlockFromGesture = (): void => {
    void this.unlock();
  };

  private async playInputSfx(action: InputAction): Promise<void> {
    await this.unlock();
    if (action === "confirm") this.playSfx("confirm");
    else if (action === "menu") this.playSfx("cancel");
    else this.playSfx("cursor");
  }

  private async toggleMenu(): Promise<void> {
    const isOpen = this.controls.panel.hidden;
    this.controls.panel.hidden = !isOpen;
    this.controls.menuButton.setAttribute("aria-expanded", String(isOpen));
    await this.unlock();
    this.playSfx(isOpen ? "confirm" : "cancel");
  }

  private updateMusicVolume(): void {
    this.musicVolume = this.sliderVolume(this.controls.musicSlider);
    this.applyVolumes();
    this.saveSettings();
    this.refreshControls();
  }

  private updateSfxVolume(): void {
    this.sfxVolume = this.sliderVolume(this.controls.sfxSlider);
    this.applyVolumes();
    this.saveSettings();
    this.refreshControls();
    void this.previewSfx();
  }

  private async previewSfx(): Promise<void> {
    await this.unlock();
    this.playSfx("confirm");
    window.setTimeout(() => this.playSfx("hit"), 110);
  }

  private async unlock(): Promise<void> {
    if (!this.context) {
      const AudioContextClass = window.AudioContext
        ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      this.context = new AudioContextClass();
      this.musicGain = this.context.createGain();
      this.sfxGain = this.context.createGain();
      this.musicGain.connect(this.context.destination);
      this.sfxGain.connect(this.context.destination);
      this.noiseBuffer = this.createNoiseBuffer();
      this.applyVolumes();
    }
    await this.context.resume();
    if (this.playingTheme !== this.requestedTheme) this.startTheme(this.requestedTheme);
  }

  private startTheme(theme: MusicTheme): void {
    const context = this.context;
    const musicGain = this.musicGain;
    if (!context || !musicGain || theme === this.playingTheme) return;
    this.playingTheme = theme;
    const requestId = ++this.themeRequestId;
    if (theme === "silence") {
      this.fadeOutCurrentTheme(context.currentTime);
      return;
    }
    void this.loadMusic(theme).then((buffer) => {
      if (!this.context || !this.musicGain || requestId !== this.themeRequestId || this.requestedTheme !== theme) return;
      const now = this.context.currentTime;
      const oldBus = this.themeBus;
      const oldSource = this.themeSource;
      const bus = this.context.createGain();
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      bus.gain.setValueAtTime(0.0001, now);
      bus.gain.exponentialRampToValueAtTime(1, now + 0.42);
      source.connect(bus).connect(this.musicGain);
      source.start(now + 0.025);
      this.themeBus = bus;
      this.themeSource = source;
      if (oldBus && oldSource) {
        oldBus.gain.cancelScheduledValues(now);
        oldBus.gain.setValueAtTime(Math.max(0.0001, oldBus.gain.value), now);
        oldBus.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
        oldSource.stop(now + 0.36);
        oldSource.addEventListener("ended", () => {
          oldSource.disconnect();
          oldBus.disconnect();
        }, { once: true });
      }
    }).catch((error: unknown) => {
      console.error(`Unable to load music theme ${theme}.`, error);
    });
  }

  private loadMusic(theme: Exclude<MusicTheme, "silence">): Promise<AudioBuffer> {
    const cached = this.musicBuffers.get(theme);
    if (cached) return cached;
    const context = this.context;
    if (!context) return Promise.reject(new Error("Audio context is not ready."));
    const promise = fetch(musicFileForTheme(theme))
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.arrayBuffer();
      })
      .then((data) => context.decodeAudioData(data));
    this.musicBuffers.set(theme, promise);
    return promise;
  }

  private fadeOutCurrentTheme(now: number): void {
    const bus = this.themeBus;
    const source = this.themeSource;
    this.themeBus = null;
    this.themeSource = null;
    if (!bus || !source) return;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setValueAtTime(Math.max(0.0001, bus.gain.value), now);
    bus.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    source.stop(now + 0.3);
    source.addEventListener("ended", () => {
      source.disconnect();
      bus.disconnect();
    }, { once: true });
  }

  private tone(
    midi: number,
    time: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    destination: AudioNode,
    cutoff = 1800,
    vibrato = 0,
  ): void {
    const context = this.context;
    if (!context) return;
    const oscillator = context.createOscillator();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(440 * 2 ** ((midi - 69) / 12), time);
    if (vibrato) {
      oscillator.detune.setValueAtTime(0, time);
      oscillator.detune.linearRampToValueAtTime(vibrato, time + duration * 0.45);
      oscillator.detune.linearRampToValueAtTime(-vibrato, time + duration * 0.75);
      oscillator.detune.linearRampToValueAtTime(0, time + duration);
    }
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(cutoff, time);
    filter.Q.value = 0.7;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), time + Math.min(0.025, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(filter).connect(gain).connect(destination);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.03);
  }

  private kick(time: number, destination: AudioNode, volume: number): void {
    const context = this.context;
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(135, time);
    oscillator.frequency.exponentialRampToValueAtTime(42, time + 0.11);
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.15);
    oscillator.connect(gain).connect(destination);
    oscillator.start(time);
    oscillator.stop(time + 0.16);
  }

  private snare(time: number, destination: AudioNode, volume: number): void {
    this.noise(time, 0.13, volume, destination, 850, "highpass");
    this.tone(50, time, 0.08, "triangle", volume * 0.45, destination, 700);
  }

  private hat(time: number, destination: AudioNode, volume: number): void {
    this.noise(time, 0.045, volume, destination, 4800, "highpass");
  }

  private noise(time: number, duration: number, volume: number, destination: AudioNode, cutoff: number, type: BiquadFilterType): void {
    const context = this.context;
    if (!context || !this.noiseBuffer) return;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = type;
    filter.frequency.setValueAtTime(cutoff, time);
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter).connect(gain).connect(destination);
    source.start(time);
    source.stop(time + duration);
  }

  private playSfx(kind: "cursor" | "confirm" | "cancel" | "door" | "encounter" | "attack" | "enemy-attack" | "magic" | "heal" | "hit" | "victory"): void {
    const context = this.context;
    const destination = this.sfxGain;
    if (!context || !destination || this.sfxVolume === 0) return;
    const now = context.currentTime + 0.006;
    if (kind === "cursor") this.tone(77, now, 0.045, "square", 0.050, destination, 2400);
    else if (kind === "confirm") {
      this.tone(76, now, 0.06, "square", 0.055, destination, 2600);
      this.tone(83, now + 0.045, 0.08, "square", 0.050, destination, 2800);
    } else if (kind === "cancel") {
      this.tone(71, now, 0.07, "square", 0.050, destination, 1800);
      this.tone(66, now + 0.05, 0.09, "square", 0.045, destination, 1600);
    } else if (kind === "door") {
      this.noise(now, 0.17, 0.075, destination, 500, "lowpass");
      this.tone(43, now, 0.2, "triangle", 0.05, destination, 700);
    } else if (kind === "encounter") {
      [48, 55, 61, 67].forEach((note, index) => this.tone(note, now + index * 0.055, 0.18, "sawtooth", 0.07, destination, 2200));
      this.noise(now, 0.32, 0.08, destination, 1200, "bandpass");
    } else if (kind === "attack") {
      this.noise(now, 0.13, 0.11, destination, 1900, "highpass");
      this.tone(76, now, 0.12, "sawtooth", 0.07, destination, 2600, -18);
    } else if (kind === "enemy-attack") {
      this.tone(45, now, 0.18, "sawtooth", 0.10, destination, 900, -30);
      this.noise(now + 0.05, 0.12, 0.07, destination, 900, "bandpass");
    } else if (kind === "magic" || kind === "heal") {
      const notes = kind === "heal" ? [64, 67, 71, 76] : [60, 67, 73, 79];
      notes.forEach((note, index) => this.tone(note, now + index * 0.055, 0.24, "triangle", 0.055, destination, 3200, 7));
    } else if (kind === "hit") {
      this.noise(now, 0.16, 0.13, destination, 720, "bandpass");
      this.tone(38, now, 0.14, "square", 0.08, destination, 620);
    } else {
      [60, 64, 67, 72, 76, 79].forEach((note, index) => this.tone(note, now + index * 0.09, 0.42, index % 2 ? "triangle" : "square", 0.06, destination, 3000));
    }
  }

  private createNoiseBuffer(): AudioBuffer | null {
    const context = this.context;
    if (!context) return null;
    const buffer = context.createBuffer(1, Math.floor(context.sampleRate * 0.5), context.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 0x5a17;
    for (let index = 0; index < data.length; index += 1) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      data[index] = (seed / 0xffffffff) * 2 - 1;
    }
    return buffer;
  }

  private applyVolumes(): void {
    if (!this.context) return;
    const now = this.context.currentTime;
    this.musicGain?.gain.setTargetAtTime(this.musicVolume * 0.82, now, 0.035);
    this.sfxGain?.gain.setTargetAtTime(this.sfxVolume, now, 0.02);
  }

  private refreshControls(): void {
    const musicPercent = Math.round(this.musicVolume * 100);
    const sfxPercent = Math.round(this.sfxVolume * 100);
    this.controls.musicSlider.value = String(musicPercent);
    this.controls.sfxSlider.value = String(sfxPercent);
    this.controls.musicReadout.value = `${musicPercent}%`;
    this.controls.sfxReadout.value = `${sfxPercent}%`;
    this.controls.menuButton.textContent = `AUDIO ${musicPercent}/${sfxPercent}`;
    this.controls.menuButton.setAttribute("aria-label", `Audio settings. Music ${musicPercent} percent. Sound effects ${sfxPercent} percent.`);
  }

  private sliderVolume(slider: HTMLInputElement): number {
    return Math.max(0, Math.min(1, Number(slider.value) / 100));
  }

  private loadSettings(): void {
    try {
      const value = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null") as { music?: number; sfx?: number } | null;
      if (value && typeof value.music === "number" && value.music >= 0 && value.music <= 1) this.musicVolume = value.music;
      if (value && typeof value.sfx === "number" && value.sfx >= 0 && value.sfx <= 1) this.sfxVolume = value.sfx;
    } catch {
      // Malformed preferences simply fall back to the balanced defaults.
    }
  }

  private saveSettings(): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ music: this.musicVolume, sfx: this.sfxVolume }));
  }
}
