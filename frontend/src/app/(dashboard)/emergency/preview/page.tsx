"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Loader2,
  Printer,
  QrCode,
  Rotate3d,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import WalletCardFront from "@/components/emergency/WalletCardFront";
import WalletCardBack from "@/components/emergency/WalletCardBack";
import { getQRCodeData, getEmergencyContacts } from "@/services/emergencyService";
import { getDoctorSummary } from "@/services/summaryService";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import type { QRDetailsResponse, EmergencyContactResponse } from "@/types/api";

export default function EmergencyCardPreviewPage() {
  const { user } = useAuth();
  const { t, isUrdu } = useLanguage();
  const [qrData, setQrData] = useState<QRDetailsResponse | null>(null);
  const [contacts, setContacts] = useState<EmergencyContactResponse[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const [viewMode, setViewMode] = useState<"flip" | "sideBySide">("flip");
  const [printFormat, setPrintFormat] = useState<"pvc" | "paper" | "paper-side">("pvc");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [qr, contactList] = await Promise.all([
        getQRCodeData(),
        getEmergencyContacts().catch(() => []),
      ]);
      setQrData(qr);
      setContacts(contactList || []);

      if (user?.id) {
        try {
          const summary = await getDoctorSummary(user.id);
          setAllergies(summary.known_allergies ?? []);
          setConditions(summary.active_diagnoses ?? []);
        } catch {
          // Fallbacks handled gracefully
        }
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const patientName = user?.full_name || "N/A";
  const showBloodGroup = user?.privacy?.show_blood_group !== false;
  const bloodGroup = showBloodGroup ? user?.blood_group || null : null;
  const healthId = qrData?.health_id || user?.health_id || "HV-PAK-98214";
  const token = qrData?.emergency_token;
  const isActive = qrData ? qrData.emergency_enabled : true;

  const showContacts = user?.privacy?.show_emergency_contacts !== false;
  const primaryContact = showContacts && contacts.length > 0 ? contacts[0] : null;
  const secondaryContact = showContacts && contacts.length > 1 ? contacts[1] : null;

  const showAllergies = user?.privacy?.show_allergies !== false;
  const effectiveAllergies = showAllergies ? allergies : [];

  const showConditions = user?.privacy?.show_chronic_conditions !== false;
  const effectiveConditions = showConditions ? conditions : [];

  const emergencyNotes =
    user?.privacy?.show_emergency_notes !== false ? user?.privacy?.emergency_notes : null;

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-vault-teal" />
          <p className="text-sm text-muted-foreground">
            {t("emergency.preview.loading", "Rendering High-Resolution Wallet Card…")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12" dir={isUrdu ? "rtl" : "ltr"}>
      {/* ── Dynamic Scoped Print Styles ── */}
      <style jsx global>{`
        @media print {
          /* 1. Hide all default screen elements */
          body * {
            visibility: hidden !important;
          }
          nav, aside, header, footer, button, .no-print, .guidelines-text, .fold-axis {
            display: none !important;
          }

          /* 2. Target ONLY the card container */
          #printable-card-area,
          #printable-card-area * {
            visibility: visible !important;
          }

          /* Base container positioning */
          #printable-card-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
          }

          /* Enforce exact card dimensions and force high-res background colors */
          .id-card-print-surface {
            width: 85.6mm !important;
            height: 53.98mm !important;
            min-width: 85.6mm !important;
            min-height: 53.98mm !important;
            max-width: 85.6mm !important;
            max-height: 53.98mm !important;
            border-radius: 3.18mm !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            box-shadow: none !important;
            border: none !important;
          }

          /* Crop tick line print-color preservation */
          .crop-tick {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          ${printFormat === "pvc"
            ? `
            /* PVC / CR80 Card Printer Mode: 2-page duplex stream */
            @page {
              size: 85.6mm 53.98mm;
              margin: 0;
            }

            #printable-card-area {
              display: block !important;
              width: 85.6mm !important;
              height: 53.98mm !important;
            }

            .print-card-front {
              page-break-after: always !important;
              break-after: page !important;
              display: block !important;
              width: 85.6mm !important;
              height: 53.98mm !important;
            }

            .print-card-back {
              page-break-before: always !important;
              break-before: page !important;
              display: block !important;
              width: 85.6mm !important;
              height: 53.98mm !important;
            }
          `
            : printFormat === "paper-side"
            ? `
            /* Paper Sheet Mode (Side-by-Side on Landscape A4) */
            @page {
              size: A4 landscape;
              margin: 10mm;
            }

            #printable-card-area {
              display: flex !important;
              flex-direction: row !important;
              align-items: center !important;
              justify-content: center !important;
              gap: 12mm !important;
              width: 100% !important;
              padding-top: 20mm !important;
            }

            .print-card-wrapper {
              display: inline-block !important;
              position: relative !important;
            }
          `
            : `
            /* Standard Paper / A4 Portrait Mode (Stacked Vertical - 100% Zero-Crop Guarantee) */
            @page {
              size: A4 portrait;
              margin: 10mm;
            }

            #printable-card-area {
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
              justify-content: flex-start !important;
              gap: 14mm !important;
              width: 100% !important;
              padding-top: 20mm !important;
              margin: 0 auto !important;
            }

            .print-card-wrapper {
              display: flex !important;
              justify-content: center !important;
              align-items: center !important;
              position: relative !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          `}
        }
      `}</style>

      {/* ── Screen Header (Hidden on Print) ── */}
      <div className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between print:hidden">
        <div>
          <div className="mb-2">
            <Link
              href="/emergency"
              className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-lg shadow-sm transition-colors"
            >
              <ArrowLeft className={`h-3.5 w-3.5 shrink-0 ${isUrdu ? "rotate-180" : ""}`} />
              <span>{t("emergency.preview.back", "Back to Dashboard")}</span>
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2 whitespace-normal sm:whitespace-nowrap">
            <QrCode className="h-6 w-6 text-vault-teal shrink-0" />
            <span>{t("emergency.preview.title", "Emergency Medical ID Card")}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("emergency.preview.subtitle", "ISO/IEC 7810 ID-1 (CR80 standard: 85.60mm × 53.98mm) dual-sided medical card.")}
          </p>
        </div>

        {/* Action Controls Toolbar (Compact & Sleek) */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
          {/* On-screen Preview View Mode Toggle (Compact) */}
          <div className="flex items-center rounded-lg border border-border bg-card p-0.5 shadow-sm h-8">
            <Button
              variant={viewMode === "flip" ? "secondary" : "ghost"}
              size="sm"
              className="text-[11px] h-6 px-2 font-medium inline-flex items-center gap-1 rounded-md"
              onClick={() => setViewMode("flip")}
            >
              <Rotate3d className="h-3 w-3 shrink-0" />
              <span>{t("emergency.preview.3dShort", "3D View")}</span>
            </Button>
            <Button
              variant={viewMode === "sideBySide" ? "secondary" : "ghost"}
              size="sm"
              className="text-[11px] h-6 px-2 font-medium rounded-md"
              onClick={() => setViewMode("sideBySide")}
            >
              {t("emergency.preview.sideBySideShort", "Side-by-Side")}
            </Button>
          </div>

          {/* Print Format Dropdown Selector (Compact) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-[11px] font-semibold border-border bg-card hover:bg-accent flex items-center gap-1.5 shadow-sm rounded-lg"
              >
                {printFormat === "pvc" && <CreditCard className="h-3.5 w-3.5 text-vault-teal shrink-0" />}
                {printFormat === "paper" && <FileText className="h-3.5 w-3.5 text-vault-teal shrink-0" />}
                {printFormat === "paper-side" && <FileSpreadsheet className="h-3.5 w-3.5 text-vault-teal shrink-0" />}

                <span className="whitespace-nowrap font-medium text-foreground">
                  {printFormat === "pvc"
                    ? t("emergency.preview.pvcShort", "PVC (CR80)")
                    : printFormat === "paper-side"
                    ? t("emergency.preview.paperSideShort", "A4 Side")
                    : t("emergency.preview.paperShort", "A4 Portrait")}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0 opacity-70" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-72 p-1.5 shadow-xl border-border bg-popover rounded-xl">
              <DropdownMenuLabel className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">
                {t("emergency.preview.printFormatLabel", "Select Print Format")}
              </DropdownMenuLabel>

              {/* Option 1: PVC Card Printer (Default) */}
              <DropdownMenuItem
                onClick={() => setPrintFormat("pvc")}
                className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors ${
                  printFormat === "pvc" ? "bg-vault-teal/10 text-vault-teal" : "hover:bg-accent"
                }`}
              >
                <CreditCard className="h-4 w-4 text-vault-teal mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">
                      {t("emergency.preview.pvcOptTitle", "PVC Card Printer (CR80)")}
                    </span>
                    {printFormat === "pvc" && <Check className="h-3.5 w-3.5 text-vault-teal shrink-0 ml-1" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                    {t("emergency.preview.pvcOptDesc", "Duplex 2-page print (85.60 × 53.98 mm) for commercial card printers.")}
                  </p>
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1" />

              {/* Option 2: Paper Sheet (A4 Portrait) */}
              <DropdownMenuItem
                onClick={() => setPrintFormat("paper")}
                className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors ${
                  printFormat === "paper" ? "bg-vault-teal/10 text-vault-teal" : "hover:bg-accent"
                }`}
              >
                <FileText className="h-4 w-4 text-vault-teal mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">
                      {t("emergency.preview.paperOptTitle", "Paper Sheet (A4 Portrait)")}
                    </span>
                    {printFormat === "paper" && <Check className="h-3.5 w-3.5 text-vault-teal shrink-0 ml-1" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                    {t("emergency.preview.paperOptDesc", "Centered vertical stack with 0.25pt trim marks (Zero crop guarantee).")}
                  </p>
                </div>
              </DropdownMenuItem>

              {/* Option 3: Paper Sheet (A4 Side-by-Side) */}
              <DropdownMenuItem
                onClick={() => setPrintFormat("paper-side")}
                className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors ${
                  printFormat === "paper-side" ? "bg-vault-teal/10 text-vault-teal" : "hover:bg-accent"
                }`}
              >
                <FileSpreadsheet className="h-4 w-4 text-vault-teal mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">
                      {t("emergency.preview.paperSideOptTitle", "Paper Sheet (A4 Side-by-Side)")}
                    </span>
                    {printFormat === "paper-side" && <Check className="h-3.5 w-3.5 text-vault-teal shrink-0 ml-1" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                    {t("emergency.preview.paperSideOptDesc", "Side-by-side cards with trim marks on A4 landscape.")}
                  </p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Print Button */}
          <Button
            onClick={handlePrint}
            className="bg-vault-teal text-white hover:bg-vault-active shadow-sm text-xs font-bold h-8 px-3 flex items-center gap-1.5 rounded-lg shrink-0"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>{t("emergency.preview.printBtn", "Print Card")}</span>
          </Button>
        </div>
      </div>

      {/* ── Print Profile Notification Bar (Screen Only) ── */}
      <div className="print:hidden rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-vault-teal shrink-0" />
          <div>
            <span className="font-semibold text-foreground">
              {printFormat === "pvc"
                ? t("emergency.preview.pvcActiveTitle", "PVC Card Printer Output Active (Default: CR80 Standard)")
                : printFormat === "paper-side"
                ? t("emergency.preview.paperSideActiveTitle", "A4 Landscape Side-by-Side Output Active")
                : t("emergency.preview.paperActiveTitle", "A4 Portrait Stacked Output Active (Zero-Crop Guarantee)")}
            </span>
            <p className="text-muted-foreground text-[11px] mt-0.5">
              {printFormat === "pvc"
                ? t(
                    "emergency.preview.pvcActiveDesc",
                    "Optimized for dye-sublimation / thermal card printers. Generates Page 1 (Front) & Page 2 (Back) with 0mm margins."
                  )
                : printFormat === "paper-side"
                ? t(
                    "emergency.preview.paperSideActiveDesc",
                    "Places Front and Back cards side-by-side on A4 Landscape with 0.25pt corner trim marks."
                  )
                : t(
                    "emergency.preview.paperActiveDesc",
                    "Centers Front and Back cards vertically on standard A4 / Letter paper with 0.25pt trim marks for rotary cutters or scissors."
                  )}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="font-mono text-[10px] self-start sm:self-center border-vault-teal/40 text-vault-teal">
          {printFormat === "pvc"
            ? "85.60 × 53.98 mm • Duplex"
            : printFormat === "paper-side"
            ? "A4 Landscape • Crop Marks"
            : "A4 Portrait • Centered Stack"}
        </Badge>
      </div>

      {/* ── Screen Card View (Hidden on Print) ── */}
      <div className="print:hidden">
        {viewMode === "flip" ? (
          /* ═══ 3D Interactive Flip Mode ═══ */
          <div className="flex flex-col items-center justify-center py-6 gap-5">
            <div className="relative [perspective:1200px] w-full max-w-[500px]">
              <div
                className="relative w-full transition-transform duration-700 [transform-style:preserve-3d] cursor-pointer"
                style={{
                  transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
                onClick={() => setIsFlipped(!isFlipped)}
              >
                {/* Front Side */}
                <div className="[backface-visibility:hidden]">
                  <WalletCardFront
                    patientName={patientName}
                    bloodGroup={bloodGroup}
                    healthId={healthId}
                    token={token}
                    primaryContact={primaryContact}
                    isActive={isActive}
                  />
                </div>

                {/* Back Side */}
                <div className="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden]">
                  <WalletCardBack
                    allergies={effectiveAllergies}
                    chronicConditions={effectiveConditions}
                    secondaryContact={secondaryContact}
                    emergencyNotes={emergencyNotes}
                    healthId={healthId}
                  />
                </div>
              </div>
            </div>

            {/* Flip hint & toggle button */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-bold rounded-full px-4 border-vault-teal/30 hover:bg-vault-teal/10 text-vault-teal gap-2"
                onClick={() => setIsFlipped(!isFlipped)}
              >
                <Rotate3d className="h-4 w-4" />
                {isFlipped
                  ? t("emergency.preview.flipToFront", "Flip to Front Side")
                  : t("emergency.preview.flipToBack", "Flip to Back Side")}
              </Button>
              <Badge variant="secondary" className="text-[11px] font-medium text-muted-foreground">
                {isFlipped
                  ? t("emergency.preview.showingBack", "Showing: Back (Clinical Data)")
                  : t("emergency.preview.showingFront", "Showing: Front (QR & Vitals)")}
              </Badge>
            </div>
          </div>
        ) : (
          /* ═══ Side-by-Side View ═══ */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
            <Card className="border-border bg-card shadow-sm overflow-hidden">
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {t("emergency.preview.frontTitle", "Front of Card")}
                  </CardTitle>
                </div>
                <CardDescription className="text-xs">
                  {t("emergency.preview.frontDesc", "Primary scan surface with vitals & QR.")}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 flex justify-center">
                <WalletCardFront
                  patientName={patientName}
                  bloodGroup={bloodGroup}
                  healthId={healthId}
                  token={token}
                  primaryContact={primaryContact}
                  isActive={isActive}
                />
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm overflow-hidden">
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    {t("emergency.preview.backTitle", "Back of Card")}
                  </CardTitle>
                </div>
                <CardDescription className="text-xs">
                  {t("emergency.preview.backDesc", "Clinical data: allergies, conditions, notes.")}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 flex justify-center">
                <WalletCardBack
                  allergies={effectiveAllergies}
                  chronicConditions={effectiveConditions}
                  secondaryContact={secondaryContact}
                  emergencyNotes={emergencyNotes}
                  healthId={healthId}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          PRINT CONTAINER (#printable-card-area)
          Optimized for CR80 card printers & standard A4/Letter paper stock
          ═══════════════════════════════════════════════════════════════════════ */}
      <div id="printable-card-area" className="hidden print:block">
        {printFormat === "pvc" ? (
          /* ── 1. Direct PVC Duplex Mode (Page 1 Front, Page 2 Back) ── */
          <div className="print-pvc-mode">
            <div className="id-card-print-surface print-card-front">
              <WalletCardFront
                patientName={patientName}
                bloodGroup={bloodGroup}
                healthId={healthId}
                token={token}
                primaryContact={primaryContact}
                isActive={isActive}
                compact={true}
                style={{
                  width: "85.6mm",
                  height: "53.98mm",
                  maxWidth: "85.6mm",
                  maxHeight: "53.98mm",
                  borderRadius: "3.18mm",
                  boxShadow: "none",
                }}
              />
            </div>
            <div className="id-card-print-surface print-card-back">
              <WalletCardBack
                allergies={effectiveAllergies}
                chronicConditions={effectiveConditions}
                secondaryContact={secondaryContact}
                emergencyNotes={emergencyNotes}
                healthId={healthId}
                compact={true}
                style={{
                  width: "85.6mm",
                  height: "53.98mm",
                  maxWidth: "85.6mm",
                  maxHeight: "53.98mm",
                  borderRadius: "3.18mm",
                  boxShadow: "none",
                }}
              />
            </div>
          </div>
        ) : (
          /* ── 2. Standard Paper Mode (with Clean 0.25pt Corner Crop Marks) ── */
          <div className="print-paper-container">
            {/* Front Card with Corner Crop Marks */}
            <div className="print-card-wrapper">
              <div className="relative inline-block" style={{ width: "85.6mm", height: "53.98mm" }}>
                {/* 0.25pt Corner Crop Marks */}
                {/* Top-Left */}
                <span className="absolute -top-[4mm] left-0 w-[0.5px] h-[3mm] bg-neutral-400 crop-tick" />
                <span className="absolute top-0 -left-[4mm] w-[3mm] h-[0.5px] bg-neutral-400 crop-tick" />
                {/* Top-Right */}
                <span className="absolute -top-[4mm] right-0 w-[0.5px] h-[3mm] bg-neutral-400 crop-tick" />
                <span className="absolute top-0 -right-[4mm] w-[3mm] h-[0.5px] bg-neutral-400 crop-tick" />
                {/* Bottom-Left */}
                <span className="absolute -bottom-[4mm] left-0 w-[0.5px] h-[3mm] bg-neutral-400 crop-tick" />
                <span className="absolute bottom-0 -left-[4mm] w-[3mm] h-[0.5px] bg-neutral-400 crop-tick" />
                {/* Bottom-Right */}
                <span className="absolute -bottom-[4mm] right-0 w-[0.5px] h-[3mm] bg-neutral-400 crop-tick" />
                <span className="absolute bottom-0 -right-[4mm] w-[3mm] h-[0.5px] bg-neutral-400 crop-tick" />

                <div className="id-card-print-surface">
                  <WalletCardFront
                    patientName={patientName}
                    bloodGroup={bloodGroup}
                    healthId={healthId}
                    token={token}
                    primaryContact={primaryContact}
                    isActive={isActive}
                    compact={true}
                    style={{
                      width: "85.6mm",
                      height: "53.98mm",
                      maxWidth: "85.6mm",
                      maxHeight: "53.98mm",
                      borderRadius: "3.18mm",
                      boxShadow: "none",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Back Card with Corner Crop Marks */}
            <div className="print-card-wrapper">
              <div className="relative inline-block" style={{ width: "85.6mm", height: "53.98mm" }}>
                {/* 0.25pt Corner Crop Marks */}
                {/* Top-Left */}
                <span className="absolute -top-[4mm] left-0 w-[0.5px] h-[3mm] bg-neutral-400 crop-tick" />
                <span className="absolute top-0 -left-[4mm] w-[3mm] h-[0.5px] bg-neutral-400 crop-tick" />
                {/* Top-Right */}
                <span className="absolute -top-[4mm] right-0 w-[0.5px] h-[3mm] bg-neutral-400 crop-tick" />
                <span className="absolute top-0 -right-[4mm] w-[3mm] h-[0.5px] bg-neutral-400 crop-tick" />
                {/* Bottom-Left */}
                <span className="absolute -bottom-[4mm] left-0 w-[0.5px] h-[3mm] bg-neutral-400 crop-tick" />
                <span className="absolute bottom-0 -left-[4mm] w-[3mm] h-[0.5px] bg-neutral-400 crop-tick" />
                {/* Bottom-Right */}
                <span className="absolute -bottom-[4mm] right-0 w-[0.5px] h-[3mm] bg-neutral-400 crop-tick" />
                <span className="absolute bottom-0 -right-[4mm] w-[3mm] h-[0.5px] bg-neutral-400 crop-tick" />

                <div className="id-card-print-surface">
                  <WalletCardBack
                    allergies={effectiveAllergies}
                    chronicConditions={effectiveConditions}
                    secondaryContact={secondaryContact}
                    emergencyNotes={emergencyNotes}
                    healthId={healthId}
                    compact={true}
                    style={{
                      width: "85.6mm",
                      height: "53.98mm",
                      maxWidth: "85.6mm",
                      maxHeight: "53.98mm",
                      borderRadius: "3.18mm",
                      boxShadow: "none",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
