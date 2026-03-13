const CACHE_NAME = "bitacora-v6";
const PRECACHE = [
  "/",
  "/index.html",
  "/report-view.html",
  "/report-view.css",
  "/report-view.js",
  "/styles.css",
  "/app.js",
  "/manifest.webmanifest",
  "/offline.html",
  "/icons/icon.svg",
  "/icons/icon-maskable.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  const normalizedPath = url.pathname === "" ? "/" : url.pathname;
  const isStaticAsset = PRECACHE.includes(normalizedPath);

  if (!isStaticAsset) {
    // Nunca cachear respuestas API ni datos de sesion para evitar fuga entre usuarios.
    return;
  }

  event.respondWith(
    caches.match(request).then(async (cached) => {
      if (cached) {
        return cached;
      }

      try {
        const response = await fetch(request);
        if (response.ok && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      } catch (_error) {
        if (request.mode === "navigate") {
          return caches.match("/offline.html");
        }
        return new Response("Offline", { status: 503, statusText: "Offline" });
      }
    })
  );
});
