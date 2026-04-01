const STATIC_CACHE = "yubul-static-v1";
const RUNTIME_CACHE = "yubul-runtime-v1";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico",
  "/logo192.png",
  "/logo512.png",
  "/logo_nobg.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        cache.addAll(
          CORE_ASSETS.map((asset) => new Request(asset, { cache: "reload" }))
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => ![STATIC_CACHE, RUNTIME_CACHE].includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(async () => {
          const cachedPage = await caches.match(event.request);
          return cachedPage || caches.match("/index.html");
        })
    );
    return;
  }

  const isStaticAsset = ["script", "style", "image", "font"].includes(
    event.request.destination
  );
  if (!isStaticAsset && !requestUrl.pathname.endsWith(".json")) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        const copy = networkResponse.clone();
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, copy));
        return networkResponse;
      });
    })
  );
});
