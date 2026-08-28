"use client";

import {
  AlertTriangle,
  FileText,
  Heart,
  Printer,
  ShieldAlert,
  Sparkles,
  Stethoscope,
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
import { mockDoctorSummary } from "@/lib/mockData";

export default function SummaryPage() {
  const summary = mockDoctorSummary;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            AI Doctor Summary
          </h1>
          <p className="text-muted-foreground">
            1-page clinical executive briefing for consulting doctors.
          </p>
        </div>
        <div className="flex gap-2">
          <Button>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Summary
          </Button>
          <Button variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Print / Export PDF
          </Button>
        </div>
      </div>

      {/* Patient Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" />
            Patient Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoItem label="Name" value={summary.patient_name} />
            <InfoItem label="Health ID" value={summary.health_id} />
            <InfoItem label="Age / Gender" value={summary.age_gender} />
            <InfoItem label="Blood Group" value={summary.blood_group} />
          </div>
        </CardContent>
      </Card>

      {/* Diagnoses & Medications */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Active Diagnoses */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Stethoscope className="h-4 w-4 text-blue-500" />
              Active Diagnoses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {summary.active_diagnoses.map((dx) => (
                <Badge key={dx} variant="secondary">
                  {dx}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Current Medications */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Heart className="h-4 w-4 text-emerald-500" />
              Current Medications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {summary.current_medications.map((med) => (
                <li
                  key={med}
                  className="flex items-center gap-2 text-sm"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {med}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Allergies & Risk Factors */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Severe Allergies */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              Known Allergies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {summary.known_allergies.map((a) => (
                <Badge key={a} variant="destructive">
                  {a}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Risk Factors */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Risk Factors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {summary.risk_factors.map((rf) => (
                <li
                  key={rf}
                  className="flex items-center gap-2 text-sm"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  {rf}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Abnormal Biomarkers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-orange-500" />
            Recent Abnormal Biomarkers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {summary.recent_abnormal_biomarkers.map((b) => (
              <Badge key={b} variant="outline" className="border-orange-300 text-orange-700 dark:text-orange-400">
                {b}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Clinical Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" />
            Clinical Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {summary.clinical_notes}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
