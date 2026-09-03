"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import type { DoctorSummaryResponse as DoctorSummary, InteractionCheckResponse } from "@/types/api";

export interface DoctorSummaryPrintViewProps {
  summary: DoctorSummary;
  interactionAlert?: InteractionCheckResponse | null;
  className?: string;
}

interface ParsedBiomarker {
  analyte: string;
  value: string;
  status: string;
}

/**
 * Deduplicate and parse out-of-range lab biomarker strings into tabular rows
 */
function parseAndDeduplicateBiomarkers(biomarkers: string[] = []): ParsedBiomarker[] {
  const seen = new Map<string, ParsedBiomarker>();

  for (const raw of biomarkers) {
    if (!raw || !raw.trim()) continue;
    const clean = raw.trim();

    let analyte = clean;
    let value = "Abnormal";
    let status = "Out of Range";

    if (clean.includes(":")) {
      const parts = clean.split(":");
      analyte = parts[0].trim();
      const rest = parts.slice(1).join(":").trim();

      const parenMatch = rest.match(/^(.*?)\s*\((.*?)\)$/);
      if (parenMatch) {
        value = parenMatch[1].trim();
        status = parenMatch[2].trim();
      } else {
        value = rest;
        status = "Elevated";
      }
    } else {
      const parenMatch = clean.match(/^(.*?)\s*\((.*?)\)$/);
      if (parenMatch) {
        analyte = parenMatch[1].trim();
        status = parenMatch[2].trim();
      }
    }

    const key = analyte.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, { analyte, value, status });
    }
  }

  return Array.from(seen.values());
}

/**
 * Deduplicate list items case-insensitively
 */
function deduplicate(items: string[] = []): string[] {
  const seen = new Set<string>();
  const res: string[] = [];
  for (const item of items) {
    if (!item || !item.trim()) continue;
    const norm = item.trim().toLowerCase();
    if (!seen.has(norm)) {
      seen.add(norm);
      res.push(item.trim());
    }
  }
  return res;
}

/**
 * HealthVault AI — Ultra-Clean 1-Page Clinical Briefing Sheet
 * Engineered for 3-5 second doctor glanceability and 30-second complete scan.
 * Adheres to print-fidelity with hairline rules and zero box fatigue.
 * NOTE: MUST ALWAYS BE RENDERED IN ENGLISH FOR PHYSICIAN REVIEW.
 */
