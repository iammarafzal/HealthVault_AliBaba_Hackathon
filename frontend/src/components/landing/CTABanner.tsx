"use client";

import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function CTABanner() {
  return (
    <section className="relative py-16 sm:py-20 bg-gradient-to-br from-vault-dark via-vault-teal to-[#064234] text-white overflow-hidden">
      {/* Background ambient glow */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-72 sm:h-80 w-72 sm:w-80 rounded-full bg-vault-active/20 blur-[90px] sm:blur-[100px]" />

      <div className="relative z-10 mx-auto max-w-landing px-4 text-center sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold text-emerald-200 uppercase tracking-wider mb-4 sm:mb-5 backdrop-blur-xs">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
            <span>Join 50,000+ Pakistani Families</span>
          </div>

          <h2 className="font-jakarta text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
            Your health record shouldn&apos;t live in a paper bag.
          </h2>

          <p className="mt-3 sm:mt-4 font-urdu text-lg sm:text-2xl text-emerald-100/90 leading-loose" dir="rtl">
            آج ہی اپنا مفت ڈیجیٹل ہیلتھ والٹ بنائیں اور مکمل حفاظت پائیں
          </p>

          <div className="mt-8 sm:mt-9 flex flex-col items-center justify-center gap-3.5 sm:gap-4 sm:flex-row w-full">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
              <Link
                href="/register"
                className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-white px-6 sm:px-7 py-3.5 font-inter text-sm font-bold text-vault-teal shadow-xl transition-colors hover:bg-vault-stoneWhite"
              >
                <span>Create My Free Health Vault</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>

            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
              <a
                href="#how-it-works"
                className="flex w-full sm:w-auto items-center justify-center rounded-xl border border-white/30 bg-white/5 px-6 py-3.5 font-inter text-sm font-semibold text-white backdrop-blur-xs transition-colors hover:bg-white/15"
              >
                See Interactive Demo
              </a>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
