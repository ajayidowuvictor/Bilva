// Bilva's service worker. It exists so the app can be installed and shows a
// friendly message when the phone is offline. It does not store pages or
// account data, so nobody ever sees stale or someone else's content.
const OFFLINE_PAGE =
  '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">' +
  "<title>Bilva is offline</title></head>" +
  '<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#01002a;color:#fff;font-family:system-ui,sans-serif;text-align:center;padding:24px">' +
  '<div><h1 style="margin:0 0 8px">You are offline</h1>' +
  '<p style="margin:0 0 20px;color:#b9bcdd">Bilva needs the internet to write your copy. Check your connection and try again.</p>' +
  '<button onclick="location.reload()" style="font:inherit;font-weight:700;padding:12px 22px;border:0;border-radius:999px;background:#d40a7b;color:#fff">Try again</button>' +
  "</div></body></html>";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(
      () =>
        new Response(OFFLINE_PAGE, {
          status: 503,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }),
    ),
  );
});
