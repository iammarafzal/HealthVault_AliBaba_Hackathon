/**
 * Bulletproof Native Desktop Notification Dispatcher for HealthVault AI
 * Supports both Service Worker registrations and direct Window.Notification fallback.
 */

export async function showDesktopNotification(
  title: string,
  body: string,
  url: string = '/emergency/activity',
  tag: string = 'emergency-alert'
) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('[Notifications] Browser does not support native notifications');
    return;
  }

  // If permission not granted, stop (must be requested by explicit click)
  if (Notification.permission !== 'granted') {
    console.warn('[Notifications] Permission is currently:', Notification.permission);
    return;
  }

  const options: NotificationOptions = {
    body,
    icon: '/icons/emergency-badge.png',
    badge: '/icons/badge-72x72.png',
    tag, // Deduplicates cards in Windows Action Center
    requireInteraction: true, // Forces Windows to keep toast visible instead of auto-dismissing
    silent: false, // Ensures Windows plays sound / wakes up banner
    data: { url },
  };

  try {
    // Method A: Dispatch via Service Worker (Most reliable on Windows Edge/Chrome)
    if ('serviceWorker' in navigator) {
      try {
        // Use 300ms timeout race so ready promise never blocks in dev mode if SW is unregistered
        const registration = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 300)),
        ]);

        if (registration && registration.showNotification) {
          await registration.showNotification(title, options);
          console.log('[Notifications] Dispatched via Service Worker');
          return;
        }
      } catch {
        // Fallback to direct Window Notification
      }
    }

    // Method B: Direct Window Notification Fallback
    const notification = new Notification(title, options);
    notification.onclick = () => {
      window.focus();
      window.location.href = url;
    };
    console.log('[Notifications] Dispatched via window.Notification');
  } catch (err) {
    console.error('[Notifications] Native toast failed:', err);
  }
}
