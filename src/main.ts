import "./style.css";
import { Game } from "./core/Game";
import { FORMATIONS, type FormationId } from "./battle/battleData";

const canvas = document.querySelector<HTMLCanvasElement>("#game");
const locationElement = document.querySelector<HTMLElement>("#location");
const saveElement = document.querySelector<HTMLElement>("#save-state");
const loadingElement = document.querySelector<HTMLElement>("#loading");
const audioMenuButton = document.querySelector<HTMLButtonElement>("#audio-menu-toggle");
const audioPanel = document.querySelector<HTMLElement>("#audio-settings");
const musicSlider = document.querySelector<HTMLInputElement>("#music-control");
const sfxSlider = document.querySelector<HTMLInputElement>("#sfx-control");
const musicReadout = document.querySelector<HTMLOutputElement>("#music-volume");
const sfxReadout = document.querySelector<HTMLOutputElement>("#sfx-volume");
const sfxPreviewButton = document.querySelector<HTMLButtonElement>("#sfx-preview");

if (!canvas || !locationElement || !saveElement || !loadingElement || !audioMenuButton || !audioPanel || !musicSlider || !sfxSlider || !musicReadout || !sfxReadout || !sfxPreviewButton) {
  throw new Error("The game shell is incomplete.");
}

const game = new Game(canvas, locationElement, saveElement, {
  menuButton: audioMenuButton,
  panel: audioPanel,
  musicSlider,
  sfxSlider,
  musicReadout,
  sfxReadout,
  previewButton: sfxPreviewButton,
});
const debugMap = import.meta.env.DEV
  ? new URLSearchParams(window.location.search).get("debugMap") ?? undefined
  : undefined;
const debugDialogue = import.meta.env.DEV
  ? new URLSearchParams(window.location.search).get("debugDialogue") ?? undefined
  : undefined;
const requestedBattle = import.meta.env.DEV
  ? new URLSearchParams(window.location.search).get("debugBattle")
  : null;
const debugBattle: FormationId | undefined = requestedBattle && requestedBattle in FORMATIONS
  ? requestedBattle as FormationId
  : undefined;
const requestedDebugParty = import.meta.env.DEV
  ? new URLSearchParams(window.location.search).get("debugParty")
  : null;
const debugParty = requestedDebugParty === "duo" || requestedDebugParty === "trio" || requestedDebugParty === "quartet"
  ? requestedDebugParty
  : undefined;
const requestedDebugLevel = import.meta.env.DEV
  ? Number(new URLSearchParams(window.location.search).get("debugLevel"))
  : 0;
const debugLevel = Number.isInteger(requestedDebugLevel) && requestedDebugLevel >= 1
  ? Math.min(25, requestedDebugLevel)
  : undefined;

game.start(debugMap, debugDialogue, debugBattle, debugParty, debugLevel)
  .then(() => loadingElement.classList.add("hidden"))
  .catch((error: unknown) => {
    console.error(error);
    loadingElement.textContent = "WORLD DATA COULD NOT BE LOADED";
  });

if (import.meta.env.DEV && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
    .catch(() => undefined);
}

if (import.meta.env.PROD && "serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}service-worker.js`).catch(() => undefined);
  });
}
