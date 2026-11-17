// Service Worker: Netzwerk zuerst, Cache nur als Offline-Rückfall.
// So erscheinen neue Versionen sofort, sobald eine Verbindung besteht.
const CACHE_NAME = 'pedi-notfall-v6';
const urlsToCache = [
  './',
  './index.html',
  './logic.js',
  './neonatal.js',
  './neonatal-sop.js',
  './neonatal-ui.js',
  './main.js',
  './manifest.json'
];

// Installation: Dateien vorab laden (einzelne Fehler verhindern die Installation nicht)
self.addEventListener('install', event => {
  self.skipWaiting(); // neue Version sofort aktivieren
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(urlsToCache.map(url => cache.add(new Request(url, { cache: 'reload' }))))
    )
  );
});

// Aktivierung: alte Caches löschen und offene Seiten sofort übernehmen
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Fetch: eigene Dateien zuerst aus dem Netzwerk (am Browser-Cache vorbei validiert),
// bei fehlender Verbindung aus dem Cache. Fremde Hosts (z. B. CDN) bleiben unberührt.
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigationen als normale GET-Anfrage neu aufbauen (am Browser-Cache vorbei validieren)
  const netReq = new Request(req.url, { cache: 'no-cache', credentials: 'same-origin', redirect: 'follow' });
  event.respondWith(
    fetch(netReq)
      .then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req.url, copy));
        }
        return res;
      })
      .catch(() => caches.match(req.url).then(hit => hit || caches.match('./index.html')))
  );
});
