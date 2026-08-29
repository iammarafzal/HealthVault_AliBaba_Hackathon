"use client";

import {
  CalendarDays,
  Eye,
  Hospital,
  Pill,
  ShieldAlert,
  Stethoscope,
  Trash2,
  Sparkles,
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
import type { ExtractionResponse } from "@/types/api";

const docTypeColor: Record<string, string> = {
  prescription:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  lab_report:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  discharge_summary:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

interface RecordCardProps {
  record: ExtractionResponse;
  onViewDetails: (record: ExtractionResponse) => void;
  onInterpret: (record: ExtractionResponse) => void;
  onDelete: (recordId: string) => void;
}

export default function RecordCard({
  record,
  onViewDetails,
  onInterpret,
  onDelete,
}: RecordCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Badge
            variant="outline"
            className={
              docTypeColor[record.document_type] ??
              "bg-muted text-muted-foreground"
            }
          >
            {record.document_type.replace(/_/g, " ")}
          </Badge>
          {record.consultation_date && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="h-3 w-3" />
              {new Date(record.consultation_date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
        </div>
        <CardTitle className="text-base">
          {record.doctor_name ?? "Unknown Doctor"}
        </CardTitle>
        {record.hospital_name && (
          <CardDescription className="flex items-center gap-1">
            <Hospital className="h-3 w-3" />
            {record.hospital_name}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="flex-1 space-y-3 pt-0">
        {/* Diagnoses */}
        {record.diagnoses.length > 0 && (
          <div>
            <p className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Stethoscope className="h-3 w-3" />
              Diagnoses
            </p>
            <div className="flex flex-wrap gap-1">
              {record.diagnoses.map((dx) => (
                <Badge key={dx} variant="secondary" className="text-[11px]">
                  {dx}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Medications count */}
        {record.medications.length > 0 && (
          <div>
            <p className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Pill className="h-3 w-3" />
              Medications ({record.medications.length})
            </p>
            <ul className="space-y-0.5 text-xs">
              {record.medications.slice(0, 3).map((med) => (
                <li
                  key={med.name}
                  className="flex items-center justify-between"
                >
                  <span className="truncate font-medium">
                    {med.name} {med.dosage}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {med.frequency}
                  </span>
                </li>
              ))}
              {record.medications.length > 3 && (
                <li className="text-muted-foreground">
                  +{record.medications.length - 3} more
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Allergies count */}
        {record.allergies.length > 0 && (
          <div>
            <p className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <ShieldAlert className="h-3 w-3" />
              Allergies ({record.allergies.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {record.allergies.map((a) => (
                <Badge
                  key={a.allergen}
                  variant="destructive"
                  className="text-[11px]"
                >
                  {a.allergen}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => onViewDetails(record)}
          >
            <Eye className="mr-1 h-3 w-3" />
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => onInterpret(record)}
          >
            <Sparkles className="mr-1 h-3 w-3" />
            Interpret
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
            onClick={() => onDelete(record.record_id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
