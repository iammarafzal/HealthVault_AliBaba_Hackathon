"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Languages,
  FileText,
  Sparkles,
  ArrowRight,
  ArrowDown,
  Volume2,
  VolumeX,
  CheckCircle2,
} from "lucide-react";

export default function UrduSection() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [urduVoice, setUrduVoice] = useState<SpeechSynthesisVoice | null>(null);

  // Pre-load available voices
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available.length > 0) {
        setVoicesLoaded(true);
        // Find Urdu voice (prefer Pakistani Urdu)
        const urdu = available.find(
          (v) => v.lang === "ur-PK" || v.lang === "ur" || v.lang.includes("Urdu")
        );
        setUrduVoice(urdu || null);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const toggleAudio = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    const text =
      "میٹفارمین پانچ سو ملی گرام۔ صبح اور شام کھانے سے پہلے ایک گولی لیں۔ روزانہ دو بار، پورے گلاس پانی کے ساتھ استعمال کریں۔ مکمل کورس: تیس دن، ساٹھ گولیاں۔";

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ur-PK";
    utterance.rate = 0.9;
    utterance.pitch = 1;

    // Use detected Urdu voice if available
    if (urduVoice) {
      utterance.voice = urduVoice;
    }

    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  }, [isPlaying, urduVoice]);

  return (
    <section
      id="urdu-section"
      className="relative py-16 sm:py-20 lg:py-24 bg-vault-stoneWhite overflow-hidden border-t border-vault-tealBorder/40"
    >
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[400px] sm:h-[500px] w-[600px] sm:w-[900px] rounded-full bg-vault-teal/5 blur-[100px] sm:blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-60 w-60 sm:h-80 sm:w-80 rounded-full bg-vault-active/5 blur-[80px] sm:blur-[100px]" />

      <div className="relative z-10 mx-auto w-full max-w-landing px-4 sm:px-6 flex flex-col items-center justify-center">
        {/* ── Section Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-3xl text-center"
        >
          {/* Top Badge Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#B2DFD4] bg-[#E8F7F4] px-4 py-1.5 text-xs font-semibold text-[#0D5C4A] uppercase tracking-wider mb-3.5 sm:mb-4 shadow-2xs">
            <Languages className="w-3.5 h-3.5 text-[#0A8C6A]" />
            <span>Bilingual & Accessible Healthcare</span>
          </div>

          {/* Headline */}
          <h2 className="font-jakarta text-2xl sm:text-4xl lg:text-5xl font-bold text-[#1A2826] tracking-tight">
            Made for Pakistan.{" "}
            <span className="text-[#0D5C4A]">In Pakistan&apos;s language.</span>
          </h2>

          {/* Subtitle */}
          <p className="mt-3.5 sm:mt-4 font-inter text-sm sm:text-base lg:text-lg text-[#3D5450] max-w-2xl mx-auto leading-relaxed">
            Every prescription, medical abbreviation, and dosage routine is automatically converted into clear conversational Urdu with natural voice playback for elderly family members.
          </p>
        </motion.div>

        {/* ── Side-by-Side / Stacked Interactive Translation Canvas ── */}
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 sm:mt-14 w-full"
        >
          <div className="flex flex-col lg:flex-row gap-6 items-center">
            {/* ─ Left Card: Doctor's Shorthand Prescription ── */}
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.25 }}
              className="w-full lg:flex-1 rounded-2xl border border-vault-tealBorder bg-white p-5 sm:p-6 shadow-xs transition-all duration-300 hover:border-vault-teal/40 hover:shadow-xl"
            >
              {/* Card Top */}
              <div className="flex items-center justify-between border-b border-vault-tealBorder/60 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#0D5C4A]" />
                  <span className="font-jakarta text-xs font-bold uppercase tracking-wider text-[#1A2826]">
                    Clinical Notation (Rx)
                  </span>
                </div>
                <span className="rounded bg-vault-stoneWhite border border-vault-tealBorder px-2.5 py-0.5 font-mono text-[10px] font-semibold text-vault-mutedTeal">
                  Raw Doctor Script
                </span>
              </div>

              {/* Inner Paper Surface */}
              <div className="rounded-xl border-t-2 border-t-sky-500 border-x border-b border-vault-tealBorder/70 bg-[#F9FBFB] p-4 sm:p-5 shadow-inner">
                {/* Medication Header */}
                <div className="flex items-baseline gap-2 mb-3 pb-2.5 border-b border-vault-tealBorder/40">
                  <span className="font-mono text-lg sm:text-xl font-black text-[#0D5C4A]">Rx</span>
                  <span className="font-mono text-sm sm:text-base font-bold text-[#1A2826]">
                    Tab. Metformin <span dir="ltr">500mg</span>
                  </span>
                </div>

                {/* Medical Codes */}
                <div className="space-y-2.5 text-xs font-mono">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 bg-white p-2.5 rounded-lg border border-vault-tealBorder/50">
                    <div>
                      <span className="font-bold text-[#1A2826]">
                        Sig: <span dir="ltr">1-0-1</span> AC
                      </span>
                      <p className="text-[11px] text-vault-mutedTeal mt-0.5 font-sans">
                        Twice daily • Before Meals (Ante Cibum)
                      </p>
                    </div>
                    <span className="self-start text-[10px] font-sans font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded">
                      Standard Dosage
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-vault-mutedTeal px-1">
                    <span>
                      Qty: <span dir="ltr">#60 Tablets</span>
                    </span>
                    <span>
                      <span dir="ltr">30</span>-day course
                    </span>
                  </div>

                  <div className="text-vault-mutedTeal px-1 text-[11px] font-sans">
                    Route: Oral • With full glass of water
                  </div>
                </div>

                {/* Card Footer */}
                <div className="mt-4 pt-3 border-t border-vault-tealBorder/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-[#0A8C6A] font-medium font-sans">
                    <CheckCircle2 className="w-4 h-4 text-[#0A8C6A]" />
                    <span>Verified Clinical Format</span>
                  </div>
                  <span className="font-mono text-[10px] text-vault-mutedTeal">
                    ICD-10 / E11
                  </span>
                </div>
              </div>
            </motion.div>

            {/* ── Center Transition: Animated AI Processing Bridge ── */}
            <div className="flex flex-col items-center justify-center shrink-0 my-1 lg:my-0">
              <motion.div
                animate={{
                  scale: [1, 1.08, 1],
                  boxShadow: [
                    "0 0 0 0 rgba(13, 92, 74, 0.25)",
                    "0 0 0 10px rgba(13, 92, 74, 0)",
                    "0 0 0 0 rgba(13, 92, 74, 0)",
                  ],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-[#0D5C4A] text-white shadow-lg shadow-vault-teal/25"
                title="Instant Neural Translation"
              >
                <div className="hidden lg:block">
                  <ArrowRight className="w-5 h-5 text-white" />
                </div>
                <div className="block lg:hidden">
                  <ArrowDown className="w-5 h-5 text-white" />
                </div>
              </motion.div>
              <div className="mt-2 text-center">
                <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-vault-teal bg-vault-light px-2 py-0.5 rounded border border-vault-tealBorder">
                  AI Translation
                </span>
              </div>
            </div>

            {/* ── Right Card: Clear Urdu & Voice Assistant ── */}
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.25 }}
              className="w-full lg:flex-1 rounded-2xl border border-vault-active/30 bg-white p-5 sm:p-6 shadow-xs transition-all duration-300 hover:border-vault-active hover:shadow-xl"
            >
              {/* Card Top */}
              <div className="flex items-center justify-between border-b border-vault-tealBorder/60 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#0A8C6A]" />
                  <span className="font-jakarta text-xs font-bold uppercase tracking-wider text-[#1A2826]">
                    Urdu Translation
                  </span>
                </div>
                <span className="rounded-full bg-[#E8F7F4] border border-[#B2DFD4] px-3 py-0.5 font-inter text-[10px] font-bold text-[#0D5C4A]">
                  Patient Friendly
                </span>
              </div>

              {/* Inner Urdu Surface */}
              <div className="rounded-xl border border-vault-teal/20 bg-[#E8F7F4]/60 p-4 sm:p-6 shadow-inner min-h-[260px] flex flex-col justify-between">
                {/* Primary Urdu Instruction */}
                <div className="overflow-visible pb-2 text-right" dir="rtl">
                  <p
                    className="font-arabic text-lg sm:text-xl md:text-2xl font-bold text-[#0D5C4A] leading-[2.1] tracking-wide my-2 sm:my-3"
                    style={{ unicodeBidi: "plaintext" }}
                  >
                    میٹفارمین <span dir="ltr">500</span> ملی گرام — صبح اور شام کھانے سے پہلے ایک گولی لیں
                  </p>
                  <p
                    className="font-arabic text-xs sm:text-sm md:text-base text-[#3D5450] leading-relaxed mt-2"
                    style={{ unicodeBidi: "plaintext" }}
                  >
                    روزانہ دو بار، پورے گلاس پانی کے ساتھ استعمال کریں۔ مکمل کورس:{" "}
                    <span dir="ltr">30</span> دن (<span dir="ltr">60</span> گولیاں)
                  </p>
                </div>

                {/* Interactive Audio Player Bar */}
                <div className="mt-4 sm:mt-5 pt-3 border-t border-vault-tealBorder/60 flex flex-wrap items-center justify-between gap-3" dir="ltr">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={toggleAudio}
                    disabled={!voicesLoaded && isPlaying}
                    className={`inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-md transition-all duration-200 active:scale-95 ${
                      isPlaying
                        ? "bg-[#C0392B] text-white hover:bg-red-700"
                        : "bg-[#0D5C4A] hover:bg-[#0A8C6A] text-white shadow-vault-teal/20"
                    }`}
                  >
                    {isPlaying ? (
                      <>
                        <VolumeX className="w-4 h-4" />
                        <span>آواز بند کریں (Stop)</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4" />
                        <span className="font-arabic text-sm">سنیں</span>
                        <span className="text-xs opacity-90">(Listen in Urdu)</span>
                      </>
                    )}
                  </motion.button>

                  {/* Animated Waveform Equalizer */}
                  <div className="flex items-center gap-1.5 h-6 px-2.5 sm:px-3 py-1 bg-white rounded-lg border border-vault-tealBorder/60">
                    <span className="text-[10px] font-mono text-vault-mutedTeal mr-1">Voice AI</span>
                    <span
                      className={`w-1 rounded-full bg-[#0A8C6A] transition-all ${
                        isPlaying ? "h-5 animate-pulse" : "h-2"
                      }`}
                      style={isPlaying ? { animationDelay: "0ms" } : {}}
                    />
                    <span
                      className={`w-1 rounded-full bg-[#0A8C6A] transition-all ${
                        isPlaying ? "h-6 animate-pulse" : "h-3"
                      }`}
                      style={isPlaying ? { animationDelay: "150ms" } : {}}
                    />
                    <span
                      className={`w-1 rounded-full bg-[#0A8C6A] transition-all ${
                        isPlaying ? "h-4 animate-pulse" : "h-2"
                      }`}
                      style={isPlaying ? { animationDelay: "300ms" } : {}}
                    />
                    <span
                      className={`w-1 rounded-full bg-[#0A8C6A] transition-all ${
                        isPlaying ? "h-5 animate-pulse" : "h-3"
                      }`}
                      style={isPlaying ? { animationDelay: "450ms" } : {}}
                    />
                    <span
                      className={`w-1 rounded-full bg-[#0A8C6A] transition-all ${
                        isPlaying ? "h-3 animate-pulse" : "h-1.5"
                      }`}
                      style={isPlaying ? { animationDelay: "600ms" } : {}}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
