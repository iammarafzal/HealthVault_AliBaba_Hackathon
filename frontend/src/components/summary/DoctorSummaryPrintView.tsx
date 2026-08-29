"use client";

import type { DoctorSummary } from "@/types/models";

interface DoctorSummaryPrintViewProps {
  summary: DoctorSummary;
}

/**
 * Compact 1-page clinical executive briefing optimized for print.
 * Renders all critical patient data in a dense, scannable layout.
 * Uses @media print styles to ensure zero page overflow.
 */
export default function DoctorSummaryPrintView({
  summary,
}: DoctorSummaryPrintViewProps) {
  return (
    <div
      id="doctor-summary-print"
      className="summary-print-container mx-auto max-w-4xl space-y-4 p-6 text-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h1 className="text-xl font-bold">Clinical Summary Briefing</h1>
          <p className="text-xs text-muted-foreground">
            Generated on {new Date().toLocaleDateString("en-US", { dateStyle: "long" })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold">{summary.patient_name}</p>
          <p className="text-xs text-muted-foreground">
            ID: {summary.health_id}
          </p>
        </div>
      </div>

      {/* Patient Demographics */}
      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-primary">
          Patient Demographics
        </h2>
        <div className="grid grid-cols-4 gap-3 rounded border p-3">
          <div>
            <p className="text-[10px] font-medium uppercase text-muted-foreground">Name</p>
            <p className="font-semibold">{summary.patient_name}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase text-muted-foreground">Age / Gender</p>
            <p className="font-semibold">{summary.age_gender}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase text-muted-foreground">Health ID</p>
            <p className="font-semibold">{summary.health_id}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase text-muted-foreground">Blood Group</p>
            <p className="font-semibold">{summary.blood_group}</p>
          </div>
        </div>
      </section>

      {/* Active Diagnoses & Current Medications */}
      <div className="grid grid-cols-2 gap-4">
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">
            Active Diagnoses
          </h2>
          <ul className="space-y-1 rounded border border-blue-200 p-3 dark:border-blue-900/40">
            {summary.active_diagnoses.map((dx) => (
              <li key={dx} className="flex items-center gap-2 text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                {dx}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            Current Medications
          </h2>
          <ul className="space-y-1 rounded border border-emerald-200 p-3 dark:border-emerald-900/40">
            {summary.current_medications.map((med) => (
              <li key={med} className="flex items-center gap-2 text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {med}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Allergies & Biomarkers */}
      <div className="grid grid-cols-2 gap-4">
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-red-600 dark:text-red-400">
            Severe Allergies
          </h2>
          <div className="flex flex-wrap gap-1.5 rounded border border-red-200 p-3 dark:border-red-900/40">
            {summary.known_allergies.map((a) => (
              <span
                key={a}
                className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400"
              >
                {a}
              </span>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-orange-600 dark:text-orange-400">
            Critical Biomarkers
          </h2>
          <div className="flex flex-wrap gap-1.5 rounded border border-orange-200 p-3 dark:border-orange-900/40">
            {summary.recent_abnormal_biomarkers.map((b) => (
              <span
                key={b}
                className="rounded bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
              >
                {b}
              </span>
            ))}
          </div>
        </section>
      </div>

      {/* AI Clinical Risk Alerts */}
      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
          AI Clinical Risk Alerts
        </h2>
        <ul className="space-y-1 rounded border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
          {summary.risk_factors.map((rf) => (
            <li key={rf} className="flex items-start gap-2 text-xs">
              <span className="mt-0.5 text-amber-500">⚠</span>
              {rf}
            </li>
          ))}
        </ul>
      </section>

      {/* Clinical Notes */}
      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Clinical Notes
        </h2>
        <p className="rounded border p-3 text-xs leading-relaxed text-muted-foreground">
          {summary.clinical_notes}
        </p>
      </section>

      {/* Footer */}
      <div className="border-t pt-2 text-center text-[10px] text-muted-foreground">
        HealthVault AI — Auto-generated clinical summary. For professional medical use only.
      </div>
    </div>
  );
}
