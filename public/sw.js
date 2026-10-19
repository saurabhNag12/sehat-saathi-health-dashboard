const CACHE_NAME = 'sehat-saathi-shell-v2';
const SHELL_PATHS = ['/', '/index.html', '/manifest.webmanifest', '/icons/sehat-saathi.svg'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(SHELL_PATHS);
    // Vite writes hashed JS/CSS asset paths into index.html. Pre-cache those files
    // during installation so the first controlled offline visit has its app bundle.
    const response = await fetch('/index.html', { cache: 'no-cache' });
    if (response.ok) {
      const html = await response.clone().text();
      await cache.put('/index.html', response.clone());
      const assetPaths = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)]
        .map(match => match[1])
        .filter(path => path.startsWith('/assets/'));
      await Promise.all(assetPaths.map(path => cache.add(path).catch(() => undefined)));
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Never cache API calls or patient responses. This prototype has no API.
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put('/index.html', response.clone()));
      return response;
    }).catch(async () => (await caches.match('/index.html')) || (await caches.match('/'))));
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
      return response;
    })));
  }
});
