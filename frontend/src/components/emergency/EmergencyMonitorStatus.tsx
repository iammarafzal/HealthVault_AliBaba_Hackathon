"use client";

import { useEffect, useState } from "react";
import { CheckCircle, BellRing } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { getSharedAlertStreams } from "@/services/emergencyService";
import {
  useSharedEmergencyListeners,
  type SharedAlertStream,
} from "@/hooks/useSharedEmergencyListeners";

/**
 * Live status indicator and global SSE listener component for designated ICE contacts.
 * Renders on the main portal dashboard layout, displays permission prompt if default,
 * and listens to incoming emergency scan alerts.
 */
export default function EmergencyMonitorStatus() {
  const { isUrdu } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [streams, setStreams] = useState<SharedAlertStream[]>([]);
  const [hasChecked, setHasChecked] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission>("granted");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermissionState(Notification.permission);
    }
  }, []);

  const handleRequestPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const perm = await Notification.requestPermission();
        setPermissionState(perm);
      } catch {
        // Safe ignore
      }
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    let mounted = true;

    async function checkStreams() {
      try {
        const res = await getSharedAlertStreams();
        if (mounted) {
          setStreams(res || []);
          setHasChecked(true);
        }
      } catch (err) {
        console.warn("Failed to query shared alert streams:", err);
        if (mounted) setHasChecked(true);
      }
    }

    checkStreams();

    // Periodically sync streams in case patient designates or revokes consent
    const interval = setInterval(checkStreams, 45000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  // Connect real-time SSE subscriptions for each shared stream
  useSharedEmergencyListeners(streams);

  if (!hasChecked || streams.length === 0) {
    return null;
  }

  const patientNames = streams.map((s) => s.patientName).filter(Boolean).join(", ");

  return (
    <div className="flex items-center gap-2">
      {permissionState === "default" && (
        <button
          type="button"
          onClick={handleRequestPermission}
          className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100 transition-colors shadow-2xs dark:border-amber-700/50 dark:bg-amber-950/50 dark:text-amber-300 cursor-pointer"
          title="Click to enable instant OS desktop notifications for emergency alerts"
        >
          <BellRing className="w-3.5 h-3.5 text-amber-600 animate-bounce shrink-0" />
          <span>{isUrdu ? "ڈیسک ٹاپ الرٹس آن کریں" : "Enable Desktop Alerts"}</span>
        </button>
      )}

      <div
        className="flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/90 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 shadow-2xs dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-300 transition-all hover:bg-emerald-100/90 dark:hover:bg-emerald-950/70"
        title={`Live emergency alerts active for: ${patientNames}`}
      >
        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 animate-pulse shrink-0" />
        <span className="hidden sm:inline">
          {isUrdu ? "ہنگامی الرٹس مانیٹر فعال ہے" : "Emergency Monitor Active"}
        </span>
        <span className="inline sm:hidden">
          {isUrdu ? "مانیٹر فعال" : "ICE Active"}
        </span>
        {streams.length > 1 && (
          <span className="rounded-full bg-emerald-600 px-1.5 py-0.2 text-[9px] font-bold text-white">
            {streams.length}
          </span>
        )}
      </div>
    </div>
  );
}
