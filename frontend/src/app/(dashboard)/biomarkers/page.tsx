"use client";

import { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Activity,
  BarChart3,
  Droplets,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  mockBiomarkerTimeline,
  mockGlucoseTimeline,
  mockLipidTimeline,
} from "@/lib/mockData";
import {
  BiomarkerLineChart,
  LipidMultiChart,
} from "@/components/biomarkers/BiomarkerChart";
import type { BiomarkerTimeline } from "@/types/models";

/* ── Metric definitions ──────────────────────────────────── */
type MetricKey = "hba1c" | "glucose" | "lipid";

interface MetricDef {
  key: MetricKey;
  label: string;
  icon: React.ElementType;
}

const metrics: MetricDef[] = [
  { key: "hba1c", label: "HbA1c (%)", icon: Droplets },
  { key: "glucose", label: "Fasting Glucose", icon: Activity },
  { key: "lipid", label: "Lipid Profile", icon: BarChart3 },
];

/* ── Helper: compute delta & status ──────────────────────── */
function getDelta(timeline: BiomarkerTimeline) {
  const t = timeline.timeline;
  if (t.length < 2) return { delta: 0, pctChange: 0 };
  const latest = t[t.length - 1];
  const previous = t[t.length - 2];
  const delta = latest.value - previous.value;
  const pctChange = previous.value !== 0 ? (delta / previous.value) * 100 : 0;
  return { delta, pctChange };
}

