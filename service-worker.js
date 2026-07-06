const CACHE_NAME = "treino-app-v13";
const ASSETS = [
  "./index.html",
  "./manifest.json",
  "./icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Check if it is a navigation request or index.html
  const isNavigation = event.request.mode === "navigate" || 
                       url.pathname.endsWith("/index.html") || 
                       url.pathname.endsWith("/");

  if (isNavigation) {
    // Network-First strategy for the main HTML file
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => {
          // If offline, try matching the exact request, otherwise fallback to ./index.html
          return caches.match(event.request).then((cached) => {
            return cached || caches.match("./index.html");
          });
        })
    );
  } else {
    // Stale-While-Revalidate strategy for static assets (icons, manifest, etc.)
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const networkFetch = fetch(event.request)
          .then((response) => {
            if (response && response.status === 200) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            }
            return response;
          })
          .catch(() => {
            // Ignore network errors, offline fallback is handled by return cached
          });
        return cached || networkFetch;
      })
    );
  }
});
