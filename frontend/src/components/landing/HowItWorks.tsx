"use client";

import { motion } from "framer-motion";
import {
  UploadCloud,
  ScanText,
  Activity,
  QrCode,
  Sparkles,
  HeartPulse,
} from "lucide-react";

const STEPS = [
  {
    stepNumber: "01",
    tag: "INSTANT CAPTURE",
    icon: UploadCloud,
    title: "1. Upload Prescription",
    description: "Take a camera photo of any doctor note, hospital discharge summary, or lab report slip.",
    renderWidget: () => (
      <div className="relative flex flex-col items-center justify-center rounded-xl border border-dashed border-vault-teal/30 bg-vault-stoneWhite/80 p-3.5 sm:p-4 transition-all duration-300 group-hover:border-vault-active group-hover:bg-vault-light/30">
        <motion.div
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-white shadow-xs border border-vault-tealBorder text-vault-teal"
        >
          <UploadCloud className="h-5 w-5 sm:h-6 sm:w-6 text-vault-teal" />
        </motion.div>
        <span className="mt-2 font-inter text-xs font-semibold text-vault-slate">
          Snap or Drag File
        </span>
        <div className="mt-2 flex items-center gap-1.5">
          <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[9px] font-bold text-vault-mutedTeal border border-vault-tealBorder">
            PDF
          </span>
          <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[9px] font-bold text-vault-mutedTeal border border-vault-tealBorder">
            JPG
          </span>
          <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[9px] font-bold text-vault-mutedTeal border border-vault-tealBorder">
            PNG
          </span>
        </div>
      </div>
    ),
  },
  {
    stepNumber: "02",
    tag: "AI EXTRACTION",
    icon: ScanText,
    title: "2. Extract & Translate",
    description: "AI deciphers handwriting, structures active ingredients, and translates dosages into clear Urdu.",
    renderWidget: () => (
      <div className="relative overflow-hidden rounded-xl border border-vault-tealBorder/80 bg-white p-3 sm:p-3.5 transition-all duration-300 group-hover:border-vault-active/40">
        {/* Animated Laser Beam */}
        <motion.div
          animate={{ top: ["4px", "78px", "4px"] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-2 right-2 h-[2px] bg-gradient-to-r from-transparent via-vault-active to-transparent shadow-[0_0_6px_#0A8C6A]"
        />

        <div className="flex items-center justify-between border-b border-vault-tealBorder/40 pb-1.5 mb-2">
          <span className="font-mono text-[10px] font-bold text-vault-teal flex items-center gap-1">
            <ScanText className="h-3 w-3 text-vault-active" /> OCR Active
          </span>
          <span className="rounded bg-vault-light px-1.5 py-0.5 font-urdu text-[10px] font-bold text-vault-teal" dir="rtl">
            اردو ترجمہ
          </span>
        </div>

        <div className="space-y-1 font-mono text-[10px]">
          <p className="text-vault-slate font-bold truncate">Rx Metformin 500mg</p>
          <p className="text-vault-mutedTeal text-[9px]">1-0-1 After meals (AC)</p>
          <div className="mt-1.5 rounded bg-vault-light/50 px-2 py-0.5 text-right font-urdu text-[10px] text-vault-teal">
            کھانے کے بعد ایک گولی
          </div>
        </div>
      </div>
    ),
  },
  {
    stepNumber: "03",
    tag: "INTELLIGENCE",
    icon: Activity,
    title: "3. Health Intelligence",
    description: "Interactive timeline tracking, interaction alerts, and biomarker trend analysis calculated automatically.",
    renderWidget: () => (
      <div className="relative rounded-xl border border-vault-tealBorder/80 bg-white p-3 sm:p-3.5 transition-all duration-300 group-hover:border-vault-active/40">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-vault-active animate-pulse" />
            <span className="font-inter text-[10px] font-bold text-vault-slate">Biomarker Trends</span>
          </div>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-inter text-[9px] font-bold text-emerald-700 border border-emerald-200">
            Safe Range
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-vault-mutedTeal font-medium">Fasting Glucose</span>
            <span className="font-mono font-bold text-vault-slate">98 mg/dL</span>
          </div>
          {/* Mini progress bar */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-vault-stoneWhite border border-vault-tealBorder/40">
            <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-vault-teal to-vault-active" />
          </div>
          <div className="flex items-center justify-between text-[9px] text-vault-mutedTeal/70 pt-0.5">
            <span>Target: 70–100</span>
            <span className="text-vault-active font-semibold">Normal</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    stepNumber: "04",
    tag: "EMERGENCY ACCESS",
    icon: QrCode,
    title: "4. One-Scan Triage",
    description: "First responders scan your digital card to access blood group and allergies with zero login required.",
    renderWidget: () => (
      <div className="relative rounded-xl border border-vault-teal/20 bg-gradient-to-br from-[#064234] to-[#0D5C4A] p-3 text-white transition-all duration-300">
        <div className="flex items-center justify-between mb-2 border-b border-white/10 pb-1.5">
          <div className="flex items-center gap-1">
            <HeartPulse className="h-3 w-3 text-emerald-300" />
            <span className="font-jakarta text-[10px] font-black tracking-wider text-white">SEHAT CARD</span>
          </div>
          <span className="rounded bg-[#C0392B] px-1.5 py-0.5 font-inter text-[8px] font-bold text-white uppercase">
            SOS Live
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="space-y-0.5 flex-1 min-w-0">
            <p className="font-inter text-[8px] text-emerald-200/70 uppercase">Blood Group</p>
            <p className="font-jakarta text-xs font-bold text-white truncate">B POSITIVE (B+)</p>
            <p className="font-mono text-[8px] text-emerald-100/70">HV-PAK-10294</p>
          </div>
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-white p-1 shadow-xs">
            <QrCode className="h-7 w-7 sm:h-8 sm:w-8 text-vault-slate" />
          </div>
        </div>
      </div>
    ),
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-16 sm:py-20 lg:py-24 bg-vault-stoneWhite/60 overflow-hidden border-t border-vault-tealBorder/40">
      {/* Subtle Background Glow */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] sm:h-[500px] w-[600px] sm:w-[900px] rounded-full bg-vault-teal/5 blur-[100px] sm:blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-landing px-4 sm:px-6">
        {/* ── Section Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-3xl text-center"
        >
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#B2DFD4] bg-[#E8F7F4] px-4 py-1.5 text-xs font-semibold text-[#0D5C4A] uppercase tracking-wider mb-3.5 sm:mb-4 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-[#0A8C6A]" />
            <span>SEAMLESS 4-STEP PROCESS</span>
          </div>

          {/* Display Heading */}
          <h2 className="font-jakarta text-2xl sm:text-4xl lg:text-5xl font-bold text-[#1A2826] tracking-tight">
            From paper slip to structured medical memory
          </h2>

          {/* Subtitle */}
          <p className="mt-3.5 sm:mt-4 font-inter text-sm sm:text-base lg:text-lg text-[#3D5450] max-w-2xl mx-auto leading-relaxed">
            Zero tedious data entry. Turn physical doctor handwriting and lab printouts into intelligent health insights in seconds.
          </p>
        </motion.div>

        {/* ── Desktop & Tablet: Connected 4-Card Grid ── */}
        <div className="relative mt-12 sm:mt-16 hidden md:block">
          {/* Active step connector gradient line running behind the cards */}
          <div className="absolute left-[10%] right-[10%] top-[42px] h-[2px] bg-gradient-to-r from-[#0D5C4A]/20 via-[#0A8C6A]/40 to-[#0D5C4A]/20 -z-0" />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 relative z-10">
            {STEPS.map((step, idx) => {
              return (
                <motion.div
                  key={step.stepNumber}
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -6, transition: { duration: 0.25 } }}
                  className="group relative flex flex-col justify-between rounded-2xl border border-[#DCE8E5] bg-white p-5 shadow-xs transition-all duration-300 hover:border-[#0D5C4A]/40 hover:shadow-xl"
                >
                  {/* Card Top: Step Badge Pill & Status Tag */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8F7F4] border border-[#B2DFD4] font-mono text-xs font-bold text-[#0D5C4A] shadow-2xs group-hover:scale-105 transition-transform">
                          {step.stepNumber}
                        </div>
                        <span className="flex h-1.5 w-1.5 rounded-full bg-[#0A8C6A]" />
                      </div>
                      <span className="font-mono text-[9px] font-bold tracking-wider text-vault-mutedTeal/80 uppercase bg-vault-stoneWhite px-2 py-0.5 rounded border border-vault-tealBorder/60">
                        {step.tag}
                      </span>
                    </div>

                    {/* Center Visual Micro-Widget */}
                    <div className="my-3">
                      {step.renderWidget()}
                    </div>
                  </div>

                  {/* Card Bottom Content */}
                  <div className="mt-4 pt-3 border-t border-vault-tealBorder/40">
                    <h3 className="font-jakarta text-sm sm:text-base font-bold text-[#1A2826] group-hover:text-vault-teal transition-colors">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 font-inter text-xs text-[#3D5450] leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── Mobile Layout: Vertical Connected Timeline ── */}
        <div className="mt-10 md:hidden">
          <div className="relative border-l-2 border-[#0D5C4A]/30 pl-5 sm:pl-6 ml-2 sm:ml-3 space-y-6">
            {STEPS.map((step, idx) => (
              <motion.div
                key={step.stepNumber}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="relative rounded-2xl border border-[#DCE8E5] bg-white p-4 sm:p-5 shadow-xs"
              >
                {/* Connected Timeline Marker Node */}
                <div className="absolute -left-[31px] sm:-left-[35px] top-4 sm:top-5 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-vault-teal text-white font-mono text-[10px] sm:text-[11px] font-bold shadow-xs">
                  {step.stepNumber}
                </div>

                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-[9px] font-bold tracking-wider text-vault-teal uppercase bg-[#E8F7F4] px-2 py-0.5 rounded">
                    {step.tag}
                  </span>
                </div>

                {/* Micro-widget */}
                <div className="my-2.5">
                  {step.renderWidget()}
                </div>

                <h3 className="font-jakarta text-sm sm:text-base font-bold text-[#1A2826] mt-3">
                  {step.title}
                </h3>
                <p className="mt-1 font-inter text-xs text-[#3D5450] leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
