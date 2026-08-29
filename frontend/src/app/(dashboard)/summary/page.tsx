"use client";

import { useState } from "react";
import {
  AlertTriangle,
  FileText,
  Heart,
  Loader2,
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import DoctorSummaryPrintView from "@/components/summary/DoctorSummaryPrintView";
import { mockDoctorSummary } from "@/lib/mockData";
import { getDoctorSummary } from "@/services/apiService";
import type { DoctorSummary } from "@/types/models";

export default function SummaryPage() {
  const [summaryData, setSummaryData] = useState<DoctorSummary | null>(
    mockDoctorSummary
  );
  const [loading, setLoading] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);

  /* ── Generate summary with 1.5s simulated delay ──────────── */
  const handleGenerateSummary = async () => {
    setLoading(true);
    try {
      // Simulate AI processing delay
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const data = await getDoctorSummary("mock-user-id");
      setSummaryData(data);
    } catch {
      setSummaryData(mockDoctorSummary);
    } finally {
      setLoading(false);
    }
  };

  /* ── Print / Export PDF ──────────────────────────────────── */
  const handlePrint = () => {
    setShowPrintView(true);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  /* ── Print view ──────────────────────────────────────────── */
  if (showPrintView && summaryData) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex justify-end gap-2 print:hidden">
          <Button variant="outline" onClick={() => setShowPrintView(false)}>
            Back to Summary
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print Again
          </Button>
        </div>
        <DoctorSummaryPrintView summary={summaryData} />
      </div>
    );
  }

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
          <Button
            onClick={handleGenerateSummary}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {loading ? "Generating…" : "Generate Summary"}
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print / Export PDF
          </Button>
        </div>
      </div>

      {/* Patient Info */}
      {loading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : summaryData ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" />
              Patient Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <InfoItem label="Name" value={summaryData.patient_name} />
              <InfoItem label="Health ID" value={summaryData.health_id} />
              <InfoItem label="Age / Gender" value={summaryData.age_gender} />
              <InfoItem label="Blood Group" value={summaryData.blood_group} />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Diagnoses & Medications */}
      <div className="grid gap-4 md:grid-cols-2">
        {loading ? (
          <>
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </>
        ) : summaryData ? (
          <>
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
                  {summaryData.active_diagnoses.map((dx) => (
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
                  {summaryData.current_medications.map((med) => (
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
          </>
        ) : null}
      </div>

      {/* Allergies & Risk Factors */}
      <div className="grid gap-4 md:grid-cols-2">
        {loading ? (
          <>
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </>
        ) : summaryData ? (
          <>
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
                  {summaryData.known_allergies.map((a) => (
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
                  {summaryData.risk_factors.map((rf) => (
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
          </>
        ) : null}
      </div>

      {/* Abnormal Biomarkers */}
      {loading ? (
        <Skeleton className="h-32 w-full rounded-xl" />
      ) : summaryData ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              Recent Abnormal Biomarkers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {summaryData.recent_abnormal_biomarkers.map((b) => (
                <Badge
                  key={b}
                  variant="outline"
                  className="border-orange-300 text-orange-700 dark:text-orange-400"
                >
                  {b}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Clinical Notes */}
      {loading ? (
        <Skeleton className="h-32 w-full rounded-xl" />
      ) : summaryData ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" />
              Clinical Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {summaryData.clinical_notes}
            </p>
          </CardContent>
        </Card>
      ) : null}
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
