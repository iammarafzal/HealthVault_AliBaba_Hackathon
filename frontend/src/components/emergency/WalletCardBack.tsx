"use client";

import React from "react";
import { Stethoscope, AlertTriangle, Phone, AlertCircle } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export interface WalletCardBackProps {
  allergies?: string[];
  chronicConditions?: string[];
  secondaryContact?: {
    name?: string;
    relation?: string;
    phone?: string;
  } | null;
  emergencyNotes?: string | null;
  healthId?: string;
  compact?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const RELATION_URDU_MAP: Record<string, string> = {
  son: "بیٹا",
  daughter: "بیٹی",
  spouse: "اہلیہ / شوہر",
  wife: "اہلیہ",
  husband: "شوہر",
  father: "والد",
  mother: "والدہ",
  brother: "بھائی",
  sister: "بہن",
  friend: "دوست",
  guardian: "سرپرست",
  parent: "والدین",
};

export default function WalletCardBack({
  allergies = [],
  chronicConditions = [],
  secondaryContact = null,
  emergencyNotes = null,
  healthId = "HV-PAK-98214",
  compact = false,
  className = "",
  style = {},
}: WalletCardBackProps) {
  const { isUrdu } = useLanguage();

  const rawRelation = secondaryContact?.relation?.trim() || "";
  const formattedRelation = isUrdu
    ? RELATION_URDU_MAP[rawRelation.toLowerCase()] || rawRelation
    : rawRelation;

  const hasSecondaryContact = Boolean(
    secondaryContact && (secondaryContact.name || secondaryContact.phone)
  );

  const defaultAllergy = isUrdu
    ? "کوئی معلوم الرجی نہیں (NKDA)"
    : "No Known Drug Allergies (NKDA)";
  const displayAllergies =
    allergies && allergies.length > 0 ? allergies : [defaultAllergy];

  const defaultConditions = isUrdu
    ? "کوئی دائمی بیماری درج نہیں"
    : "None Reported / Well Controlled";
  const displayConditions =
    chronicConditions && chronicConditions.length > 0
      ? chronicConditions
      : [defaultConditions];

  const hasNotes = Boolean(emergencyNotes && emergencyNotes.trim().length > 0);

  return (
    <div
      className={`wallet-card-back bg-white text-slate-900 rounded-2xl shadow-xl border border-[#DCE8E5] relative overflow-hidden flex flex-col justify-between select-none transition-all ${compact ? "p-3 sm:p-3.5" : "p-4"
        } ${className}`}
      style={{
        width: "100%",
        maxWidth: compact ? 420 : 480,
        aspectRatio: "1.586 / 1",
        ...style,
      }}
      dir={isUrdu ? "rtl" : "ltr"}
    >
      {/* ═══ ZONE 1: Top Solid Teal Header Band ═══ */}
      <div
        className={`bg-[#0D5C4A] text-white flex items-center justify-between shrink-0 ${compact ? "-mx-3.5 -mt-3.5 px-3.5 py-1.5" : "-mx-4 -mt-4 px-4 py-2"
          }`}
      >
        <div className="flex items-center gap-1.5">
          <Stethoscope className={`${compact ? "w-3 h-3" : "w-3.5 h-3.5"} text-white shrink-0`} />
          <span
            className={`font-bold uppercase tracking-wider text-white ${compact ? "text-[9.5px]" : "text-[10.5px] sm:text-[11px]"
              }`}
          >
            {isUrdu ? "طبی معلومات" : "CLINICAL REFERENCE"}
          </span>
        </div>
        <span
          className={`bg-white/20 text-emerald-100 font-mono font-semibold rounded ${compact ? "text-[8.5px] px-1.5 py-0.5" : "text-[10px] px-2 py-0.5"
            }`}
        >
          ID: {healthId}
        </span>
      </div>

      {/* ═══ ZONE 2: Middle Content ═══ */}
      <div className="flex flex-1 flex-col justify-center py-1 overflow-hidden">
        {/* Critical Allergies Section */}
        <div
          className={`bg-red-50/80 border border-red-200 rounded-xl shrink-0 ${compact ? "p-1.5 my-1" : "p-2.5 my-1.5"
            }`}
        >
          <div className="flex items-center gap-1 mb-0.5">
            <AlertTriangle className={`${compact ? "w-3 h-3" : "w-3.5 h-3.5"} text-[#C0392B] shrink-0`} />
            <span
              className={`font-bold text-[#C0392B] tracking-wider uppercase ${compact ? "text-[8.5px]" : "text-[10px]"
                }`}
            >
              {isUrdu ? "شدید الرجی" : "CRITICAL ALLERGIES & SENSITIVITIES"}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {displayAllergies.map((allergy, idx) => {
              const isNKDA =
                allergy.includes("NKDA") ||
                allergy.includes("کوئی معلوم الرجی نہیں");
              return (
                <span
                  key={idx}
                  className={`font-semibold rounded-md border ${compact ? "text-[8.5px] px-1.5 py-0.5" : "text-[10px] sm:text-xs px-2.5 py-0.5"
                    } ${isNKDA
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-red-100/80 text-[#962D22] border-red-300"
                    }`}
                >
                  {allergy}
                </span>
              );
            })}
          </div>
        </div>

        {/* 2-Column or 1-Column Clinical Layout */}
        <div
          className={
            hasSecondaryContact
              ? `grid grid-cols-2 ${compact ? "gap-2" : "gap-3"} items-stretch`
              : "w-full"
          }
        >
          {/* Chronic Conditions */}
          <div className="flex flex-col justify-center overflow-hidden">
            <span
              className={`font-bold text-[#0D5C4A] uppercase tracking-wider mb-0.5 ${compact ? "text-[8.5px]" : "text-[10px]"
                }`}
            >
              {isUrdu ? "دائمی بیماریاں" : "CHRONIC CONDITIONS"}
            </span>
            <ul
              className={`text-slate-700 font-medium leading-tight space-y-0.5 ${compact ? "text-[8.5px]" : "text-[10px] sm:text-[10.5px]"
                }`}
            >
              {displayConditions.slice(0, 3).map((c, i) => (
                <li key={i} className="truncate">
                  • {c}
                </li>
              ))}
            </ul>
          </div>

          {/* Secondary ICE Contact (Only shown if available) */}
          {hasSecondaryContact && secondaryContact && (
            <div className="flex flex-col justify-center overflow-hidden">
              <span
                className={`font-bold text-[#0D5C4A] uppercase tracking-wider mb-0.5 ${compact ? "text-[8.5px]" : "text-[10px]"
                  }`}
              >
                {isUrdu ? "دوسرا رابطہ" : "SECONDARY ICE CONTACT"}
              </span>
              <div
                className={`bg-[#F5F8F7] border border-[#DCE8E5] rounded-lg flex flex-col justify-center ${compact ? "p-1.5" : "p-2 rounded-xl"
                  }`}
              >
                <p
                  className={`font-semibold text-slate-900 truncate ${compact ? "text-[9px]" : "text-[10.5px] sm:text-[11px]"
                    }`}
                >
                  {secondaryContact.name || "N/A"}{" "}
                  {formattedRelation ? `(${formattedRelation})` : ""}
                </p>
                {secondaryContact.phone && (
                  <div
                    className={`flex items-center gap-1 font-mono text-[#0D5C4A] font-semibold mt-0.5 ${compact ? "text-[9px]" : "text-[10.5px] sm:text-[11px]"
                      }`}
                  >
                    <Phone className={`${compact ? "w-2.5 h-2.5" : "w-3 h-3"} text-[#0D5C4A] shrink-0`} />
                    <span className="truncate">{secondaryContact.phone}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ ZONE 3: Bottom Directive Bar ═══ */}
      {hasNotes ? (
        <div
          className={`bg-amber-50 border-t border-amber-200 text-amber-900 font-medium flex items-center gap-1 shrink-0 ${compact ? "-mx-3.5 -mb-3.5 px-3.5 py-1 text-[8.5px]" : "-mx-4 -mb-4 px-4 py-1.5 text-[10px]"
            }`}
        >
          <AlertCircle className={`${compact ? "w-3 h-3" : "w-3.5 h-3.5"} text-amber-600 shrink-0`} />
          <span className="truncate">
            <strong>{isUrdu ? "ہدایت:" : "DIRECTIVE:"}</strong> {emergencyNotes?.trim()}
          </span>
        </div>
      ) : (
        <div
          className={`bg-emerald-50 border-t border-emerald-200 text-emerald-900 font-medium flex items-center justify-center gap-1 shrink-0 text-center ${compact ? "-mx-3.5 -mb-3.5 px-3.5 py-1 text-[8px]" : "-mx-4 -mb-4 px-4 py-1.5 text-[9px] sm:text-[9.5px]"
            }`}
        >
          <span className="truncate">
            {isUrdu
              ? "پیرامیڈیکس: مکمل میڈیکل ہسٹری کیلئے فرنٹ QR اسکین کریں۔"
              : "Paramedics: Scan front QR for full medical history & physician contacts."}
          </span>
        </div>
      )}
    </div>
  );
}

