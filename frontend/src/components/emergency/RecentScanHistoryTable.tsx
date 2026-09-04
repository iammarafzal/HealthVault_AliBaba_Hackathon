"use client";

import React from "react";
import Link from "next/link";
import {
  Clock,
  ExternalLink,
  Laptop,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/context/LanguageContext";
import type { EmergencyScanLog } from "@/types/api";

interface RecentScanHistoryTableProps {
  scanLogs: EmergencyScanLog[];
  isLoading?: boolean;
  isLoadingScans?: boolean;
  onRefresh?: () => void;
}

export default function RecentScanHistoryTable({
  scanLogs,
  isLoading = false,
  isLoadingScans = false,
  onRefresh,
}: RecentScanHistoryTableProps) {
  const { locale, t } = useLanguage();
  const isUrdu = locale === "ur";

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
      if (diffSec < 60) return t("emergency.justNow", "Just now");
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60)
        return t("emergency.minutesAgo", "{{count}}m ago").replace(
          "{{count}}",
          String(diffMin)
        );
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24)
        return t("emergency.hoursAgo", "{{count}}h ago").replace(
          "{{count}}",
          String(diffHours)
        );
      const diffDays = Math.floor(diffHours / 24);
      return t("emergency.daysAgo", "{{count}}d ago").replace(
        "{{count}}",
        String(diffDays)
      );
    } catch {
      return isoString;
    }
  };

  const getDeviceBadge = (userAgent: string) => {
    const ua = (userAgent || "").toLowerCase();
    if (ua.includes("mobi") || ua.includes("iphone") || ua.includes("android")) {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg whitespace-nowrap">
          <Smartphone className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <span>{t("emergency.mobileScanner", "Mobile Scanner")}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg whitespace-nowrap">
        <Laptop className="h-3.5 w-3.5 text-blue-500 shrink-0" />
        <span>{t("emergency.desktopTablet", "Desktop / Tablet")}</span>
      </span>
    );
  };

  return (
    <Card className="border-border bg-card shadow-xs">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Clock className="h-4 w-4 text-vault-teal dark:text-teal-400 shrink-0" />
              {t("emergency.auditTitle", "Recent Scan History")}
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {t(
                "emergency.auditSub",
                "Log of every time your emergency card was scanned."
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/emergency/activity"
              className="inline-flex items-center gap-1 text-xs font-bold text-vault-teal dark:text-teal-400 hover:underline px-2.5 py-1 rounded-lg hover:bg-vault-teal/10 transition-colors"
            >
              <span>{isUrdu ? "تفصیلی ٹائم لائن" : "View Full Timeline"}</span>
              <ExternalLink className="h-3 w-3" />
            </Link>

            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoadingScans}
                className="h-8 text-xs font-semibold gap-1.5 rounded-lg shrink-0"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isLoadingScans ? "animate-spin" : ""}`}
                />
                {t("emergency.refreshScans", "Refresh")}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {isLoading ? (
          <div className="space-y-2 py-2">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ) : scanLogs.length === 0 ? (
          <div className="text-center py-8 rounded-xl border border-dashed border-border bg-muted/20">
            <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
            <p className="text-xs font-bold text-foreground">
              {t("emergency.noScans", "No scans recorded yet")}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {t(
                "emergency.noScansSub",
                "When paramedics scan your card, the event will appear here."
              )}
            </p>
          </div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto overflow-x-auto rounded-xl border border-border/70 scrollbar-thin scrollbar-thumb-muted-foreground/20">
            <table
              className="w-full text-start text-xs relative"
              dir={isUrdu ? "rtl" : "ltr"}
            >
              <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-xs border-b border-border/70 text-muted-foreground font-bold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 text-start whitespace-nowrap">
                    {t("emergency.timestamp", "Timestamp")}
                  </th>
                  <th className="py-3 px-3 text-start whitespace-nowrap">
                    {t("emergency.deviceType", "Device Type")}
                  </th>
                  <th className="py-3 px-3 text-start whitespace-nowrap">
                    {t("emergency.ipAddress", "IP Address")}
                  </th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">
                    {t("emergency.location", "Location")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 bg-card">
                {scanLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-muted/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-medium whitespace-nowrap">
                      <span className="text-foreground font-semibold block text-xs">
                        {formatRelativeTime(log.scanned_at)}
                      </span>
                      <span
                        className="text-[10.5px] text-muted-foreground/80 font-mono block mt-0.5"
                        dir="ltr"
                      >
                        {new Date(log.scanned_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>
                    <td className="py-3 px-3 align-middle">
                      {getDeviceBadge(log.user_agent)}
                    </td>
                    <td
                      className="py-3 px-3 font-mono text-[11.5px] text-muted-foreground align-middle whitespace-nowrap"
                      dir="ltr"
                    >
                      {log.ip_address}
                    </td>
                    <td className="py-3 px-4 align-middle whitespace-nowrap">
                      {log.maps_url ? (
                        <a
                          href={log.maps_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs transition-all border border-emerald-500/25 hover:border-emerald-500/40 group whitespace-nowrap shadow-2xs"
                        >
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
                          <span>
                            {log.location ||
                              (isUrdu
                                ? "گوگل میپس پر لائیو لوکیشن دیکھیں"
                                : "View Live GPS Location")}
                          </span>
                          <ExternalLink className="w-3 h-3 text-emerald-600/70 dark:text-emerald-400/70 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 text-muted-foreground font-medium text-xs whitespace-nowrap border border-border/50">
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                          <span>
                            {log.city && log.city !== "Unknown"
                              ? log.city
                              : isUrdu
                              ? "نیٹ ورک / سیلولر"
                              : "Network / Cellular"}
                          </span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
