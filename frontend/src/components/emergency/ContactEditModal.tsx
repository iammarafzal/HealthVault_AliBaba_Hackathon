"use client";

import React, { useState, useEffect, useMemo } from "react";
import { AlertCircle, Loader2, Phone, User, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/context/LanguageContext";
import type {
  EmergencyContactResponse,
  EmergencyContactCreate,
  EmergencyContactUpdate,
} from "@/types/api";

export interface ContactEditModalProps {
  isOpen: boolean;
  contact?: EmergencyContactResponse | null;
  onClose: () => void;
  onSave: (payload: EmergencyContactCreate | EmergencyContactUpdate, id?: string) => Promise<void>;
}

export default function ContactEditModal({
  isOpen,
  contact,
  onClose,
  onSave,
}: ContactEditModalProps) {
  const { locale, t } = useLanguage();
  const isUrdu = locale === "ur";

  const [name, setName] = useState("");
  const [relationKey, setRelationKey] = useState("son");
  const [customRelation, setCustomRelation] = useState("");
  const [phone, setPhone] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presetRelations = useMemo(
    () => [
      { key: "son", label: t("emergency.relationships.son", "Son") },
      { key: "daughter", label: t("emergency.relationships.daughter", "Daughter") },
      { key: "spouse", label: t("emergency.relationships.spouse", "Spouse") },
      { key: "father", label: t("emergency.relationships.father", "Father") },
      { key: "mother", label: t("emergency.relationships.mother", "Mother") },
      { key: "brother", label: t("emergency.relationships.brother", "Brother") },
      { key: "sister", label: t("emergency.relationships.sister", "Sister") },
      { key: "friend", label: t("emergency.relationships.friend", "Friend") },
      { key: "doctor", label: t("emergency.relationships.doctor", "Doctor") },
      { key: "other", label: t("emergency.relationships.other", "Other") },
    ],
    [t]
  );

  useEffect(() => {
    if (contact) {
      setName(contact.name || "");
      setPhone(contact.phone || "");
      setIsPrimary(Boolean(contact.is_primary));

      const rawRelation = (contact.relation || "").trim().toLowerCase();
      const matched = presetRelations.find(
        (p) =>
          p.key === rawRelation ||
          p.label.toLowerCase() === rawRelation ||
          (rawRelation.includes("son") && p.key === "son") ||
          (rawRelation.includes("daughter") && p.key === "daughter") ||
          (rawRelation.includes("father") && p.key === "father") ||
          (rawRelation.includes("mother") && p.key === "mother") ||
          (rawRelation.includes("brother") && p.key === "brother") ||
          (rawRelation.includes("sister") && p.key === "sister") ||
          (rawRelation.includes("spouse") && p.key === "spouse") ||
          (rawRelation.includes("friend") && p.key === "friend") ||
          (rawRelation.includes("doctor") && p.key === "doctor")
      );

      if (matched) {
        setRelationKey(matched.key);
        setCustomRelation("");
      } else {
        setRelationKey("other");
        setCustomRelation(contact.relation || "");
      }
    } else {
      setName("");
      setRelationKey("son");
      setCustomRelation("");
      setPhone("");
      setIsPrimary(false);
    }
    setError(null);
  }, [contact, isOpen, presetRelations]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setError(isUrdu ? "براہ کرم مکمل نام درج کریں۔" : "Please enter a valid full name.");
      return;
    }

    let finalRelation = "";
    if (relationKey === "other") {
      finalRelation = customRelation.trim() || (isUrdu ? "دیگر" : "Other");
    } else {
      const selected = presetRelations.find((p) => p.key === relationKey);
      finalRelation = selected ? selected.label : relationKey;
    }

    if (!finalRelation) {
      setError(isUrdu ? "براہ کرم تعلق / رشتہ درج کریں۔" : "Please specify the relationship.");
      return;
    }

    const cleanedPhone = phone.replace(/[^\d+]/g, "").trim();
    if (cleanedPhone.length < 7) {
      setError(isUrdu ? "براہ کرم درست فون نمبر درج کریں۔" : "Please enter a valid phone number.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: EmergencyContactCreate = {
        name: trimmedName,
        relation: finalRelation,
        phone: phone.trim(),
        is_primary: isPrimary,
      };
      await onSave(payload, contact?.id);
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : isUrdu
          ? "رابطہ محفوظ نہیں ہو سکا۔"
          : "Failed to save contact."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md min-h-screen h-screen w-screen overflow-y-auto">
      <div
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4"
        dir={isUrdu ? "rtl" : "ltr"}
      >
        {/* Clean Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-vault-teal/10 text-vault-teal dark:text-teal-400 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-foreground">
              {contact ? t("emergency.editContact", "Edit Contact") : t("emergency.addContact", "Add Emergency Contact")}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-2.5 text-xs text-red-700 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{t("emergency.fullName", "Full Name")}</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("emergency.fullNamePlaceholder", "Full Name")}
              required
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-vault-teal transition-all"
            />
          </div>

          {/* Relationship */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{t("emergency.relationship", "Relationship")}</span>
            </label>
            <select
              value={relationKey}
              onChange={(e) => setRelationKey(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-vault-teal transition-all"
            >
              {presetRelations.map((preset) => (
                <option key={preset.key} value={preset.key}>
                  {preset.label}
                </option>
              ))}
            </select>

            {relationKey === "other" && (
              <input
                type="text"
                value={customRelation}
                onChange={(e) => setCustomRelation(e.target.value)}
                placeholder={t("emergency.relationshipPlaceholder", "Specify relationship")}
                className="w-full mt-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-vault-teal transition-all"
              />
            )}
          </div>

          {/* Phone Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{t("emergency.phone", "Phone Number")}</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("emergency.phonePlaceholder", "+92-300-1234567")}
              required
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-vault-teal transition-all font-mono"
            />
          </div>

          {/* Primary ICE Switch */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-muted/20">
            <span className="font-semibold text-xs text-foreground block">
              {t("emergency.setAsPrimary", "Set as Primary Contact")}
            </span>
            <Switch checked={isPrimary} onCheckedChange={setIsPrimary} />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs rounded-xl"
            >
              {t("emergency.cancel", "Cancel")}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-vault-teal hover:bg-vault-teal-dark text-white font-bold text-xs rounded-xl min-w-[100px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                  <span>{t("emergency.savingContact", "Saving...")}</span>
                </>
              ) : (
                <span>{t("emergency.saveContact", "Save Contact")}</span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
