const STATIC_CACHE = "wajib-static-v1";
const RUNTIME_CACHE = "wajib-runtime-v1";
const OFFLINE_URL = "/offline";
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/logos/logo.png",
  "/logos/logo-white.png",
  "/logos/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                cacheName !== STATIC_CACHE && cacheName !== RUNTIME_CACHE,
            )
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

const isStaticAssetRequest = (request, requestUrl) =>
  requestUrl.pathname.startsWith("/_next/static/") ||
  requestUrl.pathname.startsWith("/_next/image") ||
  requestUrl.pathname.startsWith("/logos/") ||
  requestUrl.pathname.startsWith("/icons/") ||
  request.destination === "style" ||
  request.destination === "script" ||
  request.destination === "font" ||
  request.destination === "image" ||
  request.destination === "manifest";

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (requestUrl.pathname.startsWith("/api/")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          void caches
            .open(RUNTIME_CACHE)
            .then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          return (
            (await caches.match(OFFLINE_URL)) ||
            new Response("Offline", { status: 503, statusText: "Offline" })
          );
        }),
    );
    return;
  }

  if (isStaticAssetRequest(request, requestUrl)) {
    event.respondWith(
      caches.match(request).then(async (cachedResponse) => {
        if (cachedResponse) return cachedResponse;

        const networkResponse = await fetch(request);
        const responseClone = networkResponse.clone();
        void caches
          .open(STATIC_CACHE)
          .then((cache) => cache.put(request, responseClone));
        return networkResponse;
      }),
    );
    return;
  }

  event.respondWith(
    fetch(request).catch(async () => {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) return cachedResponse;
      return new Response("Offline", { status: 503, statusText: "Offline" });
    }),
  );
});
