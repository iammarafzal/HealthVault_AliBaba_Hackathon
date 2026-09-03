"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  AlertCircle,
  AlertOctagon,
  Check,
  FileText,
  Heart,
  Loader2,
  Phone,
  Pill,
  Save,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import type { PrivacySettingsResponse, PrivacySettingsUpdate } from "@/types/api";

export interface EmergencyDataConfigCardProps {
  privacySettings: PrivacySettingsResponse;
  onSave: (updated: PrivacySettingsUpdate) => Promise<void>;
  onDraftChange?: (draft: PrivacySettingsResponse) => void;
  isLoading?: boolean;
  className?: string;
}

export default function EmergencyDataConfigCard({
  privacySettings,
  onSave,
  onDraftChange,
  isLoading = false,
  className = "",
}: EmergencyDataConfigCardProps) {
  const { isUrdu, t } = useLanguage();

  const [localSettings, setLocalSettings] = useState<PrivacySettingsResponse>(privacySettings);
  const [notesInput, setNotesInput] = useState<string>(privacySettings.emergency_notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setLocalSettings(privacySettings);
    setNotesInput(privacySettings.emergency_notes || "");
  }, [privacySettings]);

  // Check if any toggle or directive notes have changed from incoming saved settings
  const initialNotes = (privacySettings.emergency_notes || "").trim();
  const currentNotes = (notesInput || "").trim();
  const hasNotesChanged = initialNotes !== currentNotes;

  const hasTogglesChanged =
    Boolean(localSettings.show_blood_group) !== Boolean(privacySettings.show_blood_group) ||
    Boolean(localSettings.show_allergies) !== Boolean(privacySettings.show_allergies) ||
    Boolean(localSettings.show_active_meds) !== Boolean(privacySettings.show_active_meds) ||
    Boolean(localSettings.show_chronic_conditions) !== Boolean(privacySettings.show_chronic_conditions) ||
    Boolean(localSettings.show_emergency_contacts) !== Boolean(privacySettings.show_emergency_contacts) ||
    Boolean(localSettings.show_emergency_notes) !== Boolean(privacySettings.show_emergency_notes);

  const hasChanges = hasTogglesChanged || hasNotesChanged;

  const handleToggle = (key: keyof PrivacySettingsResponse) => {
    const updated = {
      ...localSettings,
      [key]: !localSettings[key],
    };
    setLocalSettings(updated);
    if (onDraftChange) {
      onDraftChange({ ...updated, emergency_notes: notesInput });
    }
  };

  const sanitizeInput = (text: string): string => {
    let sanitized = text.replace(/[\r\n\t]+/g, " ");
    if (sanitized.length > 250) {
      sanitized = sanitized.slice(0, 250);
    }
    return sanitized;
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const rawVal = e.target.value;
    const sanitized = sanitizeInput(rawVal);
    setNotesInput(sanitized);

    if (onDraftChange) {
      onDraftChange({ ...localSettings, emergency_notes: sanitized });
    }

    if (rawVal.length > 250) {
      setValidationError(
        isUrdu
          ? "ایمرجنسی نوٹ 250 حروف سے زیادہ نہیں ہو سکتا۔"
          : "Emergency directive must not exceed 250 characters."
      );
    } else {
      setValidationError(null);
    }
  };

  const handleNotesBlur = () => {
    const cleaned = notesInput.replace(/\s{2,}/g, " ").trim();
    setNotesInput(cleaned);
    if (onDraftChange) {
      onDraftChange({ ...localSettings, emergency_notes: cleaned });
    }
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    const cleanedNotes = notesInput.replace(/\s{2,}/g, " ").trim();
    if (cleanedNotes.length > 250) {
      setValidationError(
        isUrdu
          ? "ایمرجنسی نوٹ 250 حروف سے زیادہ نہیں ہو سکتا۔"
          : "Emergency directive must not exceed 250 characters."
      );
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);
    try {
      const payload: PrivacySettingsUpdate = {
        show_blood_group: localSettings.show_blood_group,
        show_allergies: localSettings.show_allergies,
        show_active_meds: localSettings.show_active_meds,
        show_chronic_conditions: localSettings.show_chronic_conditions,
        show_emergency_contacts: localSettings.show_emergency_contacts,
        show_emergency_notes: localSettings.show_emergency_notes,
        emergency_notes: cleanedNotes || null,
      };

      await onSave(payload);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      setValidationError(
        err instanceof Error ? err.message : isUrdu ? "ترجیحات محفوظ کرنے میں خرابی واقع ہوئی۔" : "Failed to save emergency preferences."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const charCount = notesInput.length;
  const isOverLimit = charCount > 250;
  const isButtonDisabled = isLoading || isSubmitting || isOverLimit || !hasChanges;

  const toggleItems = [
    {
      key: "show_blood_group" as keyof PrivacySettingsResponse,
      label: t("emergency.bloodGroup", "Blood Group & Rh Factor"),
      icon: Heart,
      iconColor: "text-red-500",
      bgColor: "bg-red-500/10 dark:bg-red-950/40",
    },
    {
      key: "show_allergies" as keyof PrivacySettingsResponse,
      label: t("emergency.allergies", "Severe Drug & Food Allergies"),
      icon: AlertOctagon,
      iconColor: "text-amber-500",
      bgColor: "bg-amber-500/10 dark:bg-amber-950/40",
    },
    {
      key: "show_active_meds" as keyof PrivacySettingsResponse,
      label: t("emergency.activeMeds", "Current Active Medications"),
      icon: Pill,
      iconColor: "text-blue-500",
      bgColor: "bg-blue-500/10 dark:bg-blue-950/40",
    },
    {
      key: "show_chronic_conditions" as keyof PrivacySettingsResponse,
      label: t("emergency.chronicConditions", "Chronic Health Conditions"),
      icon: Activity,
      iconColor: "text-purple-500",
      bgColor: "bg-purple-500/10 dark:bg-purple-950/40",
    },
    {
      key: "show_emergency_contacts" as keyof PrivacySettingsResponse,
      label: t("emergency.emergencyContacts", "ICE Emergency Contacts"),
      icon: Phone,
      iconColor: "text-emerald-500",
      bgColor: "bg-emerald-500/10 dark:bg-emerald-950/40",
    },
    {
      key: "show_emergency_notes" as keyof PrivacySettingsResponse,
      label: t("emergency.emergencyNotes", "Short Emergency Directive / Note"),
      icon: FileText,
      iconColor: "text-teal-600 dark:text-teal-400",
      bgColor: "bg-teal-500/10 dark:bg-teal-950/40",
    },
  ];

  return (
    <Card className={cn("border-border bg-card shadow-xs overflow-hidden", className)} dir={isUrdu ? "rtl" : "ltr"}>
      <CardHeader className="pb-3.5 border-b border-border/50">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-vault-teal dark:text-teal-400 shrink-0" />
            {t("emergency.fieldVisibilityTitle", "Field Visibility Toggles")}
          </CardTitle>
          <Badge
            variant="outline"
            className="text-[10px] sm:text-xs font-semibold text-vault-teal border-vault-teal/30 bg-vault-teal/5 dark:text-teal-300"
          >
            {t("emergency.zeroLeakageBadge", "Zero-Leakage Field Controls")}
          </Badge>
        </div>
        <CardDescription className="text-xs sm:text-sm">
          {t("emergency.fieldVisibilitySub", "Select which medical fields are shared with first responders.")}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5 pt-4">
        {/* ═══ High-Contrast Single-Line Toggles List ═══ */}
        <div className="grid grid-cols-1 gap-2.5">
          {toggleItems.map(({ key, label, icon: Icon, iconColor, bgColor }) => {
            const isChecked = Boolean(localSettings[key]);
            return (
              <div
                key={key}
                onClick={() => handleToggle(key)}
                className={cn(
                  "flex items-center justify-between p-3 sm:p-3.5 rounded-xl border transition-all duration-200 cursor-pointer select-none",
                  isChecked
                    ? "border-vault-teal/40 bg-vault-light/30 hover:bg-vault-light/50 dark:border-teal-500/30 dark:bg-vault-dark/40 dark:hover:bg-vault-dark/60 shadow-2xs"
                    : "border-border/60 bg-muted/20 hover:bg-muted/40 opacity-80 hover:opacity-100"
                )}
              >
                <div className="flex items-center gap-3 font-medium text-xs sm:text-sm text-foreground min-w-0">
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg shrink-0 transition-colors", bgColor)}>
                    <Icon className={cn("h-4 w-4 shrink-0", iconColor)} />
                  </div>
                  <span className={cn("font-semibold truncate", isChecked ? "text-foreground" : "text-muted-foreground")}>
                    {label}
                  </span>
                </div>
                <div className="shrink-0 flex items-center" onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={isChecked}
                    onCheckedChange={() => handleToggle(key)}
                    disabled={isLoading || isSubmitting}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* ═══ Short Emergency Directives Input ═══ */}
        <div className="space-y-2.5 pt-3.5 border-t border-border/60">
          <div className="flex items-center justify-between">
            <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span>{t("emergency.notesSectionTitle", "Short Emergency Directive")}</span>
            </h4>
            <span
              dir="ltr"
              className={cn(
                "text-[11px] font-mono font-bold px-2 py-0.5 rounded transition-colors",
                isOverLimit
                  ? "bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30"
                  : charCount > 200
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {charCount} / 250
            </span>
          </div>

          <div className="space-y-1.5">
            <textarea
              value={notesInput}
              onChange={handleNotesChange}
              onBlur={handleNotesBlur}
              disabled={isLoading || isSubmitting || !localSettings.show_emergency_notes}
              rows={2}
              maxLength={250}
              placeholder={t(
                "emergency.notesPlaceholder",
                "e.g., Carries EpiPen in bag. Pacemaker implanted."
              )}
              className={cn(
                "w-full rounded-xl border p-3 text-xs sm:text-sm text-foreground bg-background placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-vault-teal transition-all resize-none",
                !localSettings.show_emergency_notes
                  ? "opacity-50 cursor-not-allowed bg-muted/40"
                  : "border-border hover:border-border/80"
              )}
            />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {t(
                "emergency.notesHelper",
                "Max 250 characters. Multi-line text is automatically formatted into a single directive."
              )}
            </p>
          </div>

          {validationError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 text-xs text-red-700 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <Check className="h-4 w-4 shrink-0" />
              <span>{t("emergency.saveSuccess", "Emergency preferences updated successfully.")}</span>
            </div>
          )}
        </div>

        {/* ═══ Save Button (Disabled by default, enabled only when changes exist) ═══ */}
        <div className="pt-1">
          <Button
            onClick={handleSave}
            disabled={isButtonDisabled}
            className={cn(
              "w-full font-bold text-xs sm:text-sm h-10 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2",
              isButtonDisabled
                ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60 hover:bg-muted border border-border"
                : "bg-vault-teal hover:bg-vault-teal-dark text-white shadow-sm cursor-pointer"
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t("emergency.savingPreferences", "Saving Preferences...")}</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>{t("emergency.savePreferences", "Save Emergency Preferences")}</span>
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
