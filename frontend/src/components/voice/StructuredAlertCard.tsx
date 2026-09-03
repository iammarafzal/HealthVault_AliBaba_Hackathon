"use client";

import {
  AlertTriangle,
  CalendarPlus,
  Clock,
  Pill,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface AlertAction {
  type: "add_to_planner" | "dismiss" | "lab_alert" | "safety_note";
  label: string;
}

interface StructuredAlertCardProps {
  title: string;
  description: string;
  intent: "medication_schedule" | "symptom_log" | "allergy_check" | (string & {});
  actions?: AlertAction[];
  onAction?: (action: AlertAction) => void;
}

const defaultConfig = {
  icon: AlertTriangle,
  color: "text-muted-foreground",
  bg: "bg-muted/30",
  borderColor: "border-border",
  badgeLabel: "Info",
};

const intentConfig: Record<string, typeof defaultConfig> = {
  medication_schedule: {
    icon: Pill,
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    borderColor: "border-blue-200 dark:border-blue-800",
    badgeLabel: "Medication",
  },
  symptom_log: {
    icon: AlertTriangle,
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    borderColor: "border-amber-200 dark:border-amber-800",
    badgeLabel: "Symptom",
  },
  allergy_check: {
    icon: AlertTriangle,
    color: "text-destructive",
    bg: "bg-destructive/5 dark:bg-destructive/10",
    borderColor: "border-destructive/30",
    badgeLabel: "Allergy Alert",
  },
};

/**
 * Structured AI response card with actionable buttons.
 * Displays medication reminders, lab test alerts, or clinical safety notes.
 */
export default function StructuredAlertCard({
  title,
  description,
  intent,
  actions,
  onAction,
}: StructuredAlertCardProps) {
  const config = intentConfig[intent] || defaultConfig;
  const Icon = config.icon;

  return (
    <Card
      className={cn(
        "overflow-hidden border-2 transition-all",
        config.borderColor
      )}
    >
      <CardContent className="p-0">
        {/* Header strip */}
        <div className={cn("flex items-center gap-2 px-4 py-2.5", config.bg)}>
          <Icon className={cn("h-4 w-4", config.color)} />
          <Badge
            variant="outline"
            className={cn("text-[10px] font-semibold", config.color)}
          >
            {config.badgeLabel}
          </Badge>
          <span className="text-xs font-medium">{title}</span>
        </div>

        {/* Body */}
        <div className="space-y-3 p-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>

          {/* Action buttons */}
          {actions && actions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {actions.map((action, idx) => {
                const isPrimary = action.type === "add_to_planner";
                const isDismiss = action.type === "dismiss";
                const ActionIcon = isPrimary
                  ? CalendarPlus
                  : isDismiss
                    ? X
                    : action.type === "lab_alert"
                      ? Clock
                      : AlertTriangle;

                return (
                  <Button
                    key={idx}
                    variant={isPrimary ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "gap-1.5 min-h-[44px]",
                      isDismiss && "text-muted-foreground"
                    )}
                    onClick={() => onAction?.(action)}
                  >
                    <ActionIcon className="h-3.5 w-3.5" />
                    {action.label}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
