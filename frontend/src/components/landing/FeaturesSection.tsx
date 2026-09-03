"use client";

import { motion } from "framer-motion";
import {
  Database,
  FileText,
  ScanLine,
  Clock,
  QrCode,
  ShieldAlert,
  TrendingUp,
  Mic,
  Lock,
  Sparkles,
} from "lucide-react";

const FEATURES = [
  {
    icon: Database,
    title: "AI Medical Vault",
    description: "Store every prescription, lab report, and imaging record in one secure, unified digital archive.",
  },
  {
    icon: FileText,
    title: "AI Doctor Summary",
    description: "Generate a structured, clinical-grade summary in 10 seconds for physician consultations.",
    badge: { text: "10 sec", bg: "#E8F7F4", color: "#0D5C4A" },
  },
  {
    icon: ScanLine,
    title: "Prescription OCR",
    description: "Camera scan handwritten prescriptions to extract dosages, trade names, and generic formulas.",
  },
  {
    icon: Clock,
    title: "Medication Planner",
    description: "Automated schedule reminders for daily doses, prayer time alignments, and refilling alarms.",
  },
  {
    icon: QrCode,
    title: "Emergency QR Triage",
    description: "Instant read-only emergency vital access for first responders with zero login or app install.",
    badge: { text: "Zero login", bg: "#FEF5E4", color: "#C47C1A" },
  },
  {
    icon: ShieldAlert,
    title: "Drug Interaction Guard",
    description: "Instant detection of cross-drug contraindications and lethal allergen mismatches.",
  },
  {
    icon: TrendingUp,
    title: "Lab Biomarker Trends",
    description: "Visual trajectory tracking for HbA1c, lipid profiles, renal function, and blood pressure.",
  },
  {
    icon: Mic,
    title: "Urdu Voice Assistant",
    description: "Speak and listen in Urdu for dosage clarification and health record queries without language barriers.",
  },
  {
    icon: Lock,
    title: "End-to-End Privacy",
    description: "Client-side encrypted health storage with patient-managed consent and revocable QR locks.",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="relative py-16 sm:py-20 lg:py-24 bg-vault-light/40 overflow-hidden border-t border-vault-tealBorder/40">
      <div className="relative z-10 mx-auto max-w-landing px-4 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-2xl text-center"
        >
          <div className="inline-flex items-center gap-1.5 rounded-full border border-vault-teal/20 bg-white px-3.5 py-1 text-xs font-semibold text-vault-teal uppercase tracking-wider mb-3.5 sm:mb-4 shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 text-vault-active" />
            <span>Comprehensive Health OS</span>
          </div>
          <h2 className="font-jakarta text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-vault-slate">
            Everything your health record should be
          </h2>
          <p className="mt-3.5 sm:mt-4 font-inter text-sm sm:text-base lg:text-lg text-vault-mutedTeal">
            Engineered specifically for Pakistan&apos;s healthcare ecosystem with AI-powered intelligence.
          </p>
        </motion.div>

        {/* Feature Grid: grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 */}
        <div className="mt-10 sm:mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {FEATURES.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: idx * 0.05, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group relative flex flex-col justify-between rounded-2xl border border-vault-tealBorder/80 bg-white p-5 sm:p-6 shadow-xs transition-all duration-200 hover:border-vault-teal/50 hover:shadow-lg"
              >
                <div>
                  <div className="mb-3.5 sm:mb-4 flex items-center justify-between">
                    <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-vault-light border border-vault-teal/15 text-vault-teal transition-transform group-hover:scale-105">
                      <Icon className="h-5 w-5 text-vault-teal" />
                    </div>
                    {feature.badge && (
                      <span
                        className="rounded-full px-2.5 py-0.5 font-inter text-[10px] sm:text-[11px] font-bold"
                        style={{ backgroundColor: feature.badge.bg, color: feature.badge.color }}
                      >
                        {feature.badge.text}
                      </span>
                    )}
                  </div>
                  <h3 className="font-jakarta text-base font-bold text-vault-slate group-hover:text-vault-teal transition-colors">
                    {feature.title}
                  </h3>
                  <p className="mt-2 font-inter text-xs sm:text-sm leading-relaxed text-vault-mutedTeal">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
