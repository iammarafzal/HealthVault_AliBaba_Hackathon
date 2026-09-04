"use client";

import React from "react";
import {
  CheckCircle2,
  ExternalLink,
  Laptop,
  MapPin,
  Monitor,
  Navigation,
  ShieldCheck,
  Smartphone,
  Tablet,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import type { EmergencyScanLog } from "@/types/api";

interface ScanActivityTimelineProps {
  scans: EmergencyScanLog[];
  isLoading?: boolean;
}

export default function ScanActivityTimeline({
  scans,
  isLoading = false,
}: ScanActivityTimelineProps) {
  const { locale, t } = useLanguage();
  const isUrdu = locale === "ur";

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
      let rel = t("emergency.justNow", "Just now");
      if (diffSec >= 60) {
        const diffMin = Math.floor(diffSec / 60);
        if (diffMin < 60) {
          rel = `${diffMin}m ago`;
        } else {
          const diffHours = Math.floor(diffMin / 60);
          if (diffHours < 24) {
            rel = `${diffHours}h ago`;
          } else {
            const diffDays = Math.floor(diffHours / 24);
            rel = `${diffDays}d ago`;
          }
        }
      }
      const timePkt = date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      return `${rel} · ${timePkt} PKT`;
    } catch {
      return isoString;
    }
  };

  const getDeviceIcon = (deviceType?: string | null, userAgent?: string) => {
    const dt = (deviceType || "").toLowerCase();
    const ua = (userAgent || "").toLowerCase();
    if (
      dt.includes("mobile") ||
      ua.includes("mobi") ||
      ua.includes("iphone") ||
      ua.includes("android")
    ) {
      return <Smartphone className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    }
    if (dt.includes("tablet") || ua.includes("ipad")) {
      return <Tablet className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    }
    return <Monitor className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
  };

  const getDeviceLabel = (deviceType?: string | null, userAgent?: string) => {
    const dt = (deviceType || "").toLowerCase();
    const ua = (userAgent || "").toLowerCase();
    if (
      dt.includes("mobile") ||
      ua.includes("mobi") ||
      ua.includes("iphone") ||
      ua.includes("android")
    ) {
      if (ua.includes("iphone")) return "Mobile Safari / iPhone";
      if (ua.includes("android")) return "Chrome / Android";
      return "Mobile Device";
    }
    if (dt.includes("tablet") || ua.includes("ipad")) return "Tablet Device";
    return "Desktop / Chrome";
  };

  if (isLoading) {
    return (
      <div className="space-y-4 py-2 animate-pulse">
        <div className="flex gap-3 items-start">
          <div className="w-7 h-7 rounded-full bg-muted shrink-0" />
          <div className="flex-1 space-y-2 bg-muted/40 p-4 rounded-xl h-24" />
        </div>
        <div className="flex gap-3 items-start">
          <div className="w-7 h-7 rounded-full bg-muted shrink-0" />
          <div className="flex-1 space-y-2 bg-muted/40 p-4 rounded-xl h-24" />
        </div>
      </div>
    );
  }

  if (scans.length === 0) {
    return (
      <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-border bg-muted/15 space-y-2">
        <div className="mx-auto w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="space-y-1 max-w-sm mx-auto">
          <h3 className="text-sm font-bold text-foreground">
            {isUrdu ? "کوئی اسکین ریکارڈ نہیں ملا" : "No Card Scans Recorded Yet"}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isUrdu
              ? "جب بھی آپ کا ہنگامی میڈیکل QR اسکین کیا جائے گا، مصدقہ لوکیشن پنز یہاں نظر آئیں گی۔"
              : "When first responders or paramedics scan the physical QR code, verified location pins appear here."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative space-y-4 border-slate-200 dark:border-slate-800 ${
        isUrdu ? "pr-5 border-r-2 mr-2" : "pl-5 border-l-2 ml-2"
      }`}
      dir={isUrdu ? "rtl" : "ltr"}
    >
      {scans.map((scan) => {
        const isGps = Boolean(
          scan.is_gps_verified || (scan.latitude && scan.longitude)
        );
        const mapsUrl =
          scan.maps_url ||
          (scan.latitude && scan.longitude
            ? `https://www.google.com/maps?q=${scan.latitude},${scan.longitude}`
            : null);

        const locationDisplay =
          scan.location_name ||
          scan.city ||
          (scan.latitude && scan.longitude
            ? `${scan.latitude.toFixed(4)}°, ${scan.longitude.toFixed(4)}°`
            : isUrdu
            ? "تخمینی علاقہ"
            : "Approximate Area");

        return (
          <div key={scan.id} className="relative group">
            {/* Timeline Node Icon */}
            <div
              className={`absolute top-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 bg-background transition-transform group-hover:scale-110 ${
                isUrdu ? "-right-[29px]" : "-left-[29px]"
              } ${
                isGps
                  ? "border-emerald-500 text-emerald-500 bg-emerald-50 dark:bg-emerald-950/60"
                  : "border-amber-500 text-amber-500 bg-amber-50 dark:bg-amber-950/60"
              }`}
            >
              {isGps ? (
                <MapPin className="h-3.5 w-3.5" />
              ) : (
                <Navigation className="h-3.5 w-3.5" />
              )}
            </div>

            {/* Streamlined Card */}
            <div className="rounded-xl border border-border bg-card p-3.5 sm:p-4 shadow-xs transition-all hover:border-emerald-500/40 space-y-2.5">
              {/* Top Row: Timestamp & Status Chip */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black text-foreground" dir="ltr">
                  {formatRelativeTime(scan.scanned_at)}
                </span>

                {isGps ? (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-medium border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>
                      {isUrdu
                        ? `مصدقہ GPS (±${Math.round(
                            scan.accuracy_meters || 128
                          )}m)`
                        : `Exact GPS (within ${Math.round(
                            scan.accuracy_meters || 128
                          )}m)`}
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 font-medium border border-amber-500/20">
                    <Navigation className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>{isUrdu ? "تخمینی علاقہ" : "Approximate Area"}</span>
                  </span>
                )}
              </div>

              {/* Middle Row: Location & Coordinates */}
              <div>
                <h4 className="text-sm font-black text-foreground leading-snug">
                  {locationDisplay}
                </h4>
                {scan.latitude && scan.longitude && (
                  <span className="font-mono text-[11px] text-slate-400 block mt-0.5" dir="ltr">
                    {scan.latitude.toFixed(4)}° N, {scan.longitude.toFixed(4)}° E
                  </span>
                )}
              </div>

              {/* Bottom Row: Device Info & Google Maps Action */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
                <div
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-help"
                  title={scan.ip_address ? `IP Address: ${scan.ip_address}` : undefined}
                >
                  {getDeviceIcon(scan.device_type, scan.user_agent)}
                  <span>{getDeviceLabel(scan.device_type, scan.user_agent)}</span>
                </div>

                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0D5C4A] hover:bg-[#094235] text-white text-xs font-medium rounded-lg transition-colors shadow-xs shrink-0"
                  >
                    <MapPin className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                    <span>Google Maps</span>
                    <ExternalLink className="w-3 h-3 opacity-70 shrink-0" />
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
