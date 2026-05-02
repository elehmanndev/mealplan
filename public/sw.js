const CACHE = 'mealplan-v1';
const PRECACHE_URLS = ['/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isShoppingNavigation(req) {
  return req.mode === 'navigate' && new URL(req.url).pathname.startsWith('/shopping');
}

function isShoppingApi(req) {
  return new URL(req.url).pathname.startsWith('/api/shopping');
}

function isStatic(req) {
  return new URL(req.url).pathname.startsWith('/_next/static');
}

async function networkFirst(req) {
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.ok) {
      const cache = await caches.open(CACHE);
      cache.put(req, fresh.clone());
    }
    return fresh;
  } catch {
    const cached = await caches.match(req);
    if (cached) return cached;
    throw new Error('offline');
  }
}

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  const fresh = await fetch(req);
  if (fresh && fresh.ok) {
    const cache = await caches.open(CACHE);
    cache.put(req, fresh.clone());
  }
  return fresh;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') {
    if (isShoppingApi(req)) {
      event.respondWith(
        fetch(req).catch(
          () =>
            new Response(JSON.stringify({ offline: true }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            }),
        ),
      );
    }
    return;
  }

  if (isShoppingNavigation(req) || isShoppingApi(req)) {
    event.respondWith(networkFirst(req));
    return;
  }

  if (isStatic(req)) {
    event.respondWith(cacheFirst(req));
    return;
  }
});

// NOTE: Offline mutation queueing via IndexedDB + Background Sync is a future
// enhancement. Today, taps made while offline simply fail and the UI must show
// a toast. The shared-state guarantee (Eric + partner sync) requires online.