export default function BiomarkersPage() {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("hba1c");

  const hba1c = mockBiomarkerTimeline;
  const glucose = mockGlucoseTimeline;
  const hba1cDelta = getDelta(hba1c);
  const glucoseDelta = getDelta(glucose);

  const latestHbA1c = hba1c.timeline[hba1c.timeline.length - 1];
  const latestGlucose = glucose.timeline[glucose.timeline.length - 1];
  const latestLdl = mockLipidTimeline.lines[0].data;
  const latestLdlVal = latestLdl[latestLdl.length - 1];
  const prevLdlVal = latestLdl[latestLdl.length - 2];
  const ldlDelta = latestLdlVal.value - prevLdlVal.value;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Longitudinal Lab Trends
        </h1>
        <p className="text-muted-foreground">
          Track lab metrics like HbA1c, Glucose, and Lipids over time.
        </p>
      </div>

      {/* Metric selector tabs */}
      <div className="flex flex-wrap gap-2">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.key}
              onClick={() => setSelectedMetric(m.key)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors min-h-[44px]",
                selectedMetric === m.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {m.label}
            </button>
          );
        })}
      </div>

      {/* ── Status summary cards ──────────────────────────── */}
      {selectedMetric === "hba1c" && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatusCard
            label="Latest HbA1c"
            value={latestHbA1c.value}
            unit={latestHbA1c.unit}
            date={latestHbA1c.test_date}
            status={latestHbA1c.status}
            delta={hba1cDelta.delta}
            pctChange={hba1cDelta.pctChange}
          />
          <StatusCard
            label="Target"
            value="< 7.0"
            unit="%"
            date="ADA Guideline"
            status="normal"
          />
          <StatusCard
            label="Trend"
            value={hba1cDelta.delta}
            unit="% vs last"
            date="Since last test"
            delta={hba1cDelta.delta}
            pctChange={hba1cDelta.pctChange}
          />
        </div>
      )}

      {selectedMetric === "glucose" && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatusCard
            label="Latest Fasting Glucose"
            value={latestGlucose.value}
            unit={latestGlucose.unit}
            date={latestGlucose.test_date}
            status={latestGlucose.status}
            delta={glucoseDelta.delta}
            pctChange={glucoseDelta.pctChange}
          />
          <StatusCard
            label="Normal Range"
            value="70–99"
            unit="mg/dL"
            date="Standard reference"
            status="normal"
          />
          <StatusCard
            label="Trend"
            value={glucoseDelta.delta}
            unit="mg/dL vs last"
            date="Since last test"
            delta={glucoseDelta.delta}
            pctChange={glucoseDelta.pctChange}
          />
        </div>
      )}

      {selectedMetric === "lipid" && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatusCard
            label="Latest LDL"
            value={latestLdlVal.value}
            unit="mg/dL"
            date={latestLdlVal.test_date}
            status={latestLdlVal.value > 100 ? "high" : "normal"}
            delta={ldlDelta}
            pctChange={
              prevLdlVal.value !== 0
                ? (ldlDelta / prevLdlVal.value) * 100
                : 0
            }
          />
          <StatusCard
            label="Latest HDL"
            value={
              mockLipidTimeline.lines[1].data[
                mockLipidTimeline.lines[1].data.length - 1
              ].value
            }
            unit="mg/dL"
            date={
              mockLipidTimeline.lines[1].data[
                mockLipidTimeline.lines[1].data.length - 1
              ].test_date
            }
            status={
              mockLipidTimeline.lines[1].data[
                mockLipidTimeline.lines[1].data.length - 1
              ].value < 40
                ? "low"
                : "normal"
            }
          />
          <StatusCard
            label="Latest Triglycerides"
            value={
              mockLipidTimeline.lines[2].data[
                mockLipidTimeline.lines[2].data.length - 1
              ].value
            }
            unit="mg/dL"
            date={
              mockLipidTimeline.lines[2].data[
                mockLipidTimeline.lines[2].data.length - 1
              ].test_date
            }
            status={
              mockLipidTimeline.lines[2].data[
                mockLipidTimeline.lines[2].data.length - 1
              ].value > 150
                ? "high"
                : "normal"
            }
          />
        </div>
      )}

      {/* ── Chart ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-primary" />
            {metrics.find((m) => m.key === selectedMetric)?.label} Timeline
          </CardTitle>
          <CardDescription>
            Interactive trend chart with reference thresholds — hover for
            details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedMetric === "hba1c" && (
            <BiomarkerLineChart
              data={hba1c.timeline}
              metricName="HbA1c"
              unit="%"
              refMin={hba1c.timeline[0].reference_min}
              refMax={hba1c.timeline[0].reference_max}
              refLines={[
                { value: 5.7, label: "Pre-diabetes 5.7%", color: "#f59e0b" },
                { value: 6.5, label: "Diabetes 6.5%", color: "#ef4444" },
              ]}
            />
          )}
          {selectedMetric === "glucose" && (
            <BiomarkerLineChart
              data={glucose.timeline}
              metricName="Fasting Glucose"
              unit="mg/dL"
              refMin={glucose.timeline[0].reference_min}
              refMax={glucose.timeline[0].reference_max}
            />
          )}
          {selectedMetric === "lipid" && (
            <LipidMultiChart lines={mockLipidTimeline.lines} />
          )}
        </CardContent>
      </Card>

      {/* ── AI Insight ────────────────────────────────────── */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Activity className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold">AI Insight</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {selectedMetric === "hba1c" && hba1c.summary_insight}
                {selectedMetric === "glucose" && glucose.summary_insight}
                {selectedMetric === "lipid" && mockLipidTimeline.summary_insight}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Status Card sub-component ───────────────────────────── */
function StatusCard({
  label,
  value,
  unit,
  date,
  status,
  delta,
  pctChange,
}: {
  label: string;
  value: number | string;
  unit: string;
  date: string;
  status?: string;
  delta?: number;
  pctChange?: number;
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold">{value}</span>
          <span className="text-sm text-muted-foreground">{unit}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          {status && (
            <Badge
              variant={
                status === "normal"
                  ? "secondary"
                  : status === "high"
                    ? "destructive"
                    : "outline"
              }
              className={cn(
                "text-[10px]",
                status === "normal" &&
                  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                status === "high" && "bg-red-100 text-red-700",
                status === "low" &&
                  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              )}
            >
              {status.toUpperCase()}
            </Badge>
          )}
          {delta != null && delta !== 0 && pctChange != null && (
            <span
              className={cn(
                "flex items-center gap-0.5 text-xs font-semibold",
                delta < 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              {delta < 0 ? (
                <ArrowDownRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowUpRight className="h-3.5 w-3.5" />
              )}
              {Math.abs(pctChange).toFixed(1)}%
            </span>
          )}
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {date
            ? new Date(date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : date}
        </p>
      </CardContent>
    </Card>
  );
}
