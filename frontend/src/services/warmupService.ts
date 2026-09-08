/**
 * HealthVault AI — Render Backend Wake-up / Warm-up Service
 *
 * Render Free Tier spins down web services after 15 minutes of inactivity.
 * Cold start takes ~30-50 seconds.
 *
 * This service sends an asynchronous health check probe (/healthz) when the user
 * lands on the page, waking up the backend container immediately in the background
 * so that subsequent user actions (login, registration, triage) encounter a warm instance.
 */

import { getBackendRootUrl, getApiBaseUrl } from "./apiClient";

export type WarmupStatus = "idle" | "waking" | "awake" | "error";

export interface WarmupState {
  status: WarmupStatus;
  startedAt: number | null;
  completedAt: number | null;
  elapsedMs: number | null;
  isColdStart: boolean;
}

let inFlightPromise: Promise<boolean> | null = null;
let lastWakeSuccessTime = 0;
const listeners = new Set<(state: WarmupState) => void>();

let currentState: WarmupState = {
  status: "idle",
  startedAt: null,
  completedAt: null,
  elapsedMs: null,
  isColdStart: false,
};

function setState(updates: Partial<WarmupState>) {
  currentState = { ...currentState, ...updates };
  listeners.forEach((fn) => {
    try {
      fn(currentState);
    } catch {
      // Ignore listener error
    }
  });
}

export function subscribeWarmupState(listener: (state: WarmupState) => void): () => void {
  listeners.add(listener);
  listener(currentState);
  return () => {
    listeners.delete(listener);
  };
}

export function getWarmupState(): WarmupState {
  return currentState;
}

/**
 * Sends a health ping to awake the backend on Render.
 *
 * @param force If true, skips the 5-minute freshness check and forces a ping.
 * @returns Promise<boolean> resolving to true if backend replied healthy.
 */
export async function awakeBackend(force = false): Promise<boolean> {
  const now = Date.now();

  // If already known awake within the last 5 minutes, avoid duplicate pings
  if (!force && lastWakeSuccessTime > 0 && now - lastWakeSuccessTime < 5 * 60 * 1000) {
    if (currentState.status !== "awake") {
      setState({ status: "awake" });
    }
    return true;
  }

  // Deduplicate concurrent in-flight wake-up requests
  if (inFlightPromise) {
    return inFlightPromise;
  }

  inFlightPromise = (async () => {
    const startTime = Date.now();
    setState({
      status: "waking",
      startedAt: startTime,
      completedAt: null,
      elapsedMs: null,
      isColdStart: false,
    });

    const rootUrl = getBackendRootUrl();
    const primaryUrl = `${rootUrl}/healthz?t=${startTime}`;
    const fallbackUrl = `${getApiBaseUrl()}/healthz?t=${startTime}`;

    if (process.env.NODE_ENV !== "production") {
      console.log(`[HealthVault Warmup] Probing backend health at: ${primaryUrl}`);
    }

    // Free tier Render cold starts can take 30-50s; allow 65s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 65000);

    const tryFetch = async (url: string): Promise<boolean> => {
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
          cache: "no-store",
          signal: controller.signal,
        });
        return response.ok;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          console.warn("[HealthVault Warmup] Health probe timed out after 65s.");
        }
        return false;
      }
    };

    let success = false;

    try {
      // Primary probe: root /healthz
      success = await tryFetch(primaryUrl);

      // Fallback probe: /api/v1/healthz if primary failed
      if (!success && !controller.signal.aborted) {
        success = await tryFetch(fallbackUrl);
      }
    } finally {
      clearTimeout(timeoutId);
      inFlightPromise = null;
    }

    const elapsed = Date.now() - startTime;
    const isColdStart = elapsed > 2500; // Cold boot takes > 2.5 seconds

    if (success) {
      lastWakeSuccessTime = Date.now();
      setState({
        status: "awake",
        completedAt: Date.now(),
        elapsedMs: elapsed,
        isColdStart,
      });

      if (process.env.NODE_ENV !== "production" || isColdStart) {
        console.log(
          `[HealthVault Warmup] Backend is awake & ready! (${(elapsed / 1000).toFixed(1)}s${
            isColdStart ? " — cold-start complete" : ""
          })`
        );
      }
    } else {
      // Even if fetch threw a CORS/network error, Render still received the HTTP probe
      // and initiated container spin-up.
      setState({
        status: "error",
        completedAt: Date.now(),
        elapsedMs: elapsed,
        isColdStart,
      });
      console.warn(
        `[HealthVault Warmup] Backend health probe completed without 200 OK (${(elapsed / 1000).toFixed(1)}s). Render boot signal was transmitted.`
      );
    }

    return success;
  })();

  return inFlightPromise;
}
