"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getVapidPublicKey,
  sendTestPush,
  subscribePush,
  unsubscribePush,
  type TestPushResponse,
} from "@/services/notificationService";

/**
 * Converts a URL-safe base64 string into a Uint8Array suitable for
 * PushManager.subscribe({ applicationServerKey }).
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface UseWebPushReturn {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission;
  isLoading: boolean;
  error: string | null;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  sendTestNotification: () => Promise<TestPushResponse | null>;
}

export function useWebPush(): UseWebPushReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check initial browser capabilities & existing subscription
  useEffect(() => {
    if (typeof window === "undefined") return;

    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);

      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then(async (subscription) => {
          if (subscription) {
            setIsSubscribed(true);
            try {
              const subJson = subscription.toJSON();
              if (subJson.keys?.p256dh && subJson.keys?.auth) {
                await subscribePush({
                  endpoint: subscription.endpoint,
                  keys: {
                    p256dh: subJson.keys.p256dh,
                    auth: subJson.keys.auth,
                  },
                  user_agent: navigator.userAgent,
                });
              }
            } catch (syncErr) {
              console.warn("Auto-sync push subscription to backend warning:", syncErr);
            }
          } else {
            setIsSubscribed(false);
          }
        })
        .catch((err) => {
          console.warn("Failed to read push subscription status:", err);
        });
    }
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError("Web Push Notifications are not supported on this browser.");
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Request user permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        setError("Notification permission was denied.");
        return false;
      }

      // 2. Register service worker
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      await navigator.serviceWorker.ready;

      // 3. Fetch VAPID public key from backend
      const { public_key } = await getVapidPublicKey();
      if (!public_key) {
        throw new Error("Server did not return a valid VAPID public key.");
      }

      const applicationServerKey = urlBase64ToUint8Array(public_key);

      // 4. Subscribe with browser PushManager
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey as unknown as BufferSource,
        });
      }

      // 5. Extract keys and register on FastAPI backend
      const subJson = subscription.toJSON();
      const p256dh = subJson.keys?.p256dh;
      const auth = subJson.keys?.auth;

      if (!p256dh || !auth) {
        throw new Error("Browser push subscription missing p256dh or auth keys.");
      }

      await subscribePush({
        endpoint: subscription.endpoint,
        keys: {
          p256dh,
          auth,
        },
        user_agent: navigator.userAgent,
      });

      setIsSubscribed(true);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to enable notifications";
      console.error("useWebPush subscribe error:", err);
      setError(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await unsubscribePush(endpoint);
      } else {
        await unsubscribePush();
      }

      setIsSubscribed(false);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to unsubscribe";
      console.error("useWebPush unsubscribe error:", err);
      setError(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const sendTestNotification = useCallback(async (): Promise<TestPushResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Ensure local push subscription exists and is synced to the backend
      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        try {
          const reg = await navigator.serviceWorker.ready;
          let sub = await reg.pushManager.getSubscription();

          // If not subscribed yet, try to subscribe first
          if (!sub) {
            const { public_key } = await getVapidPublicKey();
            if (public_key) {
              const appServerKey = urlBase64ToUint8Array(public_key);
              sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: appServerKey as unknown as BufferSource,
              });
            }
          }

          if (sub) {
            const subJson = sub.toJSON();
            if (subJson.keys?.p256dh && subJson.keys?.auth) {
              await subscribePush({
                endpoint: sub.endpoint,
                keys: {
                  p256dh: subJson.keys.p256dh,
                  auth: subJson.keys.auth,
                },
                user_agent: navigator.userAgent,
              });
              setIsSubscribed(true);
            }
          }
        } catch (subSyncErr) {
          console.warn("Pre-test push subscription sync warning:", subSyncErr);
        }
      }

      // 2. Dispatch test push notification
      const result = await sendTestPush();
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to trigger test push";
      console.error("sendTestNotification error:", err);
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isSupported,
    isSubscribed,
    permission,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    sendTestNotification,
  };
}
