// Trading Intelligence — Service Worker v1
// Handles Web Push notifications for chain signal alerts

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data?.json() || {}; } catch(e) {}
  const title = data.title || '\u26a1 Chain Signal';
  const options = {
    body:     data.body  || 'A new chain signal has fired.',
    icon:     '/icon-192.png',
    badge:    '/icon-192.png',
    tag:      data.tag   || 'signal-alert',
    renotify: true,
    data:     { url: data.url || '/' },
    actions: [
      { action: 'view',    title: 'View Signal' },
      { action: 'dismiss', title: 'Dismiss'     }
    ]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes(self.location.origin));
      if (existing) { existing.focus(); return existing.navigate(url); }
      return clients.openWindow(url);
    })
  );
});
