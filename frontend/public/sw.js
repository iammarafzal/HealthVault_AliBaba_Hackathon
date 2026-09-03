// HealthVault AI — Service Worker for Web Push Notifications & Routine Sync
// Handles push payload processing, OS notification display, tab focus on click,
// auto-dismissal of completed dose notifications, and multi-tab synchronization.

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch (e) {
    payload = { title: 'Medicine Reminder', body: event.data.text() };
  }

  // 1. Check for Silent Auto-Dismissal Instruction
  if (payload.type === 'DISMISS_DOSE_NOTIFICATION' && payload.tag) {
    event.waitUntil(
      self.registration.getNotifications({ tag: payload.tag }).then((notifications) => {
        notifications.forEach((notification) => notification.close());
      })
    );

    // Notify all open client windows to sync their dose state
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('hv_dose_updates');
        channel.postMessage({ type: 'DOSE_DISMISSED', ...payload });
      }
    } catch (e) {
      // BroadcastChannel optional fallback
    }
    return;
  }

  // 2. Regular Reminder Push Notification Display
  const tag = payload.tag || `dose-reminder-${payload.slot || 'slot'}-${Date.now()}`;
  const options = {
    body: payload.body || 'Time to take your scheduled dose.',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: tag,
    renotify: true,
    vibrate: [100, 50, 100],
    data: {
      url: payload.url || '/planner',
      slot: payload.slot,
      timestamp: Date.now(),
      tag: tag,
    },
    actions: [
      { action: 'open_planner', title: 'Open Planner' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Medicine Reminder', options)
  );

  // Broadcast to open dashboard tabs that a reminder has arrived
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('hv_dose_updates');
      channel.postMessage({ type: 'REMINDER_RECEIVED', ...payload });
    }
  } catch (e) {
    // Ignore
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/planner';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a tab with this URL is already open, focus it
      for (const client of windowClients) {
        if (client.url && client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
