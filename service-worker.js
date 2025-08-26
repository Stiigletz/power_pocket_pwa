// Basic offline cache
const CACHE = "ppc-cache-v2-" + Date.now(); // bump automatically
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./assets/icon-512.png",
  "./assets/icon.svg",
  "./assets/background.png"
];

self.addEventListener("install", (e) => {
  self.skipWaiting(); // activate new SW immediately
});
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => k.startsWith("ppc-cache-") && k !== CACHE ? caches.delete(k) : null));
    await self.clients.claim(); // control existing pages right away
  })());
});


self.addEventListener("install", (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS.filter(Boolean))));
});

self.addEventListener("activate", (e)=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
});

self.addEventListener("fetch", (e)=>{
  e.respondWith(
    caches.match(e.request).then(resp=> resp || fetch(e.request))
  );
});
