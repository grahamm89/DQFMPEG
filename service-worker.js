/* Simple PWA Service Worker with update-on-refresh and network-first for data.json */
const VERSION = 'v1.0.0';
const APP_CACHE = `peg-tool-${VERSION}`;
const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './data.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k.startsWith('peg-tool-') && k !== APP_CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for data.json to avoid stale content; Cache-first for the rest.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (url.pathname.endsWith('/data.json') || url.pathname.endsWith('data.json')) {
    event.respondWith(networkFirst(request));
  } else {
    event.respondWith(cacheFirst(request));
  }
});

async function networkFirst(request) {
  try {
    const fresh = await fetch(request, {cache:'no-store'});
    const cache = await caches.open(APP_CACHE);
    cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    const cache = await caches.open(APP_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(APP_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  cache.put(request, fresh.clone());
  return fresh;
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
