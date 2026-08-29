"use client";

import { Check, Pill, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface PlannedMed {
  id: string;
  name: string;
  dosage: string;
  instruction: string;
  timing: "morning" | "noon" | "night";
  taken: boolean;
}

interface MedicationTimelineProps {
  medications: PlannedMed[];
  onToggleTaken: (id: string) => void;
}

/**
 * Interactive medication timeline for a specific time slot.
 * Shows Mark Taken / Undo toggles with green check badges.
 */
export default function MedicationTimeline({
  medications,
  onToggleTaken,
}: MedicationTimelineProps) {
  if (medications.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <Pill className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No medications scheduled for this time slot.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {medications.map((med) => (
        <Card
          key={med.id}
          className={cn(
            "transition-colors",
            med.taken && "border-emerald-200 dark:border-emerald-900/40"
          )}
        >
          <CardContent className="flex items-center gap-4 py-4">
            {/* Status icon */}
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors",
                med.taken
                  ? "bg-emerald-100 dark:bg-emerald-900/30"
                  : "bg-muted"
              )}
            >
              {med.taken ? (
                <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Pill className="h-5 w-5 text-muted-foreground" />
              )}
            </div>

            {/* Medication info */}
            <div className="flex-1">
              <p className="text-sm font-semibold">
                {med.name}{" "}
                <span className="font-normal text-muted-foreground">
                  {med.dosage}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                {med.instruction}
              </p>
            </div>

            {/* Status badge + action */}
            <div className="flex items-center gap-2">
              {med.taken ? (
                <Badge
                  variant="secondary"
                  className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                >
                  <Check className="mr-1 h-3 w-3" />
                  Taken
                </Badge>
              ) : (
                <Badge variant="outline">Pending</Badge>
              )}
              <Button
                variant={med.taken ? "secondary" : "default"}
                size="sm"
                onClick={() => onToggleTaken(med.id)}
              >
                {med.taken ? (
                  <>
                    <Undo2 className="mr-1 h-3 w-3" />
                    Undo
                  </>
                ) : (
                  <>
                    <Check className="mr-1 h-3 w-3" />
                    Mark Taken
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
