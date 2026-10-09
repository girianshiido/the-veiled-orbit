const CACHE_NAME = "veiled-orbit-weather-dome-v73";
const MUSIC_FILES = [
  "armor-shop", "battle", "dungeon", "game-over", "inn", "item-shop",
  "party-house", "revival-shop", "save-shop", "teleport", "title",
  "victory", "village", "weapon-shop", "world",
].map((name) => `./assets/audio/music/${name}.ogg`);
const CORE_FILES = ["./", "./index.html", "./manifest.webmanifest", ...MUSIC_FILES];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached ?? fetch(event.request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      }
      return response;
    })),
  );
});
