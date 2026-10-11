// Service worker: offline shell, cached word list, and range-capable audio cache.
const VERSION = "v3";
const SHELL_CACHE = `latin-shell-${VERSION}`;
const AUDIO_CACHE = "latin-audio-v3"; // shared with src/lib/offline.ts
const PRECACHE = ["/", "/study", "/words", "/settings", "/drill", "/data/words.json", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((c) => Promise.allSettled(PRECACHE.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => (k.startsWith("latin-shell-") && k !== SHELL_CACHE) || (k.startsWith("latin-audio-") && k !== AUDIO_CACHE)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Safari (and others) request audio with Range headers and require a 206 reply.
async function rangeResponse(request, response) {
  const range = request.headers.get("range");
  if (!range || !response || response.status !== 200) return response;
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  if (!m) return response;
  const buf = await response.arrayBuffer();
  const size = buf.byteLength;
  let start = m[1] === "" ? Math.max(0, size - Number(m[2])) : Number(m[1]);
  let end = m[1] === "" || m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  if (start >= size || start > end) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  }
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "audio/mpeg",
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
    },
  });
}

async function audio(request) {
  const cache = await caches.open(AUDIO_CACHE);
  const url = new URL(request.url);
  const key = url.origin + url.pathname; // ignore Range/query when matching
  const hit = await cache.match(key);
  if (hit) return rangeResponse(request, hit);
  // Not downloaded yet: fetch the whole file (not a ranged one) so it can be cached.
  const res = await fetch(key);
  if (res.ok) {
    cache.put(key, res.clone()).catch(() => {});
    return rangeResponse(request, res);
  }
  return res;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(SHELL_CACHE);
  const hit = await cache.match(request);
  const refresh = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  return hit || (await refresh) || Response.error();
}

async function cacheFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

async function navigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    return (await cache.match(request)) || (await cache.match("/")) || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/audio/")) event.respondWith(audio(request));
  else if (url.pathname.startsWith("/_next/static/")) event.respondWith(cacheFirst(request));
  else if (url.pathname === "/data/words.json" || url.pathname.startsWith("/icons/")) event.respondWith(staleWhileRevalidate(request));
  else if (request.mode === "navigate") event.respondWith(navigation(request));
});
