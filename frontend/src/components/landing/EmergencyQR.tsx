"use client";

import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight, ShieldAlert, Sparkles } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const BULLETS = [
  {
    title: "Blood group & critical allergies",
    desc: "Instantly flags lethal drug allergies (e.g., Penicillin, NSAIDs) and exact blood match.",
  },
  {
    title: "Major chronic conditions & active meds",
    desc: "Provides paramedics with diabetes, hypertension, and anticoagulant statuses.",
  },
  {
    title: "Emergency SOS contact dial",
    desc: "One-tap direct phone dial to next-of-kin with zero passcode or app download needed.",
  },
];

export default function EmergencyQR() {
  return (
    <section id="emergency-qr" className="relative py-16 sm:py-20 lg:py-24 bg-[#1A2826] text-white overflow-hidden">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -top-40 right-0 h-[400px] sm:h-[500px] w-[400px] sm:w-[500px] rounded-full bg-gradient-to-bl from-vault-active/20 via-vault-teal/10 to-transparent blur-[100px] sm:blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 left-0 h-[350px] sm:h-[450px] w-[350px] sm:w-[450px] rounded-full bg-gradient-to-tr from-vault-teal/15 via-[#C0392B]/10 to-transparent blur-[100px] sm:blur-[120px]" />

      <div className="relative z-10 mx-auto flex w-full max-w-landing flex-col items-center justify-between gap-10 sm:gap-14 px-4 sm:px-6 lg:flex-row lg:gap-16">
        {/* ── Left Column: Value Prop ── */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 text-center lg:text-left w-full"
        >
          {/* Eyebrow badge */}
          <div className="mb-4 sm:mb-5 inline-flex items-center gap-2 rounded-full border border-vault-active/30 bg-vault-active/10 px-3.5 py-1 text-xs font-semibold text-vault-active uppercase tracking-wider backdrop-blur-md">
            <ShieldAlert className="h-3.5 w-3.5 text-vault-active" />
            <span>Instant Emergency Triage</span>
          </div>

          {/* Heading */}
          <h2 className="font-jakarta text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
            Life-saving data.{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200 bg-clip-text text-transparent">
              No login. One scan.
            </span>
          </h2>

          {/* Subtitle */}
          <p className="mt-3.5 sm:mt-5 max-w-xl font-inter text-sm sm:text-base lg:text-lg text-emerald-100/70 leading-relaxed mx-auto lg:mx-0">
            In an emergency, every second counts. Instant read-only access to critical vitals for paramedics and ER triage — accessible on any smartphone without installing an app or entering passwords.
          </p>

          {/* Checklist */}
          <div className="mt-6 sm:mt-8 space-y-3 sm:space-y-4 text-left max-w-lg mx-auto lg:mx-0">
            {BULLETS.map((bullet, idx) => (
              <motion.div
                key={bullet.title}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.15 + idx * 0.1 }}
                className="flex items-start gap-3 sm:gap-3.5 rounded-xl border border-white/5 bg-white/[0.03] p-3 sm:p-3.5 backdrop-blur-xs transition-colors hover:border-vault-active/30 hover:bg-white/[0.06]"
              >
                <div className="flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-full bg-vault-active/20 text-vault-active mt-0.5">
                  <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-vault-active" />
                </div>
                <div>
                  <h4 className="font-jakarta text-xs sm:text-sm font-semibold text-white">{bullet.title}</h4>
                  <p className="mt-0.5 font-inter text-[11px] sm:text-xs text-emerald-100/60 leading-relaxed">{bullet.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-8 sm:mt-9 flex flex-col items-center sm:flex-row gap-3.5 sm:gap-4 lg:justify-start w-full">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
              <Link
                href="/register"
                className="flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-xl bg-vault-active px-6 sm:px-7 py-3.5 font-inter text-sm font-semibold text-white shadow-lg shadow-vault-active/25 transition-all duration-200 hover:bg-[#0da882] hover:shadow-xl hover:shadow-vault-active/35"
              >
                <span>Generate My Emergency Card</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
            <div className="flex items-center gap-2 text-xs text-emerald-100/60">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Compliant with PK Health Standards</span>
            </div>
          </div>
        </motion.div>

        {/* ── Right Column: Emergency ID Card Showcase ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-1 flex-col items-center justify-center w-full max-w-[560px] lg:max-w-[580px]"
        >
          <div className="relative w-full group flex flex-col items-center">
            {/* Dynamic ambient back-glow behind the card image */}
            <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-gradient-to-tr from-vault-active/25 via-emerald-500/20 to-teal-300/10 blur-3xl opacity-75 group-hover:opacity-100 transition-opacity duration-500" />

            {/* 3D Floating Showcase with Drop Shadow */}
            <motion.div
              whileHover={{ y: -6, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="relative z-10 w-full flex items-center justify-center filter drop-shadow-[0_20px_35px_rgba(0,0,0,0.65)]"
            >
              <Image
                src="/emergency-card-showcase.webp"
                alt="HealthVault Emergency Medical Card Showcase"
                width={720}
                height={480}
                priority
                quality={90}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="w-full h-auto max-h-[460px] object-contain select-none pointer-events-none"
              />
            </motion.div>
          </div>

          {/* Wallet / Phone Sticker Caption */}
          <div className="mt-4 flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-emerald-100/70 font-medium text-center">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span>Digital Wallet · Waterproof Print Card · Phone Sticker</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
