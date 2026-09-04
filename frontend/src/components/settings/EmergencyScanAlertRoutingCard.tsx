"use client";

import { useEffect, useState } from "react";
import {
  BellRing,
  CheckCircle2,
  HelpCircle,
  Loader2,
  Radio,
  Save,
  Shield,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { toast } from "sonner";
import {
  getEmergencyContacts,
  updateNotifiedIce,
  updatePrivacySettings,
} from "@/services/emergencyService";
import type { EmergencyContactResponse } from "@/types/api";

export default function EmergencyScanAlertRoutingCard() {
  const { user, refreshUser } = useAuth();
  const { isUrdu } = useLanguage();

  const [contacts, setContacts] = useState<EmergencyContactResponse[]>([]);
  const [selectedIceId, setSelectedIceId] = useState<string>("");
  const [enableAlerts, setEnableAlerts] = useState<boolean>(true);
  const [initialSelectedIceId, setInitialSelectedIceId] = useState<string>("");
  const [initialEnableAlerts, setInitialEnableAlerts] = useState<boolean>(true);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Load patient's ICE contacts and designated notified_ice_id
  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setIsLoadingContacts(true);
      try {
        const contactList = await getEmergencyContacts();
        if (mounted) {
          setContacts(contactList || []);
        }
      } catch (err) {
        console.warn("Could not fetch emergency contacts:", err);
      } finally {
        if (mounted) setIsLoadingContacts(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  // Hydrate selected contact and toggle from user object
  useEffect(() => {
    if (user) {
      const currentNotified =
        user.notified_ice_id ||
        user.profile?.notified_ice_id ||
        "";
      setSelectedIceId(currentNotified);
      setInitialSelectedIceId(currentNotified);

      const scanAlertsActive =
        user.privacy?.enable_scan_alerts !== false &&
        user.privacy?.enable_ice_scan_alerts !== false;
      setEnableAlerts(scanAlertsActive);
      setInitialEnableAlerts(scanAlertsActive);
      setIsInitialized(true);
    }
  }, [user]);

  const hasChanges =
    isInitialized &&
    (selectedIceId !== initialSelectedIceId ||
      enableAlerts !== initialEnableAlerts);

  const handleSave = async () => {
    setIsSaving(true);
    setSavedSuccess(false);

    try {
      // 1. Update designated ICE contact
      const targetId = selectedIceId.trim() ? selectedIceId : null;
      await updateNotifiedIce(targetId);

      // 2. Update privacy toggle for ICE scan alerts
      if (user?.id) {
        await updatePrivacySettings(user.id, {
          enable_scan_alerts: enableAlerts,
          enable_ice_scan_alerts: enableAlerts,
        });
      }

      await refreshUser();
      setInitialSelectedIceId(selectedIceId);
      setInitialEnableAlerts(enableAlerts);
      setSavedSuccess(true);

      const targetContact = contacts.find(
        (c) => c.linked_user_id === selectedIceId || c.id === selectedIceId
      );
      const contactLabel = targetContact ? targetContact.name : "None";

      toast.success(
        isUrdu ? "ترتیبات محفوظ ہو گئیں" : "Alert Routing Saved",
        {
          description: isUrdu
            ? `ہنگامی اسکین کے فوری نوٹیفکیشن ${contactLabel} کو بھیجے جائیں گے۔`
            : `Physical emergency scan alerts will be dispatched in real time to ${contactLabel}.`,
        }
      );

      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: unknown) {
      console.error("Failed to save alert routing:", err);
      toast.error(
        isUrdu ? "ترتیبات محفوظ نہیں ہو سکیں" : "Failed to Save Preferences",
        {
          description: isUrdu
            ? "براہ کرم دوبارہ کوشش کریں۔"
            : "Please check your network and try again.",
        }
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="space-y-4 rounded-xl border border-[#DCE8E5] bg-white p-5 shadow-2xs dark:border-border dark:bg-card"
      dir={isUrdu ? "rtl" : "ltr"}
    >
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#DCE8E5]/60 pb-3 dark:border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E8F7F4] text-[#0D5C4A] dark:bg-teal-950/60 dark:text-teal-300">
            <BellRing className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1A2826] dark:text-foreground flex items-center gap-2">
              <span>{isUrdu ? "ہنگامی اسکین الرٹنگ" : "Emergency Scan Alerting"}</span>
              <Badge
                variant={enableAlerts ? "default" : "secondary"}
                className={`text-[10px] px-2 py-0.5 ${
                  enableAlerts
                    ? "bg-[#0D5C4A] text-white hover:bg-[#0A8C6A] dark:bg-teal-700"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {enableAlerts
                  ? isUrdu
                    ? "فعال ہے"
                    : "Routing Active"
                  : isUrdu
                    ? "غیر فعال"
                    : "Muted"}
              </Badge>
            </h3>
            <p className="text-xs text-[#3D5450] dark:text-muted-foreground mt-0.5">
              {isUrdu
                ? "جب آپ کا میڈیکل کارڈ اسکین ہو تو فوری طور پر منتخب رابطے کے براؤزر کو الرٹ بھیجیں۔"
                : "Real-time zero-install dispatch: Notifies your primary ICE contact via their browser the instant your physical card is scanned."}
            </p>
          </div>
        </div>

        {/* Master Scan Toggle */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Switch
            id="enable-ice-alerts"
            checked={enableAlerts}
            onCheckedChange={setEnableAlerts}
            aria-label="Toggle Emergency Scan Alerts"
          />
        </div>
      </div>

      {/* Alert Routing Section */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <label
            htmlFor="ice-recipient-select"
            className="text-xs font-bold text-[#1A2826] dark:text-foreground flex items-center gap-1.5"
          >
            <Radio className="h-3.5 w-3.5 text-[#0D5C4A] dark:text-teal-400" />
            <span>{isUrdu ? "نوٹیفکیشن کسے بھیجیں:" : "Send Browser Alert To:"}</span>
          </label>
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Shield className="h-3 w-3 text-vault-teal dark:text-teal-400" />
            {isUrdu ? "خفیہ ٹاپک کے ذریعے محفوظ" : "Zero-Install Obscure Stream"}
          </span>
        </div>

        {isLoadingContacts ? (
          <div className="flex items-center gap-2 rounded-lg border border-[#DCE8E5] p-3 text-xs text-muted-foreground dark:border-border">
            <Loader2 className="h-4 w-4 animate-spin text-[#0D5C4A]" />
            <span>{isUrdu ? "رابطے لوڈ ہو رہے ہیں…" : "Loading emergency contacts…"}</span>
          </div>
        ) : contacts.length === 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
            <div className="flex items-center gap-2 font-semibold">
              <HelpCircle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>
                {isUrdu
                  ? "کوئی ہنگامی رابطہ موجود نہیں ہے"
                  : "No Emergency Contacts Configured"}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-amber-800/80 dark:text-amber-400">
              {isUrdu
                ? "برائے مہربانی پہلے ہنگامی رابطوں کے صفحے پر جا کر اپنا ICE رابطہ شامل کریں۔"
                : "Please add your primary emergency contact (e.g. Son, Daughter, Spouse) under Emergency Settings before configuring notification routing."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <select
              id="ice-recipient-select"
              value={selectedIceId}
              onChange={(e) => setSelectedIceId(e.target.value)}
              className="w-full rounded-lg border border-[#DCE8E5] bg-white px-3.5 py-2.5 text-xs font-medium text-foreground outline-none transition-all focus:border-[#0D5C4A] focus:ring-1 focus:ring-[#0D5C4A] dark:border-border dark:bg-card"
            >
              <option value="">
                {isUrdu
                  ? "کوئی نہیں (براؤزر الرٹ غیر فعال کریں)"
                  : "None (Mute real-time browser alerts)"}
              </option>
              {contacts.map((contact) => {
                const targetValue = contact.linked_user_id || contact.id || "";
                return (
                  <option key={contact.id || contact.phone} value={targetValue}>
                    {contact.name} ({contact.relation}) — {contact.phone}
                    {contact.is_primary
                      ? isUrdu
                        ? " [بنیادی رابطہ]"
                        : " [Primary Contact]"
                      : ""}
                  </option>
                );
              })}
            </select>

            <p className="text-[11px] leading-relaxed text-[#3D5450] dark:text-muted-foreground">
              {isUrdu
                ? "جب بھی کوئی ڈاکٹر یا ریسکیو اہلکار آپ کا ایمرجنسی کارڈ اسکین کرے گا، منتخب شخص کو بغیر کسی ایپ کے ان کے براؤزر میں سائرن اور الرٹ موصول ہوگا۔"
                : "When your physical emergency card is scanned, HealthVault AI posts an urgent notification directly to this person's dashboard browser session."}
            </p>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2 flex items-center justify-between">
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isLoadingContacts || !hasChanges}
            className="bg-[#0D5C4A] text-xs font-bold text-white shadow-xs hover:bg-[#0A8C6A] gap-1.5"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : savedSuccess ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span>
              {isSaving
                ? isUrdu
                  ? "محفوظ کیا جا رہا ہے…"
                  : "Saving Preferences…"
                : isUrdu
                  ? "صورت ترتیب محفوظ کریں"
                  : "Save Routing Preferences"}
            </span>
          </Button>

          {savedSuccess && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 animate-in fade-in flex items-center gap-1">
              <UserCheck className="h-3.5 w-3.5" />
              {isUrdu ? "محفوظ کر دیا گیا!" : "Preferences updated!"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
