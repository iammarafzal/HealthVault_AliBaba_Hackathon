"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Stethoscope, Users, Star, Quote } from "lucide-react";

interface TestimonialProps {
  quote: string;
  name: string;
  role: string;
  city: string;
  initials: string;
  tag: string;
}

const STATS = [
  { value: "50,000+", label: "Prescriptions Digitized", icon: Stethoscope },
  { value: "100%", label: "Urdu & English Accuracy", icon: ShieldCheck },
  { value: "Zero", label: "Logins Needed for ER Triage", icon: Users },
];

const TESTIMONIALS: TestimonialProps[] = [
  {
    quote:
      "Patients used to carry plastic bags full of crumpled prescriptions. Now I can review their complete timeline and active dosages in seconds.",
    name: "Dr. Ayesha Khan",
    role: "Consultant Physician",
    city: "Lahore",
    initials: "AK",
    tag: "Physician Review",
  },
  {
    quote:
      "My elderly father cannot read English prescriptions. The simple Urdu instructions and daily schedules ensure he never misses a dose.",
    name: "Bilal Ahmed",
    role: "Caregiver & Family Lead",
    city: "Karachi",
    initials: "BA",
    tag: "Family Caregiver",
  },
  {
    quote:
      "Scanning the emergency QR card gave us immediate blood group and severe penicillin allergy data during triage without needing any login.",
    name: "Dr. Tariq Mehmood",
    role: "ER Medical Officer",
    city: "Rawalpindi",
    initials: "TM",
    tag: "Emergency Triage",
  },
  {
    quote:
      "Tracking my HbA1c and cholesterol trends across different labs in one place made my follow-up visits effortless.",
    name: "Zainab Fatima",
    role: "Chronic Care Patient",
    city: "Islamabad",
    initials: "ZF",
    tag: "Chronic Care",
  },
  {
    quote:
      "Resolves handwriting misinterpretations and prevents adverse drug interactions right at the counter.",
    name: "Usman Farooq",
    role: "Pharmacist",
    city: "Faisalabad",
    initials: "UF",
    tag: "Clinical Pharmacy",
  },
];

export default function TrustSection() {
  return (
    <section id="about" className="relative py-16 sm:py-20 lg:py-24 bg-white overflow-hidden border-t border-vault-tealBorder/40">
      <div className="relative z-10 mx-auto max-w-landing px-4 sm:px-6">
        {/* ── Metric Stats: Clean grid grid-cols-1 sm:grid-cols-3 gap-6 text-center ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 rounded-2xl border border-vault-tealBorder bg-vault-stoneWhite/60 p-6 sm:p-8 shadow-xs">
          {STATS.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="flex flex-col items-center text-center px-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-vault-light text-vault-teal mb-3 shadow-2xs">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="font-jakarta text-3xl sm:text-4xl font-extrabold text-vault-teal tracking-tight">
                  {stat.value}
                </span>
                <span className="mt-1.5 font-inter text-xs sm:text-sm font-medium text-vault-mutedTeal">
                  {stat.label}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* ── Section Title ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-14 sm:mt-16 text-center max-w-2xl mx-auto"
        >
          <div className="inline-flex items-center gap-1.5 rounded-full border border-vault-teal/20 bg-vault-light/60 px-3.5 py-1 text-xs font-semibold text-vault-teal uppercase tracking-wider mb-3.5 shadow-2xs">
            <Users className="h-3.5 w-3.5 text-vault-active" />
            <span>Trusted Across Pakistan</span>
          </div>
          <h2 className="font-jakarta text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-vault-slate">
            Recommended by doctors. Loved by families.
          </h2>
        </motion.div>
      </div>

      {/* ── Infinite Scrolling Marquee Reviews Slider (Right-to-Left) ── */}
      <div className="relative mt-10 sm:mt-12 w-full overflow-hidden py-4 group">
        {/* Left & Right edge blur masks */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 sm:w-28 bg-gradient-to-r from-white via-white/80 to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 sm:w-28 bg-gradient-to-l from-white via-white/80 to-transparent z-10" />

        {/* Marquee Track (Repeated twice for continuous infinite loop) */}
        <div className="marquee-track animate-marquee flex gap-5 sm:gap-6 w-max">
          {[...TESTIMONIALS, ...TESTIMONIALS].map((review, idx) => (
            <div
              key={`${review.name}-${idx}`}
              className="relative flex flex-col justify-between rounded-2xl border border-[#DCE8E5] bg-white p-5 w-[310px] sm:w-[350px] md:w-[380px] shrink-0 shadow-sm transition-all duration-300 hover:border-vault-active/50 hover:shadow-md"
            >
              <div>
                {/* Card Top: Stars pill and tag */}
                <div className="flex items-center justify-between mb-3.5">
                  <div className="inline-flex items-center gap-1 rounded-full bg-amber-50/90 border border-amber-200/80 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, s) => (
                        <Star
                          key={s}
                          className="w-3 h-3 fill-amber-400 text-amber-400"
                        />
                      ))}
                    </div>
                    <span className="ml-1 text-[11px]">5.0</span>
                  </div>
                  <span className="font-mono text-[9px] font-bold text-vault-teal uppercase bg-vault-light px-2 py-0.5 rounded border border-vault-tealBorder/60">
                    {review.tag}
                  </span>
                </div>

                {/* Quote Text */}
                <div className="relative">
                  <Quote className="absolute -top-1 -left-1 w-4 h-4 text-vault-teal/15 -z-0" />
                  <p className="font-inter text-xs sm:text-sm text-vault-slate leading-relaxed relative z-10 pl-2">
                    &ldquo;{review.quote}&rdquo;
                  </p>
                </div>
              </div>

              {/* Reviewer Profile */}
              <div className="mt-5 flex items-center gap-3 pt-3.5 border-t border-vault-tealBorder/40">
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-vault-teal to-vault-active font-jakarta text-xs font-bold text-white shadow-xs">
                  {review.initials}
                </div>
                <div className="min-w-0">
                  <p className="font-jakarta text-xs sm:text-sm font-bold text-vault-slate truncate">
                    {review.name}
                  </p>
                  <p className="font-inter text-[11px] text-vault-mutedTeal truncate">
                    {review.role} • <span className="font-medium text-vault-teal">{review.city}</span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
