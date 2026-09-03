"use client";

import QRCodeCanvas from "@/components/emergency/QRCodeCanvas";

/* ──────────────────────────────────────────────────────────────
 *  HealthVault AI – Emergency Medical ID Card
 *  ISO/IEC 7810 ID-1 credit-card form factor (85.6 × 54 mm)
 *  Rendered as an isolated mockup on a pure white canvas.
 * ────────────────────────────────────────────────────────────── */

// Pixel-equivalent scale: 1mm ≈ 3.78px at 96 dpi
const CARD_W = 480; // ~127 mm (scaled up for readability)
const CARD_H = 300; // ~79 mm

// ── Colour tokens ────────────────────────────────────────────
const DEEP_SLATE   = "#1A2826";
const VAULT_TEAL   = "#0D5C4A";
const SAFFRON_AMBER = "#C47C1A";
const EMERGENCY_RED = "#C0392B";
const MUTED_TEAL   = "#3D5450";
const TEAL_MIST    = "#B2DFD4";
const HAIRLINE     = "rgba(220, 232, 229, 0.15)";
const DIVIDER_CLR  = "rgba(255, 255, 255, 0.07)";

// ── Hexagon + ECG icon (inline SVG) ─────────────────────────
function HexagonPulseIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Flat-top hexagon */}
      <path
        d="M12 2 L20.66 7 L20.66 17 L12 22 L3.34 17 L3.34 7 Z"
        stroke="white"
        strokeWidth="1.5"
        fill="none"
      />
      {/* ECG / heartbeat pulse line */}
      <polyline
        points="5,12 8.5,12 9.5,9 11,15 12.5,8 13.5,14 14.5,12 19,12"
        stroke="white"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

// ── Ghost watermark hexagon (large, stroke-only) ────────────
function WatermarkHexagon() {
  return (
    <svg
      width={85}
      height={85}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        position: "absolute",
        bottom: 6,
        right: 6,
        opacity: 0.05,
        pointerEvents: "none",
      }}
    >
      <path
        d="M12 2 L20.66 7 L20.66 17 L12 22 L3.34 17 L3.34 7 Z"
        stroke="white"
        strokeWidth="0.8"
        fill="none"
      />
      <polyline
        points="5,12 8.5,12 9.5,9 11,15 12.5,8 13.5,14 14.5,12 19,12"
        stroke="white"
        strokeWidth="0.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

