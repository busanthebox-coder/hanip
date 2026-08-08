const CACHE_VERSION = 'hanip-pwa-5d2e60b251d4';
const PRECACHE_URLS = [
  "./",
  "./assets/a1-BRrjr23S.js",
  "./assets/a1-eWQzbGHB.json",
  "./assets/index-B2YTinC1.js",
  "./assets/index-CjcOl-rz.css",
  "./data/bites-index.json",
  "./icons/apple-touch-icon-180.png",
  "./icons/hanip-bowl.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./index.html",
  "./manifest.webmanifest"
];
const CACHE_PREFIX = 'hanip-pwa-';
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const SCOPE_URL = self.registration.scope;
const INDEX_URL = new URL('./index.html', SCOPE_URL).href;
const PRECACHE_SET = new Set(PRECACHE_URLS.map((url) => new URL(url, SCOPE_URL).href));

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_VERSION && key !== RUNTIME_CACHE)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_VERSION);
    await cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request).then((response) => {
    if (!response.ok) return response;
    return cache.put(request, response.clone()).then(() => response);
  });
  if (cached) {
    network.catch(() => undefined);
    return cached;
  }
  return network;
}

async function navigationResponse(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      await cache.put(INDEX_URL, response.clone());
    }
    return response;
  } catch {
    const index = await caches.match(INDEX_URL);
    return index || caches.match(new URL('./', SCOPE_URL).href);
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(SCOPE_URL)) return;

  if (request.mode === 'navigate') {
    event.respondWith(navigationResponse(request));
  } else if (PRECACHE_SET.has(url.href)) {
    event.respondWith(cacheFirst(request));
  } else if (url.pathname.includes('/assets/')) {
    // Lazy level chunks, wordbook shards, snacks, readers, clusters, guide, and hanja.
    event.respondWith(staleWhileRevalidate(request));
  }
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
