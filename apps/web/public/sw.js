/* eslint-disable no-restricted-globals */
self.addEventListener("push", (event) => {
  let data = {
    title: "Mağaza Platform",
    body: "Yeni bildiriminiz var",
    linkUrl: "/",
    icon: "/api/v1/branding/icon/192",
  };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch {
    /* keep defaults */
  }

  const options = {
    body: data.body,
    icon: data.icon || "/api/v1/branding/icon/192",
    badge: "/api/v1/branding/icon/192",
    data: { linkUrl: data.linkUrl || "/" },
    tag: "magaza-notification",
    renotify: true,
    silent: false,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const linkUrl = event.notification.data?.linkUrl || "/";
  const target = new URL(linkUrl, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ("focus" in client) {
            client.navigate(target);
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(target);
        return undefined;
      })
  );
});

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
