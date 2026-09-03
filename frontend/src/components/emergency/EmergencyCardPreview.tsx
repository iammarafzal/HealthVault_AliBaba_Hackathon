"use client";

import React from "react";
import QRCodeCanvas from "@/components/emergency/QRCodeCanvas";
import { useLanguage } from "@/context/LanguageContext";

export interface EmergencyCardPreviewProps {
  patientName?: string;
  bloodGroup?: string | null;
  healthId?: string;
  token?: string;
  allergies?: string[];
  primaryContact?: {
    name?: string;
    relation?: string;
    phone?: string;
  } | null;
  emergencyNotes?: string | null;
  showEmergencyNotes?: boolean;
  isActive?: boolean;
  className?: string;
}

function HexagonPulseIcon({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <path
        d="M12 2 L20.66 7 L20.66 17 L12 22 L3.34 17 L3.34 7 Z"
        stroke="white"
        strokeWidth="1.6"
        fill="none"
      />
      <polyline
        points="5,12 8.5,12 9.5,9 11,15 12.5,8 13.5,14 14.5,12 19,12"
        stroke="white"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function GhostHexagonWatermark() {
  return (
    <svg
      width={130}
      height={130}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute -bottom-4 -right-4 pointer-events-none opacity-[0.04]"
    >
      <path
        d="M12 2 L20.66 7 L20.66 17 L12 22 L3.34 17 L3.34 7 Z"
        stroke="white"
        strokeWidth="1"
        fill="none"
      />
      <polyline
        points="5,12 8.5,12 9.5,9 11,15 12.5,8 13.5,14 14.5,12 19,12"
        stroke="white"
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export default function EmergencyCardPreview({
  patientName = "Ahmad Raza",
  bloodGroup = "B+",
  healthId = "HV-PAK-98214",
  token,
  allergies = [],
  primaryContact,
  emergencyNotes,
  showEmergencyNotes = true,
  isActive = true,
  className = "",
}: EmergencyCardPreviewProps) {
  const { locale, t } = useLanguage();
  const isUrdu = locale === "ur";

  const contactDisplay = primaryContact
    ? `${primaryContact.relation ? `${primaryContact.relation} · ` : ""}${primaryContact.phone || "—"}`
    : (isUrdu ? "درج نہیں ہے" : "Not Configured");

  const allergyDisplay =
    allergies && allergies.length > 0
      ? allergies.join(", ")
      : (isUrdu ? "کوئی الرجی نہیں" : "None documented");

  const hasDirective = showEmergencyNotes && Boolean(emergencyNotes?.trim());

  return (
    <div
      className={`w-full max-w-[390px] aspect-[85.6/54] rounded-2xl overflow-hidden relative shadow-lg border border-white/10 select-none flex flex-col justify-between bg-[#1A2826] text-white ${className}`}
      dir={isUrdu ? "rtl" : "ltr"}
    >
      {/* ═══ Top Header Strip ═══ */}
      <div className="bg-[#0D5C4A] px-3.5 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <HexagonPulseIcon size={14} />
          <span className="text-[10px] font-semibold text-white tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
            HEALTHVAULT AI · {isUrdu ? "ایمرجنسی شناختی کارڈ" : "EMERGENCY MEDICAL ID"}
          </span>
        </div>

        <span
          className={`text-[8.5px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 border ${
            isActive
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
              : "bg-amber-500/20 text-amber-300 border-amber-400/30"
          }`}
        >
          {isActive ? (isUrdu ? "فعال" : "ACTIVE") : (isUrdu ? "غیر فعال" : "DISABLED")}
        </span>
      </div>

      {/* ═══ Main Card Body ═══ */}
      <div className="p-3 sm:p-3.5 flex gap-3 sm:gap-3.5 items-center flex-1 relative overflow-hidden">
        <GhostHexagonWatermark />

        {/* Left Column: QR Code (~36-38% width) */}
        <div className="w-[36%] max-w-[110px] flex flex-col items-center justify-center shrink-0 z-10">
          <div className="bg-white p-1 rounded-lg shadow-sm flex items-center justify-center">
            <QRCodeCanvas healthId={healthId} token={token} size={76} />
          </div>
          <span className="text-[8px] font-medium text-[#B2DFD4] text-center mt-1 whitespace-nowrap tracking-tight">
            {isUrdu ? "اسکین · بغیر لاگ ان" : "Scan · Zero Login"}
          </span>
        </div>

        {/* Right Column: Structured Vitals (~62-64% width) */}
        <div className="flex-1 min-w-0 flex flex-col justify-center z-10">
          {/* Row 1: Full Name */}
          <div className="border-b border-white/5 pb-1 mb-1">
            <span className="block text-[7.5px] uppercase font-bold tracking-wider text-slate-400">
              {isUrdu ? "مریض کا نام" : "PATIENT FULL NAME"}
            </span>
            <p className="text-[12.5px] sm:text-[13.5px] font-bold text-white truncate leading-tight tracking-tight">
              {patientName.toUpperCase()}
            </p>
          </div>

          {/* Row 2: Blood Group & Health ID */}
          <div className="border-b border-white/5 pb-1 mb-1 grid grid-cols-2 gap-1.5">
            <div>
              <span className="block text-[7.5px] uppercase font-bold tracking-wider text-slate-400">
                {isUrdu ? "بلڈ گروپ" : "BLOOD GROUP"}
              </span>
              <span className="text-[11.5px] font-bold text-[#C47C1A] leading-tight block truncate">
                {bloodGroup || "—"}
              </span>
            </div>
            <div>
              <span className="block text-[7.5px] uppercase font-bold tracking-wider text-slate-400">
                {isUrdu ? "ہیلتھ آئی ڈی" : "HEALTH ID"}
              </span>
              <span className="font-mono text-[9.5px] text-white/90 font-medium leading-tight block truncate">
                {healthId}
              </span>
            </div>
          </div>

          {/* Row 3: Critical Allergies */}
          <div className="border-b border-white/5 pb-1 mb-1">
            <span className="block text-[7.5px] uppercase font-bold tracking-wider text-slate-400">
              {isUrdu ? "شدید الرجی" : "CRITICAL ALLERGIES"}
            </span>
            <p
              className={`text-[9.5px] truncate leading-tight font-medium ${
                allergies && allergies.length > 0
                  ? "text-[#E74C3C] font-semibold"
                  : "text-slate-400"
              }`}
            >
              {allergyDisplay}
            </p>
          </div>

          {/* Row 4: Primary ICE Contact & Directive Pill */}
          <div className="flex items-center justify-between gap-1.5">
            <div className="min-w-0 flex-1">
              <span className="block text-[7.5px] uppercase font-bold tracking-wider text-slate-400">
                {isUrdu ? "ایمرجنسی رابطہ" : "PRIMARY ICE CONTACT"}
              </span>
              <p className="text-[9.5px] text-white/95 font-medium truncate leading-tight">
                {contactDisplay}
              </p>
            </div>
            {hasDirective && (
              <span
                title={emergencyNotes || ""}
                className="inline-flex items-center gap-1 bg-[#C47C1A]/20 border border-[#C47C1A]/40 text-[#F5B041] text-[7.5px] font-bold px-1.5 py-0.5 rounded shrink-0 uppercase tracking-tight"
              >
                {isUrdu ? "طبی ہدایت درج ہے" : "Directive Set"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Bottom Footer Strip ═══ */}
      <div className="bg-[#0D5C4A] py-1 px-3 text-center shrink-0">
        <span className="text-[7.5px] sm:text-[8px] font-medium text-white/80 leading-none block truncate">
          {isUrdu
            ? "مکمل طبی پروفائل دیکھنے کے لیے کسی بھی اسمارٹ فون سے QR کوڈ اسکین کریں"
            : "Scan with any smartphone camera for complete emergency profile"}
        </span>
      </div>
    </div>
  );
}
