const CACHE_NAME = "bitacora-v33";
const PRECACHE = [
  "/",
  "/index.html",
  "/report-view.html",
  "/report-view.css",
  "/assets/report-view.min.js?asset=report",
  "/styles.css?v=33",
  "/assets/app.min.js?asset=web&v=33",
  "/assets/tasks.min.js?asset=tasks&v=33",
  "/assets/security.min.js?asset=sec",
  "/manifest.webmanifest",
  "/offline.html",
  "/icons/icon.svg",
  "/icons/icon-maskable.svg"
];
const STATIC_ASSET_PATHS = new Set(PRECACHE.map((entry) => new URL(entry, self.location.origin).pathname));

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
  const isStaticAsset = STATIC_ASSET_PATHS.has(normalizedPath);

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && response.type === "basic") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cachedPage = await caches.match(request);
          if (cachedPage) {
            return cachedPage;
          }
          return caches.match("/offline.html");
        })
    );
    return;
  }

  if (!isStaticAsset) {
    // Nunca cachear respuestas API ni datos de sesion para evitar fuga entre usuarios.
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) {
          return cached;
        }
        return new Response("Offline", { status: 503, statusText: "Offline" });
      })
  );
});
