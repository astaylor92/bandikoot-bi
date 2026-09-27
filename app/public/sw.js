// Minimal app-shell cache: static assets cache-first, API requests untouched.
const CACHE = 'undercoot-shell-v3';

self.addEventListener('install', (event) => {
  // Relative to the SW scope so the app works from a subpath (GitHub Pages).
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './manifest.webmanifest', './icon.svg', './brand/bandicoot.png'])));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return; // never touch API calls
  if (url.pathname.includes('/api/')) return;
  // The page shell and fixture index change between deploys: network first, cache as offline fallback.
  if (event.request.mode === 'navigate' || url.pathname.endsWith('/fixtures/index.json')) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(event.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(event.request)),
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request).then((res) => {
          if (res.ok && event.request.method === 'GET') {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(event.request, clone));
          }
          return res;
        }),
    ),
  );
});
