"use client";

import { motion } from "framer-motion";
import {
  ShieldCheck,
  ArrowRight,
  Activity,
  Pill,
  CheckCircle2,
  QrCode,
  FileCheck,
  Languages,
} from "lucide-react";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-center overflow-hidden bg-gradient-to-b from-vault-stoneWhite via-vault-light/30 to-vault-stoneWhite py-10 sm:py-16 lg:py-20">
      {/* ── Floating Ambient Teal Glow Orbs ── */}
      <motion.div
        animate={{
          x: [0, 25, 0, -20, 0],
          y: [0, -20, 15, 0],
          scale: [1, 1.08, 0.95, 1],
        }}
        transition={{
          duration: 16,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 sm:h-96 sm:w-96 rounded-full bg-gradient-to-br from-vault-active/20 to-vault-teal/10 blur-[70px] sm:blur-[90px]"
      />
      <motion.div
        animate={{
          x: [0, -30, 20, 0],
          y: [0, 25, -15, 0],
          scale: [1, 0.95, 1.1, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="pointer-events-none absolute top-1/3 -right-24 h-72 w-72 sm:h-[420px] sm:w-[420px] rounded-full bg-gradient-to-tr from-vault-teal/15 via-vault-active/10 to-transparent blur-[80px] sm:blur-[100px]"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-landing flex-col-reverse items-center justify-between gap-10 px-4 sm:px-6 lg:flex-row lg:gap-16">
        {/* ── Left Content Column ── */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 text-center lg:text-left w-full"
        >
          {/* Pulse Badge */}
          <div className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-vault-tealBorder/80 bg-white/85 px-3.5 py-1.5 shadow-xs backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-vault-active opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-vault-active" />
            </span>
            <ShieldCheck className="h-4 w-4 text-vault-active" />
            <span className="font-inter text-xs font-semibold tracking-wide text-vault-teal">
              Pakistan&apos;s First AI Health OS
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-jakarta text-3xl sm:text-5xl lg:text-[56px] font-bold tracking-tight text-vault-slate leading-[1.15] sm:leading-[1.12]">
            Your complete medical history.{" "}
            <span className="bg-gradient-to-r from-vault-teal via-vault-active to-vault-dark bg-clip-text text-transparent">
              Always with you.
            </span>
          </h1>

          {/* Urdu Subtitle */}
          <p className="mt-3 sm:mt-4 font-urdu text-xl sm:text-2xl font-medium text-vault-teal leading-relaxed" dir="rtl">
            اپنی صحت کا مکمل ریکارڈ — ہمیشہ آپ کے ساتھ
          </p>

          {/* Subheadline (Trimmed to 2 crisp sentences) */}
          <p className="mt-4 sm:mt-5 max-w-xl font-inter text-sm sm:text-base lg:text-lg text-vault-mutedTeal leading-relaxed mx-auto lg:mx-0">
            Upload prescriptions, track vital health trends, and receive instant plain-language Urdu dosage schedules. Access life-saving medical data via one scannable emergency QR card — zero login required.
          </p>

          {/* CTA Buttons */}
          <div className="mt-7 sm:mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row lg:justify-start w-full">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
              <Link
                href="/register"
                className="group relative flex w-full sm:w-auto items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-vault-teal px-6 sm:px-7 py-3.5 font-inter text-sm font-semibold text-white shadow-md shadow-vault-teal/20 transition-all duration-200 hover:bg-vault-active hover:shadow-lg hover:shadow-vault-active/25"
              >
                <span>Start Your Health Vault</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
              <a
                href="#problem-section"
                className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-vault-teal/30 bg-white/70 px-6 py-3.5 font-inter text-sm font-semibold text-vault-teal shadow-xs backdrop-blur-xs transition-all duration-200 hover:bg-vault-light hover:border-vault-teal"
              >
                See How It Works
              </a>
            </motion.div>
          </div>

          {/* Value Proposition Micro-stats / Pill Badges */}
          <div className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5 lg:justify-start border-t border-vault-tealBorder/60 pt-5 sm:pt-6">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-vault-tealBorder/60 px-3 py-1 text-vault-mutedTeal shadow-2xs">
              <FileCheck className="w-3.5 h-3.5 text-vault-teal" />
              <span className="font-inter text-xs font-semibold text-vault-slate">
                Fast Summary
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-vault-tealBorder/60 px-3 py-1 text-vault-mutedTeal shadow-2xs">
              <QrCode className="w-3.5 h-3.5 text-vault-active" />
              <span className="font-inter text-xs font-semibold text-vault-slate">
                Emergency QR
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-vault-tealBorder/60 px-3 py-1 text-vault-mutedTeal shadow-2xs">
              <Languages className="w-3.5 h-3.5 text-vault-teal" />
              <span className="font-inter text-xs font-semibold text-vault-slate">
                Urdu & English
              </span>
            </div>
          </div>
        </motion.div>

        {/* ── Right Interactive Mockup Column ── */}
        <div className="relative flex flex-1 items-center justify-center w-full max-w-[420px] lg:max-w-[440px]">
          {/* Subtle spinning dashed circle background */}
          <div className="absolute -inset-4 rounded-full border border-vault-teal/10 opacity-70" />
          <div className="absolute -inset-8 sm:-inset-10 rounded-full border border-dashed border-vault-active/15 animate-[spin_40s_linear_infinite]" />

          {/* Floating Phone Dashboard Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -6, transition: { duration: 0.3 } }}
            className="relative z-10 w-full rounded-2xl border border-vault-tealBorder/80 bg-white/95 p-5 sm:p-6 shadow-xl shadow-vault-teal/5 backdrop-blur-xl"
          >
            {/* Status bar */}
            <div className="mb-4 flex items-center justify-between border-b border-vault-tealBorder/40 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-vault-active" />
                <span className="font-inter text-xs font-semibold text-vault-slate">Live Health Record</span>
              </div>
              <span className="rounded bg-vault-light px-2 py-0.5 font-mono text-[10px] font-semibold text-vault-teal">
                HV-PAK-10294
              </span>
            </div>

            {/* Patient Header (Anonymized Pakistani dummy identity) */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-inter text-[11px] font-medium text-vault-mutedTeal uppercase tracking-wider">Patient Profile</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="font-jakarta text-base sm:text-lg font-bold text-vault-slate">Abdullah Ahmed</p>
                  <CheckCircle2 className="h-4 w-4 text-vault-active" />
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-inter text-[10px] font-medium text-vault-mutedTeal">Blood Group</span>
                <span className="mt-0.5 inline-flex items-center rounded-md bg-vault-warningBg px-2.5 py-0.5 font-inter text-xs font-bold text-vault-amber border border-vault-amber/20">
                  B POSITIVE (B+)
                </span>
              </div>
            </div>

            {/* Active Medication Card */}
            <div className="rounded-xl border border-vault-tealBorder bg-vault-stoneWhite/80 p-3 sm:p-3.5 mb-4 transition-colors hover:border-vault-teal/40">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-vault-light border border-vault-teal/20 text-vault-teal">
                  <Pill className="h-4 w-4 text-vault-teal" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-inter text-xs font-bold text-vault-slate truncate">Tab. Metformin 500mg</p>
                    <span className="text-[10px] font-semibold text-vault-active bg-vault-active/10 px-2 py-0.5 rounded">Active</span>
                  </div>
                  <p className="font-inter text-[11px] text-vault-mutedTeal mt-0.5">1 Tablet · After Meals (1-0-1)</p>
                  <p className="font-urdu text-xs text-vault-teal mt-1 font-medium" dir="rtl">
                    کھانے کے بعد صبح اور شام
                  </p>
                </div>
              </div>
            </div>

            {/* Dynamic Vital Signs / Heartbeat ECG Waveform Animation */}
            <div className="rounded-xl border border-vault-tealBorder/70 bg-gradient-to-r from-vault-stoneWhite via-white to-vault-stoneWhite p-3 sm:p-3.5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-vault-teal animate-pulse" />
                  <span className="font-inter text-xs font-semibold text-vault-slate">Heart Rate & ECG</span>
                </div>
                <span className="font-inter text-xs font-bold text-vault-active">72 BPM · Normal</span>
              </div>

              {/* Animated ECG SVG */}
              <div className="relative h-12 w-full overflow-hidden rounded-lg bg-vault-slate/5 px-2 py-1 flex items-center">
                <svg viewBox="0 0 400 48" className="h-full w-full overflow-visible" preserveAspectRatio="none">
                  {/* Grid background lines */}
                  <defs>
                    <pattern id="ecg-grid" width="20" height="12" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 12" fill="none" stroke="#DCE8E5" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#ecg-grid)" />

                  {/* Faint static trace */}
                  <path
                    d="M 0,24 L 60,24 L 75,24 L 85,8 L 95,40 L 105,16 L 115,30 L 125,24 L 200,24 L 215,24 L 225,8 L 235,40 L 245,16 L 255,30 L 265,24 L 340,24 L 355,24 L 365,8 L 375,40 L 385,16 L 395,30 L 400,24"
                    fill="none"
                    stroke="#DCE8E5"
                    strokeWidth="1.5"
                  />

                  {/* Animated glowing trace */}
                  <motion.path
                    d="M 0,24 L 60,24 L 75,24 L 85,8 L 95,40 L 105,16 L 115,30 L 125,24 L 200,24 L 215,24 L 225,8 L 235,40 L 245,16 L 255,30 L 265,24 L 340,24 L 355,24 L 365,8 L 375,40 L 385,16 L 395,30 L 400,24"
                    fill="none"
                    stroke="#0A8C6A"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, pathOffset: 0 }}
                    animate={{
                      pathOffset: [0, 1],
                      pathLength: [0.25, 0.4, 0.25],
                    }}
                    transition={{
                      duration: 2.8,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                </svg>
              </div>
            </div>

            {/* Floating Glassmorphism Micro-badge */}
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-3 -right-2 sm:-bottom-4 sm:-right-4 flex items-center gap-2 rounded-xl border border-vault-teal/20 bg-white/95 px-3 py-1.5 sm:px-3.5 sm:py-2 shadow-lg shadow-black/5 backdrop-blur-md"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-vault-light text-vault-active">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="font-inter text-[10px] font-semibold text-vault-slate">Verified Record</p>
                <p className="font-inter text-[9px] text-vault-mutedTeal">End-to-End Encrypted</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
