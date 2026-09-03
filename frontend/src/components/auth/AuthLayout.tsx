"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Heart,
  HeartPulse,
  QrCode,
  ShieldCheck,
  FileText,
} from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
  mode: "login" | "register";
}

export default function AuthLayout({ children, mode }: AuthLayoutProps) {
  return (
    <div className="w-full min-h-screen lg:h-screen lg:max-h-screen lg:overflow-hidden bg-[#F5F8F7] text-foreground dark:bg-background">
      {/* Full-Height Desktop Split Layout / Clean Mobile Container */}
      <div className="grid min-h-screen lg:h-full grid-cols-1 lg:grid-cols-12">
        {/* ── LEFT HERO PANEL (Desktop 100vh Only, Hidden on Mobile) ── */}
        <div className="hidden lg:flex lg:col-span-5 lg:h-full relative flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0D5C4A] via-[#094A3B] to-[#043329] p-10 xl:p-12 text-white">
          {/* Ambient Glow and Medical Pulse Backdrop */}
          <div className="pointer-events-none absolute -bottom-16 -right-16 opacity-10 text-white">
            <HeartPulse className="h-80 w-80" />
          </div>
          <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl" />

          {/* Top Branding */}
          <div className="relative z-10 space-y-6">
            <Link href="/" className="inline-flex items-center gap-3.5 group">
              <Image
                src="/favicon.png"
                alt="HealthVault AI logo"
                width={56}
                height={56}
                className="h-12 w-12 object-contain transition-transform duration-200 group-hover:scale-105"
                priority
              />
              <div>
                <span className="text-2xl font-black tracking-tight text-white leading-none block">
                  HealthVault<span className="text-emerald-300">.AI</span>
                </span>
                <p className="text-xs font-medium text-emerald-200/80 mt-1 leading-tight">
                  Your Family Health Assistant
                </p>
              </div>
            </Link>

            {/* Hero Main Copy (Plain & Relatable) */}
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight text-white xl:text-3xl">
                {mode === "login"
                  ? "Welcome Back"
                  : "Keep Your Medical Records Safe & Organized"}
              </h2>
              <p className="text-xs leading-relaxed text-emerald-100/90 xl:text-sm">
                A simple, secure place to save your prescriptions, lab tests, and doctor notes for yourself and your family.
              </p>
            </div>

            {/* 3 Plain-Language Trust Badges */}
            <div className="space-y-3 pt-1">
              <div className="flex items-start gap-3.5 rounded-2xl bg-white/5 p-3.5 ring-1 ring-white/10 backdrop-blur-xs">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-400/20 text-emerald-300">
                  <ShieldCheck className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Private &amp; Safe</p>
                  <p className="text-[11px] text-emerald-100/80 leading-relaxed">
                    Your health records are strictly confidential and always protected.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 rounded-2xl bg-white/5 p-3.5 ring-1 ring-white/10 backdrop-blur-xs">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-400/20 text-emerald-300">
                  <FileText className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Easy Doctor Visits</p>
                  <p className="text-[11px] text-emerald-100/80 leading-relaxed">
                    Get a clean 1-page summary to take with you to your next doctor appointment.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 rounded-2xl bg-white/5 p-3.5 ring-1 ring-white/10 backdrop-blur-xs">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-400/20 text-emerald-300">
                  <QrCode className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Emergency Wallet Card</p>
                  <p className="text-[11px] text-emerald-100/80 leading-relaxed">
                    First responders can scan your QR card in emergencies to see your allergies and blood type.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Reassurance */}
          <div className="relative z-10 flex items-center border-t border-white/10 pt-4 text-xs text-emerald-200/80">
            <Heart className="mr-1.5 h-3.5 w-3.5 text-emerald-300" />
            <span>Designed for patients and family caregivers</span>
          </div>
        </div>

        {/* ── RIGHT MAIN PANEL: Form (100vh on Desktop, Mobile Centered) ── */}
        <div className="flex flex-col justify-center items-center w-full min-h-screen lg:min-h-0 lg:h-full lg:col-span-7 p-6 sm:p-10 lg:p-12 xl:p-16 lg:overflow-y-auto">
          {/* Mobile-Only Header Brand Logo */}
          <div className="mb-6 flex flex-col items-center text-center lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <Image
                src="/favicon.png"
                alt="HealthVault AI logo"
                width={48}
                height={48}
                className="h-10 w-10 object-contain"
                priority
              />
              <span className="text-2xl font-black tracking-tight text-vault-teal dark:text-teal-400">
                HealthVault<span className="text-emerald-600 dark:text-emerald-300">.AI</span>
              </span>
            </Link>
          </div>

          {/* Centered Form Card Wrapper */}
          <div className="w-full max-w-md">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
