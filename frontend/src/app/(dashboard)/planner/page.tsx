"use client";

import { useState } from "react";
import {
  Clock,
  Moon,
  Sun,
  Sunrise,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import MedicationTimeline, {
  type PlannedMed,
} from "@/components/planner/MedicationTimeline";
import { cn } from "@/lib/utils";

const initialMeds: PlannedMed[] = [
  {
    id: "med-1",
    name: "Metformin",
    dosage: "500mg",
    instruction: "Before breakfast",
    timing: "morning",
    taken: false,
  },
  {
    id: "med-2",
    name: "Amlodipine",
    dosage: "5mg",
    instruction: "After breakfast with water",
    timing: "morning",
    taken: false,
  },
  {
    id: "med-3",
    name: "Omeprazole",
    dosage: "20mg",
    instruction: "30 minutes after lunch",
    timing: "noon",
    taken: false,
  },
  {
    id: "med-4",
    name: "Metformin",
    dosage: "500mg",
    instruction: "With dinner",
    timing: "night",
    taken: false,
  },
  {
    id: "med-5",
    name: "Atorvastatin",
    dosage: "10mg",
    instruction: "Before bed",
    timing: "night",
    taken: false,
  },
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
  const [meds, setMeds] = useState<PlannedMed[]>(initialMeds);

  const toggleTaken = (id: string) => {
    setMeds((prev) =>
      prev.map((m) => (m.id === id ? { ...m, taken: !m.taken } : m))
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

      {/* Progress summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {tabs.map((tab) => {
          const count = meds.filter((m) => m.timing === tab.key).length;
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
                {/* Mini progress bar */}
                <div className="ml-auto h-2 w-16 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: count > 0 ? `${(taken / count) * 100}%` : "0%",
                    }}
                  />
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
                "flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors",
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

      {/* Medication timeline for active tab */}
      <MedicationTimeline
        medications={filtered}
        onToggleTaken={toggleTaken}
      />

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
