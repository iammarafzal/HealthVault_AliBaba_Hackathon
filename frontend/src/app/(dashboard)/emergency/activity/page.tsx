"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  FlipHorizontal,
  RotateCw,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import WalletCardFront from "@/components/emergency/WalletCardFront";
import WalletCardBack from "@/components/emergency/WalletCardBack";
import ScanActivityTimeline from "@/components/emergency/ScanActivityTimeline";
import {
  getEmergencyContacts,
  getEmergencyScans,
  getEmergencyScanHistory,
  getPatientEmergencySummary,
  getQRCodeData,
  getSharedAlertStreams,
} from "@/services/emergencyService";
import { getDoctorSummary } from "@/services/summaryService";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useSharedEmergencyListeners } from "@/hooks/useSharedEmergencyListeners";
import type {
  EmergencyContactResponse,
  EmergencyScanLog,
  QRDetailsResponse,
} from "@/types/api";

function EmergencyActivityContent() {
  const { user } = useAuth();
  const { locale } = useLanguage();
  const searchParams = useSearchParams();
  const isUrdu = locale === "ur";

  const queryHealthId = searchParams.get("health_id") || searchParams.get("healthId");

  const [qrData, setQrData] = useState<QRDetailsResponse | null>(null);
  const [contacts, setContacts] = useState<EmergencyContactResponse[]>([]);
  const [scans, setScans] = useState<EmergencyScanLog[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [chronicConditions, setChronicConditions] = useState<string[]>([]);
  const [patientName, setPatientName] = useState<string>("");
  const [patientBloodGroup, setPatientBloodGroup] = useState<string>("");
  const [isCaregiverView, setIsCaregiverView] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cardSide, setCardSide] = useState<"front" | "back">("front");

  const [sharedStreams, setSharedStreams] = useState<
    import("@/hooks/useSharedEmergencyListeners").SharedAlertStream[]
  >([]);

  // 1. Fetch initial card & scan activity data
  const fetchData = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) setIsRefreshing(true);
      try {
        if (queryHealthId) {
          setIsCaregiverView(true);
          const [patientSummary, patientScans, streams] = await Promise.all([
            getPatientEmergencySummary(queryHealthId).catch(() => null),
            getEmergencyScanHistory(queryHealthId).catch(() => []),
            getSharedAlertStreams().catch(() => []),
          ]);

          if (patientSummary) {
            setPatientName(patientSummary.full_name || "Attached Patient");
            setPatientBloodGroup(patientSummary.blood_group || "N/A");
            setAllergies(patientSummary.critical_allergies || []);
            setChronicConditions(patientSummary.chronic_conditions || []);
            if (patientSummary.emergency_contacts) {
              setContacts(patientSummary.emergency_contacts);
            }
          }
          setScans(patientScans || []);
          if (streams) setSharedStreams(streams);
        } else {
          setIsCaregiverView(false);
          const [qr, scanLogs, iceContacts, streams] = await Promise.all([
            getQRCodeData().catch(() => null),
            getEmergencyScans(50).catch(() => []),
            getEmergencyContacts().catch(() => []),
            getSharedAlertStreams().catch(() => []),
          ]);

          if (qr) setQrData(qr);
          setScans(scanLogs || []);
          setContacts(iceContacts || []);
          if (streams) setSharedStreams(streams);

          if (user?.id) {
            try {
              const summary = await getDoctorSummary(user.id);
              setAllergies(summary.known_allergies ?? []);
              setChronicConditions(summary.active_diagnoses ?? []);
            } catch {
              // Ignore summary fallback
            }
          }
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [queryHealthId, user?.id]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 2. Real-time auto-refresh on incoming SSE emergency scan events
  useSharedEmergencyListeners(sharedStreams);

  // 3. Polling every 12 seconds to ensure timeline stays fresh
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(false);
    }, 12000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const primaryContact =
    contacts.find((c) => c.is_primary) ||
    contacts[0] ||
    user?.profile?.emergency_contacts?.[0] ||
    null;

  const secondaryContact =
    contacts.length > 1
      ? contacts[1]
      : user?.profile?.emergency_contacts?.[1] || null;

  const isQRLive = qrData ? qrData.emergency_enabled : true;

  const activePatientName = isCaregiverView
    ? patientName || "Attached Patient"
    : user?.full_name || "Ahmad Raza";
  const activeBloodGroup = isCaregiverView
    ? patientBloodGroup || "N/A"
    : user?.blood_group || "B+";
  const activeHealthId = isCaregiverView
    ? queryHealthId!
    : qrData?.health_id || user?.health_id || "HV-PAK-98214";

  return (
    <div className="space-y-5 pb-12" dir={isUrdu ? "rtl" : "ltr"}>
      {/* ── 1. Consolidated Single Header Row ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/emergency"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title={isUrdu ? "واپس ڈیش بورڈ" : "Back to Emergency Overview"}
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <span>{activePatientName}</span>
          </h1>

          <Badge
            variant="outline"
            className="font-mono text-xs font-bold bg-background border-border"
          >
            {activeHealthId}
          </Badge>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>{isUrdu ? "لائیو مانیٹر فعال" : "Live Monitor Active"}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="h-8 text-xs font-semibold gap-1.5 rounded-lg border-border"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isUrdu ? "ریفریش" : "Refresh"}</span>
          </Button>

          <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg">
            {scans.length} {isUrdu ? "اسکینز درج ہیں" : "Scans Recorded"}
          </span>
        </div>
      </div>

      {/* ── 2. Split-Screen View Architecture ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (lg:col-span-5) — Sticky Card Widget */}
        <div className="lg:col-span-5 lg:sticky lg:top-4 space-y-3">
          <Card className="border-border bg-card shadow-xs overflow-hidden">
            <CardHeader className="py-3 px-4 border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-extrabold text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-vault-teal dark:text-teal-400" />
                  <span>{isUrdu ? "ایمرجنسی شناختی کارڈ" : "Emergency ID Card"}</span>
                </CardTitle>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCardSide(cardSide === "front" ? "back" : "front")}
                  className="h-7 px-2.5 text-xs font-bold gap-1.5 rounded-md text-vault-teal dark:text-teal-400 hover:bg-vault-teal/10"
                >
                  <FlipHorizontal className="h-3.5 w-3.5" />
                  <span>
                    {cardSide === "front"
                      ? isUrdu
                        ? "پچھلی سائیڈ"
                        : "Flip to Back"
                      : isUrdu
                      ? "اگلی سائیڈ"
                      : "Flip to Front"}
                  </span>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col items-center justify-center">
                <div className="transform scale-[0.88] sm:scale-95 lg:scale-90 origin-top transition-transform -mb-3 sm:-mb-1">
                  {cardSide === "front" ? (
                    <WalletCardFront
                      patientName={activePatientName}
                      bloodGroup={activeBloodGroup}
                      healthId={activeHealthId}
                      token={qrData?.emergency_token}
                      primaryContact={primaryContact}
                      isActive={isQRLive}
                      compact={true}
                    />
                  ) : (
                    <WalletCardBack
                      allergies={allergies}
                      chronicConditions={chronicConditions}
                      secondaryContact={secondaryContact}
                      healthId={activeHealthId}
                      compact={true}
                    />
                  )}
                </div>

                <p className="text-[11px] font-medium text-center text-muted-foreground pt-2 border-t border-border/40 w-full">
                  {isUrdu
                    ? "جسمانی کارڈ کی موجودگی فوری میڈیکل ڈیوائسز تک رسائی دیتی ہے"
                    : "Possession of physical card unlocks triage data"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (lg:col-span-7) — Live Scan Activity Stream */}
        <div className="lg:col-span-7 space-y-3">
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="py-3 px-4 border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-extrabold flex items-center gap-2 text-foreground">
                  <Clock className="h-4 w-4 text-vault-teal dark:text-teal-400" />
                  <span>{isUrdu ? "لائیو اسکین فیڈ" : "Live Scan Activity Stream"}</span>
                </CardTitle>

                <span className="text-[11px] font-medium text-muted-foreground">
                  {isUrdu ? "تازہ ترین اسکینز سب سے اوپر" : "Latest scan pins top"}
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-3 sm:p-4">
              <div className="max-h-[calc(100vh-160px)] overflow-y-auto pr-1">
                <ScanActivityTimeline scans={scans} isLoading={isLoading} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function EmergencyActivityPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-12 text-sm font-semibold text-muted-foreground">
          Loading emergency timeline...
        </div>
      }
    >
      <EmergencyActivityContent />
    </Suspense>
  );
}
