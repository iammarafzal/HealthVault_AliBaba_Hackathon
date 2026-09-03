"use client";

import React from "react";
import { ShieldPlus, QrCode, Droplet, PhoneCall } from "lucide-react";
import QRCodeCanvas from "@/components/emergency/QRCodeCanvas";
import { useLanguage } from "@/context/LanguageContext";

export interface WalletCardFrontProps {
  patientName?: string;
  bloodGroup?: string | null;
  healthId?: string;
  token?: string;
  primaryContact?: {
    name?: string;
    relation?: string;
    phone?: string;
  } | null;
  isActive?: boolean;
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

export default function WalletCardFront({
  patientName = "Ahmad Raza",
  bloodGroup = "B+",
  healthId = "HV-PAK-98214",
  token,
  primaryContact = null,
  compact = false,
  className = "",
  style = {},
}: WalletCardFrontProps) {
  const { isUrdu } = useLanguage();

  const rawRelation = primaryContact?.relation?.trim() || "";
  const formattedRelation = isUrdu
    ? RELATION_URDU_MAP[rawRelation.toLowerCase()] || rawRelation
    : rawRelation;

  const hasContact = Boolean(primaryContact && (primaryContact.name || primaryContact.phone));

  return (
    <div
      className={`wallet-card-front bg-gradient-to-br from-[#0F382E] via-[#0B2A22] to-[#071D18] border border-emerald-500/20 rounded-2xl relative overflow-hidden shadow-2xl flex flex-col justify-between select-none transition-all ${compact ? "p-3 sm:p-3.5" : "p-4 sm:p-5"
        } ${className}`}
      style={{
        width: "100%",
        maxWidth: compact ? 420 : 480,
        aspectRatio: "1.586 / 1",
        ...style,
      }}
      dir={isUrdu ? "rtl" : "ltr"}
    >
      {/* ═══ Micro-Textures: Radial Glow & Watermark ═══ */}
      <div className="absolute -top-10 -left-10 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <img
        src="/favicon.png"
        alt="Watermark"
        width={compact ? 120 : 150}
        height={compact ? 120 : 150}
        className={`absolute -bottom-8 ${isUrdu ? "-left-8 transform -scale-x-100" : "-right-8"
          } opacity-[0.06] pointer-events-none drop-shadow-md filter grayscale`}
      />

      {/* ═══ 1. Top Brand Header ═══ */}
      <div className="flex items-center justify-between shrink-0 z-10 gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <ShieldPlus className={`${compact ? "w-3.5 h-3.5" : "w-4 h-4"} text-emerald-400 shrink-0`} />
          <span
            className={`font-bold tracking-wider text-white uppercase whitespace-nowrap ${compact ? "text-[9.5px] sm:text-[10px]" : "text-xs font-semibold"
              }`}
          >
            HEALTHVAULT
          </span>
          <span
            className={`uppercase font-bold text-emerald-400/90 bg-emerald-950/60 border border-emerald-500/20 rounded ml-1 whitespace-nowrap ${compact ? "text-[7.5px] px-1 py-0.5" : "text-[10px] px-1.5 py-0.5"
              }`}
          >
            {isUrdu ? "ایمرجنسی کارڈ" : "EMERGENCY ID"}
          </span>
        </div>

        <span
          className={`font-mono font-medium text-emerald-300/80 tracking-wide shrink-0 whitespace-nowrap ${compact ? "text-[8.5px] sm:text-[9px]" : "text-[11px]"
            }`}
        >
          {healthId}
        </span>
      </div>

      {/* ═══ 2. Card Content (2-Column Grid) ═══ */}
      <div
        className={`items-center my-auto z-10 grid ${compact
            ? "grid-cols-[76px_1fr] sm:grid-cols-[82px_1fr] gap-2.5 sm:gap-3"
            : "grid-cols-[104px_1fr] sm:grid-cols-[108px_1fr] gap-4 sm:gap-5"
          }`}
      >
        {/* Left Column: QR Action Module */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <div
            className={`bg-white rounded-xl shadow-lg border border-white/10 flex items-center justify-center ${compact ? "w-[76px] h-[76px] sm:w-[82px] sm:h-[82px] p-1.5" : "w-[104px] h-[104px] sm:w-[108px] sm:h-[108px] p-2.5"
              }`}
          >
            <QRCodeCanvas healthId={healthId} token={token} size={compact ? 66 : 86} />
          </div>
          <div
            className={`flex items-center justify-center gap-1 text-emerald-300 font-medium whitespace-nowrap ${compact ? "text-[7.5px] sm:text-[8px] mt-1" : "text-[9.5px] mt-2"
              }`}
          >
            <QrCode className={`${compact ? "w-2.5 h-2.5" : "w-3.5 h-3.5"} text-emerald-400 shrink-0`} />
            <span>{isUrdu ? "اسکین کریں" : compact ? "Scan Profile" : "Scan to View Profile"}</span>
          </div>
        </div>

        {/* Right Column: Vitals & Emergency Contact */}
        <div className="flex flex-col justify-center overflow-hidden min-w-0">
          {/* Patient Name Block */}
          <div className="w-full overflow-hidden">
            <span
              className={`font-bold text-emerald-300/60 uppercase tracking-widest block leading-none ${compact ? "text-[7px] sm:text-[7.5px] mb-0.5" : "text-[9px] mb-0.5"
                }`}
            >
              {isUrdu ? "مریض کا نام" : "PATIENT NAME"}
            </span>
            <h3
              className={`font-extrabold text-white tracking-tight leading-tight uppercase truncate ${compact ? "text-[12.5px] sm:text-[14px]" : "text-base sm:text-lg"
                }`}
            >
              {patientName || "N/A"}
            </h3>
          </div>

          <div className={`w-full h-px bg-white/10 ${compact ? "my-1" : "my-2"}`} />

          {/* Blood Group Section */}
          <div className="flex items-center gap-1.5">
            <Droplet className={`${compact ? "w-3 h-3" : "w-3.5 h-3.5"} text-amber-400 fill-amber-400 shrink-0`} />
            <span
              className={`font-semibold text-slate-300 uppercase tracking-wider ${compact ? "text-[8px] sm:text-[8.5px]" : "text-[10px]"
                }`}
            >
              {isUrdu ? "خون کا گروپ" : "BLOOD GROUP"}:
            </span>
            <span
              className={`font-extrabold text-amber-300 ${compact ? "text-[10.5px] sm:text-[11.5px]" : "text-xs sm:text-sm"
                }`}
            >
              {bloodGroup || "N/A"}
            </span>
          </div>

          {/* Primary Emergency Contact Block (Only shown when available) */}
          {hasContact && primaryContact && (
            <>
              <div className={`w-full h-px bg-white/10 ${compact ? "my-1" : "my-2"}`} />
              <div className="space-y-0.5 overflow-hidden">
                <div className="flex items-center gap-1">
                  <PhoneCall className={`${compact ? "w-2.5 h-2.5" : "w-3 h-3"} text-emerald-400 shrink-0`} />
                  <span
                    className={`font-semibold text-emerald-300/80 uppercase tracking-wider leading-none ${compact ? "text-[7px] sm:text-[7.5px]" : "text-[9px]"
                      }`}
                  >
                    {isUrdu ? "ہنگامی رابطہ" : "IN CASE OF EMERGENCY"}
                  </span>
                </div>

                <div
                  className={`flex items-baseline justify-between gap-1 leading-tight ${compact ? "text-[9px] sm:text-[10px]" : "text-[11px] sm:text-xs"
                    }`}
                >
                  <span className="font-bold text-white truncate min-w-0">
                    {primaryContact.name || "N/A"}{" "}
                    {formattedRelation && (
                      <span className={`font-normal text-slate-400 ${compact ? "text-[7.5px]" : "text-[9.5px]"}`}>
                        ({formattedRelation})
                      </span>
                    )}
                  </span>
                  {primaryContact.phone && (
                    <span
                      className={`font-mono font-semibold text-emerald-300 shrink-0 ${compact ? "text-[8.5px] sm:text-[9.5px]" : "text-[10.5px] sm:text-[11px]"
                        }`}
                    >
                      {primaryContact.phone}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
