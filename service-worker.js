// DQFM PWA Service Worker (SWR for assets, network-first for JSON)
const VERSION = 'v3';
const CACHE_STATIC = `dqfm-static-${VERSION}`;
const CACHE_PAGES = `dqfm-pages-${VERSION}`;

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './offline.html',
  './app.js',
  './styles.css',
  './theme.css',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_STATIC);
    await cache.addAll(CORE_ASSETS.filter(Boolean));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(n => ![CACHE_STATIC, CACHE_PAGES].includes(n)).map(n => caches.delete(n)));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET') return;

  if (url.pathname.endsWith('.json')) {
    event.respondWith(networkFirst(req));
    return;
  }
  if (url.origin === location.origin) {
    event.respondWith(staleWhileRevalidate(req));
  }
});

async function networkFirst(request){
  const cache = await caches.open(CACHE_PAGES);
  try {
    const res = await fetch(request);
    cache.put(request, res.clone());
    return res;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    const offline = await caches.match('./offline.html');
    return offline || new Response('Offline', {status:503});
  }
}

async function staleWhileRevalidate(request){
  const cache = await caches.open(CACHE_STATIC);
  const cached = await cache.match(request);
  const network = fetch(request).then(res => {
    cache.put(request, res.clone());
    return res;
  }).catch(() => cached);
  return cached || network;
}