// ── Main Card Component ─────────────────────────────────────
export default function EmergencyMedicalIDCard() {
  const headerH = Math.round(CARD_H * 0.14); // ~29px
  const footerH = 28; // ~7.5 mm

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#FFFFFF",
        padding: 40,
      }}
    >
      {/* ── Card Container ── */}
      <div
        className="emergency-card-container"
        style={{
          width: CARD_W,
          height: CARD_H,
          borderRadius: 8,
          border: `1px solid ${HAIRLINE}`,
          background: DEEP_SLATE,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
          boxShadow: "none",
          fontFamily: "var(--font-inter)",
        }}
      >
        {/* ═══ ZONE 1: Top Header Bar ═══ */}
        <div
          style={{
            height: headerH,
            minHeight: headerH,
            background: VAULT_TEAL,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 12px",
          }}
        >
          {/* Left: Icon + Title */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <HexagonPulseIcon size={20} />
            <span
              style={{
                fontFamily: "var(--font-jakarta)",
                fontWeight: 700,
                fontSize: 13,
                color: "#FFFFFF",
                letterSpacing: "0.06em",
                whiteSpace: "nowrap",
              }}
            >
              HEALTHVAULT AI
            </span>
            <span
              style={{
                color: "#FFFFFF",
                fontSize: 12,
                margin: "0 2px",
                opacity: 0.5,
              }}
            >
              ·
            </span>
            <span
              style={{
                fontFamily: "var(--font-inter)",
                fontWeight: 600,
                fontSize: 11,
                color: "#FFFFFF",
                whiteSpace: "nowrap",
                opacity: 0.9,
              }}
            >
              EMERGENCY MEDICAL ID
            </span>
          </div>

          {/* Right: ACTIVE pill badge */}
          <span
            style={{
              background: "rgba(255, 255, 255, 0.18)",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              borderRadius: 20,
              padding: "3px 14px",
              fontFamily: "var(--font-inter)",
              fontWeight: 700,
              fontSize: 10,
              color: "#FFFFFF",
              whiteSpace: "nowrap",
              letterSpacing: "0.04em",
            }}
          >
            ACTIVE
          </span>
        </div>

        {/* ═══ ZONE 2: Main Card Body ═══ */}
        <div
          style={{
            flex: 1,
            display: "flex",
            padding: "14px 16px",
            gap: 16,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Ghost watermark behind everything */}
          <WatermarkHexagon />

          {/* ── Left Column (~28%): QR Code ── */}
          <div
            style={{
              width: "28%",
              minWidth: 120,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {/* White QR container */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 8,
                padding: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}
            >
              <QRCodeCanvas healthId="HV-PAK-98214" size={96} />
            </div>
            {/* QR caption */}
            <span
              style={{
                fontFamily: "var(--font-inter)",
                fontSize: 9,
                color: TEAL_MIST,
                textAlign: "center",
                whiteSpace: "nowrap",
              }}
            >
              Scan · Zero login required
            </span>
          </div>

          {/* ── Right Column (~72%): Patient Data ── */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 0,
            }}
          >
            {/* Row 1 – Patient Name */}
            <DataRow>
              <Label text="PATIENT NAME" />
              <Value
                text="Ammar Afzal"
                font="var(--font-jakarta)"
                fontSize={22}
                fontWeight={700}
                color="#FFFFFF"
              />
            </DataRow>

            <HairDivider color={DIVIDER_CLR} />

            {/* Row 2 – Blood Type + Health ID */}
            <div style={{ display: "flex", gap: 20 }}>
              <div style={{ flex: 1 }}>
                <DataRow>
                  <Label text="BLOOD GROUP" />
                  <Value
                    text="B+"
                    font="var(--font-jakarta)"
                    fontSize={18}
                    fontWeight={700}
                    color={SAFFRON_AMBER}
                  />
                </DataRow>
              </div>
              <div style={{ flex: 1 }}>
                <DataRow>
                  <Label text="HEALTH ID" />
                  <Value
                    text="HV-PAK-98214"
                    font="var(--font-mono)"
                    fontSize={14}
                    fontWeight={600}
                    color="#FFFFFF"
                  />
                </DataRow>
              </div>
            </div>

            <HairDivider color={DIVIDER_CLR} />

            {/* Row 3 – Critical Allergies */}
            <DataRow>
              <Label text="CRITICAL ALLERGIES" />
              <Value
                text="Penicillin (Severe)"
                font="var(--font-jakarta)"
                fontSize={13}
                fontWeight={600}
                color={EMERGENCY_RED}
              />
            </DataRow>

            <HairDivider color={DIVIDER_CLR} />

            {/* Row 4 – ICE Contact */}
            <DataRow>
              <Label text="EMERGENCY CONTACT" />
              <Value
                text="Father · +92 300 1234567"
                font="var(--font-inter)"
                fontSize={13}
                fontWeight={500}
                color="#FFFFFF"
              />
            </DataRow>
          </div>
        </div>

        {/* ═══ ZONE 3: Bottom Footer Strip ═══ */}
        <div
          style={{
            height: footerH,
            minHeight: footerH,
            background: VAULT_TEAL,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 16px",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-inter)",
              fontSize: 9.5,
              color: "#FFFFFF",
              opacity: 0.85,
              textAlign: "center",
              lineHeight: 1.4,
            }}
          >
            Scan with any smartphone camera for complete emergency profile
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Reusable micro-components ────────────────────────────────

function DataRow({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: "4px 0" }}>{children}</div>;
}

function Label({ text }: { text: string }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-inter)",
        fontSize: 9,
        color: MUTED_TEAL,
        lineHeight: 1.2,
        marginBottom: 2,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
      }}
    >
      {text}
    </div>
  );
}

function Value({
  text,
  font,
  fontSize,
  fontWeight,
  color,
}: {
  text: string;
  font: string;
  fontSize: number;
  fontWeight: number;
  color: string;
}) {
  return (
    <div
      style={{
        fontFamily: font,
        fontSize,
        fontWeight,
        color,
        lineHeight: 1.25,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {text}
    </div>
  );
}

function HairDivider({ color }: { color: string }) {
  return (
    <div
      style={{
        height: 1,
        background: color,
        margin: "2px 0",
      }}
    />
  );
}
