/* ÓrbitaX service worker: app abre sem internet (último conteúdo visto) + notificações push. */
const SHELL_CACHE = "orbitax-shell-v2";
const PAGES_CACHE = "orbitax-pages-v1"; // páginas já abertas por quem está logado neste aparelho
const ASSETS_CACHE = "orbitax-assets-v1"; // JS/CSS/fontes do app (nomes com hash, nunca mudam)
const MEDIA_CACHE = "orbitax-media-v1"; // fotos já vistas (avatares, capas, posts)
const KEEP = [SHELL_CACHE, PAGES_CACHE, ASSETS_CACHE, MEDIA_CACHE];
const SHELL = ["/offline.html", "/icons/icon-192.png", "/icons/badge-96.png"];
const LIMITS = { [PAGES_CACHE]: 40, [ASSETS_CACHE]: 400, [MEDIA_CACHE]: 300 };
// Telas que nunca ficam guardadas (dados sensíveis ou fluxos que precisam do servidor).
// No `next dev` os arquivos mudam sem trocar de nome: lá eles nunca são guardados.
const DEV = self.location.hostname === "localhost" || self.location.hostname === "127.0.0.1";
const NO_PAGE_CACHE = /^\/(api|auth|admin)(\/|$)/;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trim(cacheName) {
  const max = LIMITS[cacheName];
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

function put(cacheName, req, res) {
  return caches
    .open(cacheName)
    .then((c) => c.delete(req).then(() => c.put(req, res))) // apaga antes: a ordem vira "mais recente por último"
    .then(() => trim(cacheName))
    .catch(() => {});
}

// Páginas: sempre da rede (dados ao vivo). Sem internet, abre o que já foi visto em vez de travar.
async function page(event) {
  const req = event.request;
  const url = new URL(req.url);
  try {
    const res = await fetch(req);
    if (res.ok && res.type === "basic" && !res.redirected && !NO_PAGE_CACHE.test(url.pathname)) {
      event.waitUntil(put(PAGES_CACHE, url.origin + url.pathname + url.search, res.clone()));
    }
    return res;
  } catch (err) {
    const cache = await caches.open(PAGES_CACHE);
    const hit =
      (await cache.match(url.origin + url.pathname + url.search)) ||
      (await cache.match(url.origin + url.pathname, { ignoreSearch: true })) ||
      (await cache.match(url.origin + "/feed", { ignoreSearch: true }));
    return hit || (await caches.match("/offline.html")) || Response.error();
  }
}

// Arquivos do app com hash no nome: guardados na primeira vez, servidos do aparelho depois.
async function asset(event) {
  const cached = await caches.match(event.request, { cacheName: ASSETS_CACHE });
  if (cached) return cached;
  const res = await fetch(event.request);
  if (res.ok) event.waitUntil(put(ASSETS_CACHE, event.request, res.clone()));
  return res;
}

// Fotos: mostra a versão guardada na hora e atualiza em segundo plano.
// Fotos do Supabase vêm por CORS para dar para guardar (resposta "opaca" ocuparia MBs à toa).
async function media(event, cors) {
  const key = event.request.url;
  const cached = await caches.match(key, { cacheName: MEDIA_CACHE });
  const network = fetch(cors ? new Request(key, { mode: "cors", credentials: "omit" }) : event.request)
    .then((res) => {
      if (res.ok && res.type !== "opaque") put(MEDIA_CACHE, key, res.clone());
      return res;
    })
    .catch(() => null);
  if (cached) {
    event.waitUntil(network);
    return cached;
  }
  return (await network) || fetch(event.request);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (req.mode === "navigate") return event.respondWith(page(event));

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith("/_next/static/") && !DEV) return event.respondWith(asset(event));
    if (req.destination === "image" && !url.pathname.startsWith("/api/")) return event.respondWith(media(event, false));
    return;
  }

  if (req.destination === "image" && /\.supabase\.co$/.test(url.hostname) && url.pathname.startsWith("/storage/v1/object/public/")) {
    return event.respondWith(media(event, true));
  }
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
