/**
 * HealthVault AI — Web Push Notification Service
 * Interacts with backend notification endpoints for VAPID keys, subscriptions, and testing.
 */

import apiClient from "@/services/apiClient";

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  user_agent?: string;
}

export interface PushSubscriptionResponse {
  id: string;
  user_id: string;
  endpoint: string;
  user_agent?: string;
  created_at: string;
}

export interface VapidKeyResponse {
  public_key: string;
}

export interface TestPushResponse {
  status: string;
  message: string;
  sent_count: number;
}

/** Fetch application server VAPID public key. */
export async function getVapidPublicKey(): Promise<VapidKeyResponse> {
  const response = await apiClient.get("/notifications/vapid-public-key");
  return response as unknown as VapidKeyResponse;
}

/** Register or update a browser push subscription on the backend. */
export async function subscribePush(
  payload: PushSubscriptionPayload
): Promise<PushSubscriptionResponse> {
  const response = await apiClient.post("/notifications/subscribe", payload);
  return response as unknown as PushSubscriptionResponse;
}

/** Dispatch an immediate test push notification. */
export async function sendTestPush(): Promise<TestPushResponse> {
  const response = await apiClient.post("/notifications/test", {
    title: "HealthVault Medicine Reminder",
    body: "Test dose notification received successfully! ادویات کا نوٹیفکیشن موصول ہو گیا۔",
    url: "/planner",
  });
  return response as unknown as TestPushResponse;
}

/** Remove push subscription from server. */
export async function unsubscribePush(endpoint?: string): Promise<{ status: string; deleted_count: number }> {
  const url = endpoint
    ? `/notifications/unsubscribe?endpoint=${encodeURIComponent(endpoint)}`
    : "/notifications/unsubscribe";
  const response = await apiClient.delete(url);
  return response as unknown as { status: string; deleted_count: number };
}
