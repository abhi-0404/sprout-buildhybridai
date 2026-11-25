/* Sprout service worker: lets the app shell reload while offline.
 * Hand-written on purpose (no build plugin). Vite hashes asset names, so assets are cached
 * at runtime on first fetch; the install step also pre-caches whatever index.html references.
 * Only same-origin GET requests are ever touched: Firebase and Gemini calls go straight to the
 * network and are never stored. Bump CACHE_VERSION to drop everything cached before. */
const CACHE_VERSION = 'v1';
const CACHE = `sprout-shell-${CACHE_VERSION}`;
const SCOPE = self.registration.scope; // e.g. https://host/
const INDEX_URL = new URL('index.html', SCOPE).href;
const NETWORK_TIMEOUT_MS = 4000;

async function precache() {
  const cache = await caches.open(CACHE);
  const res = await fetch(INDEX_URL, { cache: 'reload' });
  if (!res.ok) throw new Error('index.html not available');
  const html = await res.clone().text();
  await cache.put(INDEX_URL, res);
  const urls = new Set([new URL('manifest.webmanifest', SCOPE).href, new URL('icon.svg', SCOPE).href]);
  for (const m of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
    const u = new URL(m[1], SCOPE);
    if (u.origin === self.location.origin && u.pathname !== new URL(INDEX_URL).pathname) urls.add(u.href);
  }
  // One missing file must not break the install.
  await Promise.all([...urls].map((u) => cache.add(u).catch(() => {})));
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()).catch(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('sprout-shell-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function withTimeout(p, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

async function networkFirstPage() {
  const cache = await caches.open(CACHE);
  try {
    const res = await withTimeout(fetch(INDEX_URL), NETWORK_TIMEOUT_MS);
    if (res.ok) {
      await cache.put(INDEX_URL, res.clone()).catch(() => {});
      return res;
    }
    // Server error or outage page: a known good shell beats a broken one.
    return (await cache.match(INDEX_URL)) ?? res;
  } catch {
    const cached = await cache.match(INDEX_URL);
    if (cached) return cached;
    return fetch(INDEX_URL);
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  // Only full 200 responses; a failed put (quota, 206) must never break the real response.
  if (res.status === 200 && res.type === 'basic') await cache.put(request, res.clone()).catch(() => {});
  return res;
}

const SCOPE_PATH = new URL(SCOPE).pathname;
const SHELL_PATHS = new Set([SCOPE_PATH, new URL(INDEX_URL).pathname]);

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (request.headers.has('range')) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // never touch Firebase, Gemini or any other origin
  // Firebase Hosting reserved paths (/__/auth/handler, /__/auth/iframe, /__/firebase/init.json)
  // are same-origin when the app is served from its authDomain: always straight to the network.
  if (url.pathname.startsWith('/__/')) return;
  if (url.pathname.endsWith('/sw.js')) return;
  if (request.mode === 'navigate') {
    // The app routes by hash, so only the shell itself gets the offline fallback. Any other
    // page (or a popup/iframe navigation) must load what the server actually returns.
    if (SHELL_PATHS.has(url.pathname)) event.respondWith(networkFirstPage());
    return;
  }
  event.respondWith(cacheFirst(request));
});
