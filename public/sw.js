/* ÓrbitaX service worker: offline screen + push notifications. */
const CACHE = "orbitax-shell-v1";
const SHELL = ["/offline.html", "/icons/icon-192.png", "/icons/badge-96.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Pages always come from the network (live data); without internet, a friendly offline screen.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.mode !== "navigate" || req.method !== "GET") return;
  event.respondWith(fetch(req).catch(() => caches.match("/offline.html")));
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "ÓrbitaX", body: event.data ? event.data.text() : "" };
  }
  const url = data.url || "/notificacoes";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // App open and in front of the person: the in-app alert already shows it.
      const visible = clients.some((c) => c.visibilityState === "visible" && c.focused);
      if (visible) return;
      return self.registration.showNotification(data.title || "ÓrbitaX", {
        body: data.body || "",
        icon: data.icon || "/icons/icon-192.png",
        badge: "/icons/badge-96.png",
        tag: data.tag || undefined,
        renotify: Boolean(data.tag),
        data: { url },
      });
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if (new URL(c.url).origin === self.location.origin && "focus" in c) {
          return c.focus().then((w) => (w && "navigate" in w ? w.navigate(url) : undefined));
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
