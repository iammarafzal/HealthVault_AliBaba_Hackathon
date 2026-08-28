"use client";

import { useState } from "react";
import {
  Activity,
  BarChart3,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { mockBiomarkerTimeline } from "@/lib/mockData";
import type { BiomarkerDataPoint } from "@/types/models";

const availableMetrics = ["HbA1c", "Hemoglobin", "LDL Cholesterol", "Total Cholesterol"];

export default function BiomarkersPage() {
  const [selectedMetric, setSelectedMetric] = useState("HbA1c");
  const timeline = mockBiomarkerTimeline;

  const latest = timeline.timeline[timeline.timeline.length - 1];
  const previous = timeline.timeline[timeline.timeline.length - 2];
  const delta = latest && previous ? latest.value - previous.value : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Longitudinal Lab Trends
        </h1>
        <p className="text-muted-foreground">
          Track lab metrics like HbA1c, CBC, and Lipids over time.
        </p>
      </div>

      {/* Metric selector */}
      <div className="flex flex-wrap gap-2">
        {availableMetrics.map((metric) => (
          <Button
            key={metric}
            variant={metric === selectedMetric ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedMetric(metric)}
          >
            {metric}
          </Button>
        ))}
      </div>

      {/* Summary strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs font-medium text-muted-foreground">
              Latest Value
            </p>
            <p className="text-2xl font-bold">
              {latest?.value}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                {latest?.unit}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              {latest?.test_date
                ? new Date(latest.test_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <p className="text-xs font-medium text-muted-foreground">
              Trend
            </p>
            <p
              className={cn(
                "flex items-center gap-1 text-2xl font-bold",
                delta < 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : delta > 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-muted-foreground"
              )}
            >
              {delta < 0 ? (
                <TrendingDown className="h-5 w-5" />
              ) : delta > 0 ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <Activity className="h-5 w-5" />
              )}
              {delta > 0 ? "+" : ""}
              {delta.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground">
              vs. previous test
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <p className="text-xs font-medium text-muted-foreground">
              Status
            </p>
            <Badge
              variant={
                latest?.status === "normal"
                  ? "secondary"
                  : latest?.status === "high"
                  ? "destructive"
                  : "outline"
              }
              className="mt-1"
            >
              {latest?.status?.toUpperCase() ?? "—"}
            </Badge>
            <p className="mt-1 text-xs text-muted-foreground">
              Ref: {latest?.reference_min}–{latest?.reference_max}{" "}
              {latest?.unit}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-primary" />
            {selectedMetric} Timeline
          </CardTitle>
          <CardDescription>
            Visual trend chart powered by Recharts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-end justify-around gap-4 rounded-lg border border-dashed p-6">
            {timeline.timeline.map((point: BiomarkerDataPoint, i: number) => {
              const maxVal = Math.max(
                ...timeline.timeline.map((p) => p.value)
              );
              const heightPct = (point.value / maxVal) * 100;
              return (
                <div
                  key={i}
                  className="flex flex-1 flex-col items-center gap-2"
                >
                  <span className="text-xs font-medium">
                    {point.value}
                  </span>
                  <div
                    className={cn(
                      "w-full max-w-[48px] rounded-t-md transition-all",
                      point.status === "normal"
                        ? "bg-emerald-500"
                        : point.status === "high"
                        ? "bg-red-500"
                        : "bg-blue-500"
                    )}
                    style={{ height: `${heightPct}%` }}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(point.test_date).toLocaleDateString("en-US", {
                      month: "short",
                      year: "2-digit",
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* AI Insight */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Activity className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold">AI Insight</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {timeline.summary_insight}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
