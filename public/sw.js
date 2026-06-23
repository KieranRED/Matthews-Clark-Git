// Matthews & Clark CRM — Service Worker
// Handles Web Push notifications and routes notification taps to the correct thread.

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? "New WhatsApp";
  const options = {
    body: data.body ?? "",
    data: data.data ?? {},
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.data?.threadId,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/admin/whatsapp";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes("/admin") && "focus" in client) {
          client.focus();
          client.postMessage({ type: "navigate", url });
          return;
        }
      }
      return clients.openWindow(url);
    })
  );
});
