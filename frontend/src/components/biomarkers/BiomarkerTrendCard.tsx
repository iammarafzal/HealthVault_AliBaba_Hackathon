"use client";

import React from "react";
import { Activity, BarChart3, Calendar, Info, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BiomarkerLineChart } from "@/components/biomarkers/BiomarkerChart";
import type { BiomarkerHistoryResponse } from "@/types/api";
import { useLanguage } from "@/context/LanguageContext";

interface BiomarkerTrendCardProps {
  historyData: BiomarkerHistoryResponse;
}

export function BiomarkerTrendCard({ historyData }: BiomarkerTrendCardProps) {
  const { t, locale } = useLanguage();
  const isUrdu = locale === "ur";

  const {
    test_name,
    category,
    unit,
    latest_value,
    latest_status,
    ref_range_text,
    ref_min,
    ref_max,
    trend,
    history,
  } = historyData;

  const latestPoint = history[history.length - 1];

  const formattedDate = (() => {
    if (!latestPoint?.test_date) return isUrdu ? "کوئی تاریخ نہیں" : "No date";
    const d = new Date(latestPoint.test_date);
    return isNaN(d.getTime())
      ? latestPoint.test_date
      : d.toLocaleDateString(isUrdu ? "ur-PK" : "en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
  })();

  const statusDisplay =
    latest_status === "normal"
      ? (isUrdu ? "نارمل / محفوظ" : "Safe / Normal")
      : latest_status === "high"
      ? (isUrdu ? "نارمل سے زیادہ" : "Higher Than Normal")
      : latest_status === "low"
      ? (isUrdu ? "نارمل سے کم" : "Lower Than Normal")
      : latest_status === "critical"
      ? (isUrdu ? "شدید / خطرناک" : "Critical / High Risk")
      : latest_status;

  const trendDisplay =
    trend === "improving"
      ? (isUrdu ? "بہتر ہو رہا ہے" : "Improving")
      : trend === "worsening"
      ? (isUrdu ? "توجہ طلب" : "Worsening")
      : (isUrdu ? "مستحکم" : "Stable");

  return (
    <Card className="border border-vault-border shadow-xs dark:border-border">
      <CardHeader className="border-b border-border bg-vault-surface/40 pb-3 dark:bg-card">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-bold text-vault-teal dark:text-teal-300">
                {test_name}
              </CardTitle>
              <Badge
                variant="outline"
                className="border-vault-border bg-vault-light text-[10px] font-bold text-vault-teal dark:bg-card"
              >
                {category}
              </Badge>
            </div>
            <CardDescription className="mt-1 flex items-center gap-1.5 text-xs">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{isUrdu ? "حالیہ ٹیسٹ:" : "Last Recorded:"} {formattedDate}</span>
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-bold uppercase shadow-2xs",
                latest_status === "normal"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : latest_status === "high"
                  ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300"
                  : latest_status === "critical"
                  ? "bg-red-100 text-vault-red dark:bg-red-950 dark:text-red-300"
                  : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
              )}
            >
              {statusDisplay}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* ── Value & Reference Box ── */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-vault-border bg-card p-4 dark:border-border">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {isUrdu ? "موجودہ نتیجہ" : "Latest Reading"}
            </p>
            <div className="mt-1 flex items-baseline gap-2" dir="ltr">
              <span className="text-3xl font-black text-foreground">{latest_value}</span>
              <span className="text-sm font-bold text-muted-foreground">{unit}</span>
            </div>
          </div>

          <div className="rounded-xl border border-vault-border bg-card p-4 dark:border-border">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {isUrdu ? "معیاری محفوظ حد" : "Standard Reference Range"}
            </p>
            <p className="mt-1 text-sm font-bold text-vault-teal dark:text-teal-300" dir="ltr">
              {ref_range_text || (ref_min != null && ref_max != null ? `${ref_min} – ${ref_max} ${unit}` : (isUrdu ? "معیاری حد دستیاب ہے" : "Standard clinical range"))}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {isUrdu ? "رجحان:" : "Trend:"} <span className="font-semibold">{trendDisplay}</span>
            </p>
          </div>
        </div>

        {/* ── Time-Series Line Chart ── */}
        {history.length > 0 ? (
          <div>
            <BiomarkerLineChart
              data={history}
              metricName={`${test_name} (${unit})`}
              unit={unit}
              refMin={ref_min ?? undefined}
              refMax={ref_max ?? undefined}
              locale={locale}
            />
            {history.length === 1 && (
              <div className="mt-2 flex items-center justify-center gap-2 rounded-lg border border-dashed border-vault-border bg-vault-light/30 py-2 text-center text-xs text-muted-foreground dark:border-border dark:bg-card">
                <Info className="h-4 w-4 text-vault-teal" />
                <span>
                  {isUrdu
                    ? "ایک نتیجہ ریکارڈ ہوا ہے۔ وقت کے ساتھ گراف دیکھنے کے لیے مزید رپورٹس اپ لوڈ کریں۔"
                    : "Single reading recorded. Upload subsequent lab reports to visualize trends over time."}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground">
            <BarChart3 className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <span>{isUrdu ? "اس ٹیسٹ کا گراف دستیاب نہیں" : "No trend history available for this test."}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