export default function DoctorSummaryPrintView({
  summary,
  interactionAlert,
  className = "",
}: DoctorSummaryPrintViewProps) {
  const diagnoses = deduplicate(summary.active_diagnoses);
  const allergies = deduplicate(summary.known_allergies);
  const medications = deduplicate(summary.current_medications);
  const biomarkers = parseAndDeduplicateBiomarkers(summary.recent_abnormal_biomarkers);

  const currentDate = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      id="doctor-summary-print"
      dir="ltr"
      className={`summary-print-container doctor-visit-sheet mx-auto max-w-[800px] bg-white text-[#0F172A] p-6 sm:p-8 font-sans antialiased text-xs leading-normal select-text ${className}`}
      style={{
        color: "#0F172A",
        backgroundColor: "#FFFFFF",
      }}
    >
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm 10mm 12mm;
          }
          body {
            background: #ffffff !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .doctor-visit-sheet {
            padding: 0 !important;
            max-width: 100% !important;
            box-shadow: none !important;
          }
          .print-avoid-break {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>

      {/* ═══ 1. CLINICAL HEADER STRIP ═══ */}
      <header className="pb-3 border-b-2 border-[#0D5C4A]" dir="ltr">
        {/* Top Row: Authority Label & Date / ID */}
        <div className="flex items-center justify-between pb-1 text-[11px]" dir="ltr">
          <div className="flex items-center gap-1.5 font-bold tracking-wider text-[#0D5C4A] uppercase">
            <span>HEALTHVAULT AI</span>
            <span>·</span>
            <span>CLINICAL BRIEF</span>
          </div>
          <div className="font-mono text-[11px] text-[#475569] font-medium" dir="ltr">
            <span>Prepared: {currentDate}</span>
            <span className="mx-1.5 text-slate-300">|</span>
            <span className="text-[#0D5C4A] font-bold">ID: {summary.health_id}</span>
          </div>
        </div>

        {/* Patient Vitals Bar */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-y-2 border-t border-slate-200" dir="ltr">
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[#0F172A]">
              {summary.patient_name || "Patient"}
            </h1>
            <span className="text-xs font-semibold text-[#475569]">
              {summary.age_gender || "—"}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#475569]">
                Blood Group:
              </span>
              <span className="font-bold text-[#C47C1A] text-sm" dir="ltr">
                {summary.blood_group || "—"}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#475569]">
                Allergy Status:
              </span>
              <span
                className={`font-semibold ${allergies.length > 0 ? "text-[#C0392B]" : "text-emerald-700"}`}
              >
                {allergies.length > 0
                  ? `${allergies.length} Documented (See Below)`
                  : "NKDA (No Known Allergies)"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ═══ 2. CRITICAL ALERTS BANNER (Shown only if safety alerts exist) ═══ */}
      {interactionAlert && interactionAlert.has_conflicts && (
        <section className="mt-3.5 border-l-4 border-amber-500 bg-amber-50/70 p-2.5 rounded-r print-avoid-break" dir="ltr">
          {interactionAlert.alerts.map((alert, idx) => (
            <div key={idx} className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-[#C47C1A] shrink-0" />
                <span className="font-bold text-xs text-[#874A00]">
                  Medicine Interaction Warning: {alert.interacting_drugs.join(" + ")} conflict
                </span>
              </div>
              <p className="text-[11px] text-slate-700 pl-5 leading-tight">
                {alert.clinical_risk} — <strong className="font-semibold text-slate-900">{alert.recommendation_en}</strong>
              </p>
            </div>
          ))}
        </section>
      )}

      {/* ═══ 3. TWO-COLUMN HIGH-DENSITY CLINICAL CORE ═══ */}
      <div className="mt-4 grid grid-cols-2 gap-6 print-avoid-break items-start" dir="ltr">
        {/* ── LEFT COLUMN (48%): Diagnoses & Allergies ── */}
        <div className="space-y-4">
          {/* Section A: Active Diagnoses & Conditions */}
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-2">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#0D5C4A]">
                ACTIVE DIAGNOSES &amp; CONDITIONS
              </h2>
            </div>
            {diagnoses.length > 0 ? (
              <ul className="space-y-1 text-xs text-slate-800">
                {diagnoses.map((dx, i) => (
                  <li key={i} className="flex items-start gap-2 leading-snug">
                    <span className="text-[#0D5C4A] font-black text-sm leading-none">•</span>
                    <span className="font-medium text-slate-900">{dx}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-400 italic text-[11px]">No active chronic diagnoses reported.</p>
            )}
          </div>

          {/* Section B: Critical Drug Allergies */}
          <div className="pt-1">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-2">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#C0392B]">
                CRITICAL DRUG ALLERGIES
              </h2>
            </div>
            {allergies.length > 0 ? (
              <ul className="space-y-1 text-xs text-slate-900">
                {allergies.map((allergy, i) => (
                  <li key={i} className="flex items-start gap-2 leading-snug">
                    <span className="text-[#C0392B] font-black text-sm leading-none">•</span>
                    <span className="font-semibold text-slate-900">{allergy}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 font-medium text-[11px]">NKDA (No Known Drug Allergies)</p>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN (48%): Medications & Out-of-Range Labs ── */}
        <div className="space-y-4">
          {/* Section C: Current Daily Medications */}
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-2">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#0D5C4A]">
                CURRENT DAILY MEDICATIONS
              </h2>
            </div>
            {medications.length > 0 ? (
              <div className="space-y-1 text-xs">
                {medications.map((med, i) => (
                  <div
                    key={i}
                    className="flex items-baseline justify-between py-0.5 border-b border-slate-100 last:border-0"
                  >
                    <span className="font-semibold text-slate-900">{med}</span>
                    <span className="text-[10px] font-mono text-slate-500 shrink-0 ml-2">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 italic text-[11px]">No active prescribed medicines recorded.</p>
            )}
          </div>

          {/* Section D: Out-of-Range Lab Biomarkers */}
          <div className="pt-1">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-2">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#C47C1A]">
                OUT-OF-RANGE LAB BIOMARKERS
              </h2>
            </div>
            {biomarkers.length > 0 ? (
              <div className="overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold uppercase text-slate-400">
                      <th className="pb-1 font-semibold">Analyte</th>
                      <th className="pb-1 font-semibold text-right">Value</th>
                      <th className="pb-1 font-semibold text-right pl-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {biomarkers.map((b, i) => (
                      <tr key={i} className="py-0.5">
                        <td className="py-1 font-medium text-slate-900">{b.analyte}</td>
                        <td className="py-1 font-mono font-bold text-slate-900 text-right">
                          {b.value}
                        </td>
                        <td className="py-1 font-semibold text-[#C47C1A] text-right pl-2">
                          {b.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-emerald-700 font-medium text-[11px]">
                All recent lab parameters within normal limits.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ═══ 4. CLINICIAN SYNTHESIS & NARRATIVE NOTE ═══ */}
      <section className="mt-5 pt-3 border-t border-slate-200 print-avoid-break space-y-1.5" dir="ltr">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            AI CLINICAL SYNTHESIS
          </h3>
          <span className="text-[10px] font-mono text-slate-400">Synthesized from primary records</span>
        </div>
        <p className="text-xs text-slate-800 leading-relaxed font-normal bg-slate-50/70 p-3 rounded border border-slate-200/80">
          {summary.clinical_notes?.trim() ||
            "Patient medical history synthesized across uploaded diagnostic lab panels and prescriptions. Continue active regimen with standard routine surveillance."}
        </p>
      </section>

      {/* ═══ 5. BOTTOM WATERMARK FOOTNOTE ═══ */}
      <footer className="mt-6 pt-3 border-t border-slate-100 text-center text-[9px] font-mono text-slate-400 select-none">
        Confidential Clinical Summary generated for doctor review • HealthVault AI Medical OS
      </footer>
    </div>
  );
}
