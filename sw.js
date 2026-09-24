// DG Khatabook (پیارا کھاتہ) — Service Worker
// Cache name is tied to the app version (PK_APP_VERSION in index.html).
// Bump CACHE_NAME every time you bump PK_APP_VERSION so old caches are cleared automatically.

const CACHE_NAME = 'dg-khatabook-cache-20260924-0807';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192x192.png',
  './icon-512x512.png',
  './icon-512x512-maskable.png',
  './fonts/JameelNooriNastaleeqKasheeda.ttf',
  './fonts/JameelNooriNastaleeqRegular.ttf'
];

// Install: pre-cache the app shell, activate immediately
self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_URLS).catch(function (err) {
        // Don't fail install if one optional asset (e.g. an icon) is missing
        console.log('DG Khatabook SW: precache warning', err);
      });
    })
  );
});

// Activate: drop any old versioned caches, take control right away
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// Fetch: network-first for the main HTML (so a fresh refresh gets the latest
// build), cache-first for everything else, with offline fallback to cache.
self.addEventListener('fetch', function (event) {
  var req = event.request;

  // Never intercept Firebase/Firestore or any other cross-origin / non-GET request
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) { return; }

  if (req.mode === 'navigate' || (req.method === 'GET' && req.headers.get('accept') && req.headers.get('accept').indexOf('text/html') !== -1)) {
    event.respondWith(
      fetch(req)
        .then(function (res) {
          var resClone = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, resClone); });
          return res;
        })
        .catch(function () {
          return caches.match(req).then(function (cached) {
            return cached || caches.match('./index.html');
          });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var resClone = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, resClone); });
        }
        return res;
      }).catch(function () {
        // no network, nothing cached — just fail silently for non-critical assets
      });
    })
  );
});

// Let the page (e.g. the 🔄 refresh button) ask this SW to activate immediately
self.addEventListener('message', function (event) {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
