/* Woolgather service worker
   ---------------------------------------------------------------
   Strategy:
   - App shell (HTML, icons, fonts, CDN libraries): cached so the app
     opens instantly and works with no connection.
   - Firebase Storage photos: cache-first, so showcase/project images
     show offline once they've been seen.
   - Firestore/Auth traffic: never touched here — Firestore's own
     persistent cache handles offline data. We deliberately let those
     requests pass straight through to the network.

   IMPORTANT — updating the app:
   Bump CACHE_VERSION whenever you deploy a new woolgather.html (or any
   shell asset). The old cache is deleted on activate, so users get the
   new version instead of a stale one. This is the single most important
   line for avoiding "I deployed a fix but still see the old app".
*/

const CACHE_VERSION = 'woolgather-v11';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const PHOTO_CACHE = `${CACHE_VERSION}-photos`;

// Core files the app needs to boot. Same-origin assets only here.
const SHELL_ASSETS = [
  '/woolgather.html',
  '/styles.css',
  '/app.js',
  '/firebase-init.js',
  '/manifest.webmanifest',
  '/icons/icon-180.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/favicon-32.png',
];

// Cross-origin libraries/fonts we also want available offline.
const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    // Cache same-origin shell first (must all succeed).
    await cache.addAll(SHELL_ASSETS);
    // CDN assets are best-effort — a single CDN hiccup shouldn't fail install.
    await Promise.allSettled(CDN_ASSETS.map((u) => cache.add(u)));
    self.skipWaiting(); // activate the new SW as soon as it's ready
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Delete any caches that aren't the current version.
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k))
    );
    await self.clients.claim(); // take control of open pages immediately
  })());
});

// Let the page tell a waiting SW to activate right away (used by the
// "new version available" refresh in the app).
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

function isFirebaseTraffic(url) {
  return (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebaseauth') ||
    url.hostname.includes('identitytoolkit') ||
    url.hostname.includes('googleapis.com') && url.pathname.includes('/google.firestore')
  );
}
function isFirebasePhoto(url) {
  // Firebase Storage download URLs
  return (
    url.hostname.includes('firebasestorage.googleapis.com') ||
    url.hostname.includes('firebasestorage.app')
  );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // never cache writes/uploads

  let url;
  try { url = new URL(req.url); } catch (e) { return; }

  // Firestore/Auth: pass through untouched — Firestore handles its own cache.
  if (isFirebaseTraffic(url)) return;

  // Photos: cache-first (show instantly + offline), then network-fill.
  if (isFirebasePhoto(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(PHOTO_CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      try {
        const resp = await fetch(req);
        if (resp && resp.status === 200) cache.put(req, resp.clone());
        return resp;
      } catch (e) {
        return hit || Response.error();
      }
    })());
    return;
  }

  // Navigations (loading the app itself): network-first so you get the
  // latest when online, falling back to the cached shell when offline.
  // The fallback is deliberately forgiving — iOS may launch the installed
  // app with a slightly different URL (query params, or "/" instead of the
  // full filename), so we ignore the query string and, as a last resort,
  // return the cached shell for ANY navigation rather than 404-ing offline.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        return await fetch(req);
      } catch (e) {
        const cache = await caches.open(SHELL_CACHE);
        return (
          (await cache.match(req, { ignoreSearch: true })) ||
          (await cache.match('/woolgather.html', { ignoreSearch: true })) ||
          (await cache.match('/', { ignoreSearch: true })) ||
          Response.error()
        );
      }
    })());
    return;
  }

  // Shell assets + CDN libs: cache-first, fall back to network.
  // Note we match ALL of gstatic.com (not just the Firebase entry files),
  // because the Firebase SDK modules pull in additional @firebase/* chunks
  // from gstatic at runtime — those must be cached too or offline import fails.
  if (
    url.origin === self.location.origin ||
    CDN_ASSETS.some((u) => req.url.startsWith(u.split('?')[0])) ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('www.gstatic.com') ||
    url.hostname.includes('cdn.jsdelivr.net')
  ) {
    event.respondWith((async () => {
      const cache = await caches.open(SHELL_CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      try {
        const resp = await fetch(req);
        if (resp && resp.status === 200) cache.put(req, resp.clone());
        return resp;
      } catch (e) {
        return hit || Response.error();
      }
    })());
  }
});
