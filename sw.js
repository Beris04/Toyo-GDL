const CACHE = "toyo-gdl-v1";
const FILES = [
  "./",
  "./index.html",
  "./app.html",
  "./dashboard.html",
  "./manifest.json"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(FILES))
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
