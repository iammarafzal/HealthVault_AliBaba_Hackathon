"use client";

import React from "react";
import { ShieldAlert, ExternalLink, X, MapPin, Radio, Clock } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface EmergencyToastCardProps {
  toastId: string | number;
  patientName: string;
  descriptionText?: string;
  healthId?: string;
  location?: string;
}

export default function EmergencyToastCard({
  toastId,
  patientName,
  descriptionText,
  healthId,
  location,
}: EmergencyToastCardProps) {
  const router = useRouter();

  const handleViewTimeline = () => {
    toast.dismiss(toastId);
    const targetUrl = healthId
      ? `/emergency/activity?health_id=${healthId}`
      : "/emergency/activity";

    if (typeof window !== "undefined") {
      window.location.href = targetUrl;
    } else {
      router.push(targetUrl);
    }
  };

  const isLocationKnown =
    location &&
    location.toLowerCase() !== "unknown" &&
    !location.toLowerCase().includes("unknown");

  const bodyText =
    descriptionText && !descriptionText.includes("near Unknown")
      ? descriptionText
      : isLocationKnown
      ? `Emergency card was scanned near ${location}. First responders may be reviewing vitals.`
      : "Emergency card was scanned. Live location and first responder activity are being monitored.";

  return (
    <div className="relative w-full max-w-md overflow-hidden rounded-2xl border-2 border-red-500/80 bg-gradient-to-br from-rose-950 via-red-900 to-slate-950 p-4 text-white shadow-[0_15px_40px_-10px_rgba(225,29,72,0.6)] backdrop-blur-xl transition-all animate-in fade-in slide-in-from-top-4 duration-300">
      {/* Background Subtle Emergency Glow */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-rose-500/20 blur-2xl" />

      {/* Top Bar: Alert Badge & Dismiss Icon */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          {/* Pulsing Beacon Dot */}
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-900/80 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-rose-200 border border-red-500/40 shadow-xs">
            <Radio className="h-3 w-3 text-rose-400 animate-pulse" />
            <span>EMERGENCY CARD SCANNED</span>
          </span>
        </div>

        {/* Clean Dismiss Button inside Card boundary */}
        <button
          type="button"
          onClick={() => toast.dismiss(toastId)}
          className="rounded-full p-1 text-rose-200/80 hover:bg-white/15 hover:text-white transition-all cursor-pointer"
          title="Dismiss Alert"
          aria-label="Dismiss Alert"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content Body */}
      <div className="mt-3 flex items-start gap-3">
        {/* Shield Icon Avatar */}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 to-rose-600 text-white border border-white/20 shadow-md shadow-red-950/60">
          <ShieldAlert className="h-6 w-6 animate-pulse" />
        </div>

        {/* Text Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-extrabold text-white tracking-tight">
              {patientName}
            </h4>
            {healthId && (
              <span className="inline-flex items-center rounded-md bg-white/15 px-2 py-0.5 text-[10px] font-mono font-extrabold text-rose-100 border border-white/10">
                [{healthId}]
              </span>
            )}
          </div>

          <p className="mt-1 text-xs leading-relaxed text-rose-100/90 font-medium">
            {bodyText}
          </p>

          {isLocationKnown && (
            <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-rose-200/90 bg-white/10 px-2 py-0.5 rounded-lg border border-white/10">
              <MapPin className="h-3 w-3 text-rose-400 shrink-0" />
              <span>Location: {location}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-2">
        <button
          type="button"
          onClick={handleViewTimeline}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-rose-50 text-red-700 font-extrabold text-xs py-2.5 px-4 shadow-lg shadow-black/25 hover:shadow-xl transition-all cursor-pointer active:scale-[0.98]"
        >
          <Clock className="h-4 w-4 text-red-600" />
          <span>View Timeline & Location</span>
          <ExternalLink className="h-3.5 w-3.5 opacity-70" />
        </button>
      </div>
    </div>
  );
}
