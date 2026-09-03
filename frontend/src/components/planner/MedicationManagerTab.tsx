"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Loader2,
  Pause,
  Pill,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import {
  getAllMedications,
  toggleMedicationActive,
  addManualMedication,
} from "@/services/medicationService";
import type {
  MedicationDetailResponse,
  MedicationGroupResponse,
} from "@/types/api";

export default function MedicationManagerTab() {
  const { locale, t } = useLanguage();
  const [groups, setGroups] = useState<MedicationGroupResponse[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMed, setNewMed] = useState({ name: "", dosage: "", frequency: "" });
  const [isSaving, setIsSaving] = useState(false);

  const fetchMeds = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAllMedications();
      setGroups(data.groups);
      setTotalCount(data.total_medications);
      setActiveCount(data.active_count);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load medications");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeds();
  }, [fetchMeds]);

  const handleToggle = async (medId: string, newState: boolean) => {
    try {
      await toggleMedicationActive(medId, newState);
      // Optimistic local update
      setGroups((prev) =>
        prev.map((g) => ({
          ...g,
          medications: g.medications.map((m) =>
            m.id === medId ? { ...m, is_active: newState } : m
          ),
        }))
      );
      setActiveCount((c) => c + (newState ? 1 : -1));
    } catch {
      // Revert on failure
      fetchMeds();
    }
  };

  const handleAddManual = async () => {
    if (!newMed.name.trim()) return;
    setIsSaving(true);
    try {
      await addManualMedication({
        name: newMed.name.trim(),
        dosage: newMed.dosage.trim(),
        frequency: newMed.frequency.trim(),
        is_active: true,
      });
      setNewMed({ name: "", dosage: "", frequency: "" });
      setShowAddForm(false);
      fetchMeds();
    } catch {
      // Error will be shown on next fetch
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(locale === "ur" ? "ur-PK" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const pausedCount = totalCount - activeCount;

  return (
    <div className="space-y-5">
      {/* ── Stats Bar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-xl border border-vault-border bg-card px-3.5 py-2 shadow-xs dark:border-border">
            <Pill className="h-4 w-4 text-vault-teal" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("planner.totalMeds")}
              </p>
              <p className="text-xs font-bold text-foreground">{totalCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 shadow-xs dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <Check className="h-4 w-4 text-emerald-600" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("planner.activeMeds")}
              </p>
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                {activeCount}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-vault-border bg-card px-3.5 py-2 shadow-xs dark:border-border">
            <Pause className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("planner.pausedMeds")}
              </p>
              <p className="text-xs font-bold text-foreground">{pausedCount}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs font-bold"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? (
              <>
                <X className="mr-1.5 h-3.5 w-3.5" />
                {t("planner.cancel")}
              </>
            ) : (
              <>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {t("planner.addMedicine")}
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-vault-teal"
            onClick={fetchMeds}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* ── Manual Add Form ── */}
      {showAddForm && (
        <Card className="border border-vault-teal/30 bg-vault-light/30 dark:border-teal-500/30 dark:bg-card">
          <CardContent className="space-y-3 p-4">
            <p className="text-xs font-bold text-foreground">
              {t("planner.addMedicine")}
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              <Input
                placeholder={t("planner.medicineNamePlaceholder")}
                value={newMed.name}
                onChange={(e) =>
                  setNewMed((p) => ({ ...p, name: e.target.value }))
                }
                className="h-9 text-xs"
              />
              <Input
                placeholder={t("planner.dosagePlaceholder")}
                value={newMed.dosage}
                onChange={(e) =>
                  setNewMed((p) => ({ ...p, dosage: e.target.value }))
                }
                className="h-9 text-xs"
              />
              <Input
                placeholder={t("planner.frequencyPlaceholder")}
                value={newMed.frequency}
                onChange={(e) =>
                  setNewMed((p) => ({ ...p, frequency: e.target.value }))
                }
                className="h-9 text-xs"
              />
            </div>
            <Button
              size="sm"
              className="h-8 bg-vault-teal text-white text-xs font-bold hover:bg-vault-active"
              onClick={handleAddManual}
              disabled={!newMed.name.trim() || isSaving}
            >
              {isSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {t("planner.save")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Loading State ── */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border border-vault-border dark:border-border">
              <CardContent className="p-4">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/40 dark:bg-red-950/20">
          <p className="text-sm font-semibold text-red-700">
            Error: {error}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 text-xs"
            onClick={fetchMeds}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            {t("planner.retry")}
          </Button>
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-vault-border bg-card py-12 text-center dark:border-border">
          <Pill className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-semibold text-foreground">
            {t("planner.noMedsFound")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("planner.noMedsSub")}
          </p>
        </div>
      ) : (
        /* ── Medication Groups ── */
        <div className="space-y-4">
          {groups.map((group, gi) => (
            <div key={group.record_id ?? `manual-${gi}`} className="space-y-2">
              {/* Group Header */}
              <div className="flex items-center gap-2">
                <div className="flex h-6 items-center rounded-md bg-vault-light px-2 text-[10px] font-bold text-vault-teal dark:bg-vault-dark dark:text-teal-300">
                  {group.record_id
                    ? `${t("planner.fromPrescription")} ${formatDate(group.prescription_date)}`
                    : t("planner.manualEntry")}
                </div>
                {group.doctor_name && (
                  <span className="text-[10px] text-muted-foreground">
                    Dr. {group.doctor_name}
                  </span>
                )}
              </div>

              {/* Medication Rows */}
              <div className="space-y-2">
                {group.medications.map((med) => (
                  <MedicationRow
                    key={med.id}
                    med={med}
                    locale={locale}
                    onToggle={handleToggle}
                    t={t}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Individual Medication Row ──────────────────────────────────── */

interface MedicationRowProps {
  med: MedicationDetailResponse;
  locale: "en" | "ur";
  onToggle: (id: string, newState: boolean) => void;
  t: (key: string, fallback?: string) => string;
}

function MedicationRow({ med, locale, onToggle, t }: MedicationRowProps) {
  const displayInstruction =
    locale === "ur"
      ? med.instructions_ur || med.instructions_en || ""
      : med.instructions_en || med.instructions_ur || "";

  return (
    <Card
      className={cn(
        "border transition-all duration-200 shadow-xs",
        med.is_active
          ? "border-vault-border bg-card dark:border-border"
          : "border-vault-border bg-muted/30 opacity-60 dark:border-border"
      )}
    >
      <CardContent className="flex items-center gap-3 p-3.5">
        {/* Status Icon */}
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
            med.is_active
              ? "bg-vault-light text-vault-teal dark:bg-vault-dark dark:text-vault-light"
              : "bg-muted text-muted-foreground"
          )}
        >
          <Pill className="h-4.5 w-4.5" />
        </div>

        {/* Medication Info */}
        <div className="flex-1 space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-foreground">{med.name}</span>
            {med.dosage && (
              <span className="rounded bg-vault-light px-1.5 py-0.5 text-[10px] font-semibold text-vault-teal dark:bg-muted dark:text-foreground">
                {med.dosage}
              </span>
            )}
            {med.frequency && (
              <span className="text-[10px] text-muted-foreground">
                {med.frequency}
              </span>
            )}
          </div>
          {displayInstruction && (
            <p
              className={cn(
                "text-xs text-muted-foreground",
                locale === "ur" && "font-medium text-vault-teal dark:text-teal-400"
              )}
              dir={locale === "ur" ? "rtl" : "ltr"}
            >
              {displayInstruction}
            </p>
          )}
        </div>

        {/* Toggle + Badge */}
        <div className="flex items-center gap-2.5">
          <Badge
            variant={med.is_active ? "default" : "secondary"}
            className={cn(
              "text-[10px] font-bold",
              med.is_active
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                : "bg-muted text-muted-foreground"
            )}
          >
            {med.is_active ? t("planner.active") : t("planner.paused")}
          </Badge>
          <Switch
            checked={med.is_active}
            onCheckedChange={(checked) => onToggle(med.id, checked)}
            className={cn(
              med.is_active && "data-[state=checked]:bg-vault-teal"
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
