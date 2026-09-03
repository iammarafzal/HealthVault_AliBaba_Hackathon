"use client";

import { motion } from "framer-motion";
import { FolderX, Clock, AlertCircle, ArrowUpRight } from "lucide-react";

const PAINS = [
  {
    icon: FolderX,
    iconColor: "text-[#C47C1A]",
    iconBg: "bg-[#FEF5E4]",
    borderColor: "hover:border-[#C47C1A]/40 hover:shadow-[#C47C1A]/10",
    title: "Lost records, every visit",
    body: "Patients carry crumpled prescriptions and faded lab reports in plastic shopping bags. Misplaced files mean repeating expensive tests and restarting care from zero.",
  },
  {
    icon: Clock,
    iconColor: "text-[#C47C1A]",
    iconBg: "bg-[#FEF5E4]",
    borderColor: "hover:border-[#C47C1A]/40 hover:shadow-[#C47C1A]/10",
    title: "5–10 minutes sorting paper files",
    body: "Doctors spend precious consultation minutes deciphering handwriting across scattered slips instead of focusing on patient diagnosis and personalized care.",
  },
  {
    icon: AlertCircle,
    iconColor: "text-[#C0392B]",
    iconBg: "bg-red-50",
    borderColor: "hover:border-[#C0392B]/40 hover:shadow-[#C0392B]/10",
    title: "Zero data during golden hour",
    body: "In emergency triage, responders have zero instant access to blood group, chronic conditions, or allergies. Critical life-or-death decisions are made blind.",
  },
];

export default function ProblemSection() {
  return (
    <section id="problem-section" className="relative py-16 sm:py-20 lg:py-24 bg-white overflow-hidden border-t border-vault-tealBorder/40">
      {/* Background subtle geometric ambient accent */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#0D5C4A_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03]" />

      <div className="relative z-10 mx-auto w-full max-w-landing px-4 sm:px-6">
        {/* Centered Heading */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200/60 px-3.5 py-1 text-xs font-semibold text-[#C0392B] uppercase tracking-wider mb-3.5 sm:mb-4">
            The Healthcare Challenge
          </div>
          <h2 className="font-jakarta text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-vault-slate">
            Healthcare records in Pakistan are{" "}
            <span className="text-[#C0392B] underline decoration-[#C0392B]/30 underline-offset-8">
              broken
            </span>
          </h2>
          <p className="mt-4 sm:mt-5 font-inter text-sm sm:text-base lg:text-lg text-vault-mutedTeal max-w-2xl mx-auto leading-relaxed">
            Paper-based systems fail patients, doctors, and emergency responders every single day across clinics and hospitals.
          </p>
        </motion.div>

        {/* 3 Staggered Pain Cards: grid grid-cols-1 md:grid-cols-3 gap-4 */}
        <div className="mt-10 sm:mt-14 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {PAINS.map((pain, idx) => {
            const Icon = pain.icon;
            return (
              <motion.div
                key={pain.title}
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: idx * 0.12, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -6, transition: { duration: 0.25 } }}
                className={`group relative flex flex-col justify-between rounded-2xl border border-vault-tealBorder/80 bg-vault-stoneWhite/60 p-5 sm:p-6 lg:p-7 shadow-xs transition-all duration-300 hover:bg-white hover:shadow-xl ${pain.borderColor}`}
              >
                {/* Accent Top Bar on hover */}
                <div className="absolute top-0 left-6 right-6 sm:left-8 sm:right-8 h-[2px] bg-transparent transition-colors group-hover:bg-gradient-to-r group-hover:from-transparent group-hover:via-vault-active group-hover:to-transparent" />

                <div>
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <div className={`flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl ${pain.iconBg} transition-transform duration-300 group-hover:scale-110`}>
                      <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${pain.iconColor}`} />
                    </div>
                    <span className="font-mono text-xs font-bold text-vault-mutedTeal/40 group-hover:text-vault-teal transition-colors">
                      0{idx + 1}
                    </span>
                  </div>

                  <h3 className="font-jakarta text-base sm:text-lg font-bold text-vault-slate group-hover:text-vault-teal transition-colors">
                    {pain.title}
                  </h3>
                  <p className="mt-2.5 sm:mt-3 font-inter text-xs sm:text-sm leading-relaxed text-vault-mutedTeal">
                    {pain.body}
                  </p>
                </div>

                <div className="mt-5 sm:mt-6 flex items-center gap-1.5 text-xs font-semibold text-vault-mutedTeal/60 group-hover:text-vault-teal transition-colors pt-3.5 sm:pt-4 border-t border-vault-tealBorder/40">
                  <span>HealthVault AI solves this</span>
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
