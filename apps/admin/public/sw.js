/**
 * The admin app's only service worker. Plain JS, served as a static file — it
 * is deliberately not part of the Next build, so nothing here is transpiled or
 * bundled and what you read is what the browser runs.
 *
 * v1 does no offline caching. The app is a session-gated internal tool whose
 * every screen is live data; a stale cached shell would be worse than an error.
 * The worker exists for web push and nothing else, so it stays small enough to
 * audit at a glance.
 */

// Take over immediately rather than waiting for every tab to close. A worker
// this simple has no cache format to migrate, so there is nothing an old
// client could be holding that a new one would break.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * Payloads come from `apps/api` as `{ title, body, url, tag }`.
 *
 * A push that shows no notification burns the browser's budget and, after a
 * few, gets the subscription revoked — so every branch here ends in a
 * `showNotification`, including the one where the payload is unreadable.
 */
self.addEventListener("push", (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = {};
    }
  }

  const title = payload.title || "dashboard iaeste lleida";
  const url = payload.url || "/";

  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      tag: payload.tag || undefined,
      data: { url },
      icon: "/icon-192.png",
      badge: "/icon-192.png",
    }),
  );
});

/**
 * Focus an admin tab that is already open instead of stacking up duplicates,
 * and navigate it to the notification's target. Only opens a new window when
 * there is genuinely nothing to focus.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const target = new URL(
    (event.notification.data && event.notification.data.url) || "/",
    self.location.origin,
  );

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (new URL(client.url).origin !== target.origin) continue;
          if ("navigate" in client) {
            return client.navigate(target.href).then((navigated) => {
              return navigated ? navigated.focus() : client.focus();
            });
          }
          return client.focus();
        }
        return self.clients.openWindow(target.href);
      }),
  );
});
