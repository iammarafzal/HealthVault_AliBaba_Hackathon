"use client";

import { useState } from "react";
import {
  Clock,
  Moon,
  Pill,
  Sun,
  Sunrise,
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

interface PlannedMed {
  name: string;
  dosage: string;
  timing: "morning" | "noon" | "night";
  taken: boolean;
}

const plannedMeds: PlannedMed[] = [
  { name: "Metformin", dosage: "500mg", timing: "morning", taken: true },
  { name: "Amlodipine", dosage: "5mg", timing: "morning", taken: false },
  { name: "Atorvastatin", dosage: "10mg", timing: "night", taken: false },
  { name: "Metformin", dosage: "500mg", timing: "night", taken: false },
  { name: "Omeprazole", dosage: "20mg", timing: "noon", taken: false },
];

const tabs = [
  { key: "morning" as const, label: "Morning", icon: Sunrise },
  { key: "noon" as const, label: "Noon", icon: Sun },
  { key: "night" as const, label: "Night", icon: Moon },
];

export default function PlannerPage() {
  const [activeTab, setActiveTab] = useState<"morning" | "noon" | "night">(
    "morning"
  );
  const [meds, setMeds] = useState(plannedMeds);

  const toggleTaken = (index: number) => {
    setMeds((prev) =>
      prev.map((m, i) => (i === index ? { ...m, taken: !m.taken } : m))
    );
  };

  const filtered = meds.filter((m) => m.timing === activeTab);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Smart Medication Planner
        </h1>
        <p className="text-muted-foreground">
          Daily dosage timelines &amp; reminder schedules.
        </p>
      </div>

      {/* Summary strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        {tabs.map((tab) => {
          const count = meds.filter(
            (m) => m.timing === tab.key
          ).length;
          const taken = meds.filter(
            (m) => m.timing === tab.key && m.taken
          ).length;
          const Icon = tab.icon;
          return (
            <Card key={tab.key}>
              <CardContent className="flex items-center gap-3 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{tab.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {taken}/{count} taken
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg border p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Medication list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
              <Pill className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No medications scheduled for this time slot.
              </p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((med) => {
            const globalIndex = meds.indexOf(med);
            return (
              <Card key={`${med.name}-${med.timing}`}>
                <CardContent className="flex items-center gap-4 py-4">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                      med.taken
                        ? "bg-emerald-100 dark:bg-emerald-900/30"
                        : "bg-muted"
                    )}
                  >
                    <Pill
                      className={cn(
                        "h-5 w-5",
                        med.taken
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground"
                      )}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">
                      {med.name}{" "}
                      <span className="font-normal text-muted-foreground">
                        {med.dosage}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {med.timing === "morning"
                        ? "Before breakfast"
                        : med.timing === "noon"
                        ? "After lunch"
                        : "Before bed"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {med.taken ? (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      >
                        Taken
                      </Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                    <Button
                      variant={med.taken ? "secondary" : "default"}
                      size="sm"
                      onClick={() => toggleTaken(globalIndex)}
                    >
                      {med.taken ? "Undo" : "Mark Taken"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Reminder note */}
      <Card className="border-dashed">
        <CardContent className="flex items-center gap-3 py-4">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Reminder Notifications</p>
            <CardDescription>
              Push &amp; SMS reminders will be sent 30 minutes before each
              scheduled dose.
            </CardDescription>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
