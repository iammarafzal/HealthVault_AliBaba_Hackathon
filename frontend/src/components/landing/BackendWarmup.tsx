"use client";

import { useEffect, useState } from "react";
import { awakeBackend, subscribeWarmupState, WarmupState } from "@/services/warmupService";
import { Sparkles, CheckCircle2, Server, X } from "lucide-react";

export default function BackendWarmup() {
  const [warmupState, setWarmupState] = useState<WarmupState>({
    status: "idle",
    startedAt: null,
    completedAt: null,
    elapsedMs: null,
    isColdStart: false,
  });
  const [showToast, setShowToast] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // 1. Subscribe to state updates
    const unsubscribe = subscribeWarmupState((state) => {
      setWarmupState(state);

      // Only show the floating pill if it takes > 2.5s (genuine cold start)
      if (state.status === "waking") {
        const timer = setTimeout(() => {
          // If still waking after 2.5 seconds, display warm-up status
          setShowToast(true);
        }, 2500);
        return () => clearTimeout(timer);
      } else if (state.status === "awake") {
        if (state.isColdStart) {
          setShowToast(true);
          const hideTimer = setTimeout(() => {
            setShowToast(false);
          }, 4500);
          return () => clearTimeout(hideTimer);
        } else {
          // If it answered in < 2.5s, stay hidden
          setShowToast(false);
        }
      } else if (state.status === "error") {
        const hideTimer = setTimeout(() => {
          setShowToast(false);
        }, 3500);
        return () => clearTimeout(hideTimer);
      }
    });

    // 2. Trigger immediate wake-up request
    awakeBackend();

    // 3. Keep-alive interval: Ping every 10 minutes (Render free tier sleeps after 15m)
    const keepAliveInterval = setInterval(() => {
      awakeBackend(true);
    }, 10 * 60 * 1000);

    // 4. Tab visibility handler: wake up if user returns after an idle period
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        awakeBackend(false);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      unsubscribe();
      clearInterval(keepAliveInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  if (!showToast || dismissed) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-xl border border-vault-teal/20 bg-vault-slate/95 px-4 py-2.5 text-xs text-white shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-3"
    >
      {warmupState.status === "waking" && (
        <>
          <div className="relative flex h-3 w-3 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-slate-100 flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5 text-amber-400" />
              Waking backend cloud instance
            </span>
            <span className="text-[10px] text-slate-400">
              Free tier spin-up in progress (~30s)...
            </span>
          </div>
        </>
      )}

      {warmupState.status === "awake" && (
        <>
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <div className="flex flex-col">
            <span className="font-medium text-emerald-300 flex items-center gap-1">
              Backend is ready
              <Sparkles className="h-3 w-3" />
            </span>
            <span className="text-[10px] text-slate-400">
              Fast clinical AI &amp; emergency access active
            </span>
          </div>
        </>
      )}

      {warmupState.status === "error" && (
        <>
          <Server className="h-4 w-4 text-slate-400 shrink-0" />
          <span className="text-slate-300">
            Backend awake signal transmitted
          </span>
        </>
      )}

      <button
        onClick={() => setDismissed(true)}
        className="ml-2 rounded p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
        aria-label="Dismiss backend status"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
