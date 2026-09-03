"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  Loader2,
  Moon,
  Pause,
  Pencil,
  Pill,
  Plus,
  RefreshCw,
  Sun,
  Sunrise,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/components/ui/toast";
import {
  getAllMedications,
  toggleMedicationActive,
  addManualMedication,
  updateManualMedication,
  deleteManualMedication,
} from "@/services/medicationService";
import type {
  MedicationDetailResponse,
  MedicationGroupResponse,
} from "@/types/api";

type SlotOption = "morning" | "afternoon" | "night";

export default function MedicationManagerTab() {
  const { locale, t, isUrdu } = useLanguage();
  const { toast } = useToast();

  const [groups, setGroups] = useState<MedicationGroupResponse[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState("");
  const [addDosage, setAddDosage] = useState("");
  const [addInstructions, setAddInstructions] = useState("");
  const [addSlots, setAddSlots] = useState<SlotOption[]>(["morning"]);
  const [isAdding, setIsAdding] = useState(false);

  // Edit modal/dialog state
  const [editingMed, setEditingMed] = useState<MedicationDetailResponse | null>(null);
  const [editName, setEditName] = useState("");
  const [editDosage, setEditDosage] = useState("");
  const [editInstructions, setEditInstructions] = useState("");
  const [editSlots, setEditSlots] = useState<SlotOption[]>(["morning"]);
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete confirm state
  const [deletingMed, setDeletingMed] = useState<MedicationDetailResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Broadcast helper
  const notifyBroadcast = () => {
    if (typeof window !== "undefined" && typeof BroadcastChannel !== "undefined") {
      try {
        const ch = new BroadcastChannel("hv_dose_updates");
        ch.postMessage({ type: "MEDS_UPDATED" });
        ch.close();
      } catch {
        // ignore
      }
    }
  };

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
      notifyBroadcast();
    } catch {
      fetchMeds();
    }
  };

  const toggleSlot = (
    currentSlots: SlotOption[],
    setSlots: React.Dispatch<React.SetStateAction<SlotOption[]>>,
    slot: SlotOption
  ) => {
    if (currentSlots.includes(slot)) {
      if (currentSlots.length === 1) return; // Must keep at least 1 slot
      setSlots(currentSlots.filter((s) => s !== slot));
    } else {
      setSlots([...currentSlots, slot]);
    }
  };

  // Add Manual Med
  const handleAddManual = async () => {
    if (!addName.trim()) return;
    if (addSlots.length === 0) return;

    setIsAdding(true);
    try {
      await addManualMedication({
        name: addName.trim(),
        dosage: addDosage.trim(),
        instructions_en: addInstructions.trim() || undefined,
        instructions_ur: isUrdu ? addInstructions.trim() : undefined,
        time_slots: addSlots,
        is_active: true,
      });

      toast({
        title: t("planner.medSavedToast", "Medication saved successfully."),
        variant: "success",
      });

      setAddName("");
      setAddDosage("");
      setAddInstructions("");
      setAddSlots(["morning"]);
      setShowAddForm(false);
      await fetchMeds();
      notifyBroadcast();
    } catch (e) {
      console.error("Failed to add manual medication:", e);
      toast({
        title: "Failed to add medication",
        description: e instanceof Error ? e.message : undefined,
        variant: "error",
      });
    } finally {
      setIsAdding(false);
    }
  };

  // Start Edit
  const handleStartEdit = (med: MedicationDetailResponse) => {
    setEditingMed(med);
    setEditName(med.name);
    setEditDosage(med.dosage || "");
    setEditInstructions(med.instructions_en || med.instructions_ur || "");

    const slots: SlotOption[] = [];
    if (med.time_slots && med.time_slots.length > 0) {
      med.time_slots.forEach((s) => {
        const l = s.toLowerCase();
        if (l === "morning") slots.push("morning");
        else if (l === "afternoon" || l === "noon") slots.push("afternoon");
        else if (l === "night" || l === "evening") slots.push("night");
      });
    }
    setEditSlots(slots.length > 0 ? Array.from(new Set(slots)) : ["morning"]);
  };

  // Save Edit
  const handleSaveEdit = async () => {
    if (!editingMed || !editName.trim()) return;
    if (editSlots.length === 0) return;

    setIsUpdating(true);
    try {
      await updateManualMedication(editingMed.id, {
        name: editName.trim(),
        dosage: editDosage.trim(),
        instructions_en: editInstructions.trim() || undefined,
        instructions_ur: isUrdu ? editInstructions.trim() : undefined,
        time_slots: editSlots,
      });

      toast({
        title: t("planner.medSavedToast", "Medication saved successfully."),
        variant: "success",
      });

      // Optimistic update
      setGroups((prev) =>
        prev.map((g) => ({
          ...g,
          medications: g.medications.map((m) =>
            m.id === editingMed.id
              ? {
                  ...m,
                  name: editName.trim(),
                  dosage: editDosage.trim(),
                  instructions_en: editInstructions.trim(),
                  time_slots: editSlots,
                }
              : m
          ),
        }))
      );

      setEditingMed(null);
      notifyBroadcast();
    } catch (e) {
      console.error("Failed to update medication:", e);
      toast({
        title: "Failed to update medication",
        description: e instanceof Error ? e.message : undefined,
        variant: "error",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete
  const handleConfirmDelete = async () => {
    if (!deletingMed) return;

    setIsDeleting(true);
    try {
      await deleteManualMedication(deletingMed.id);

      toast({
        title: t("planner.medDeletedToast", "Medication deleted."),
        variant: "success",
      });

      // Optimistic update
      setGroups((prev) =>
        prev
          .map((g) => ({
            ...g,
            medications: g.medications.filter((m) => m.id !== deletingMed.id),
          }))
          .filter((g) => g.medications.length > 0)
      );

      setTotalCount((c) => Math.max(0, c - 1));
      if (deletingMed.is_active) {
        setActiveCount((c) => Math.max(0, c - 1));
      }

      setDeletingMed(null);
      notifyBroadcast();
    } catch (e) {
      console.error("Failed to delete medication:", e);
      toast({
        title: "Failed to delete medication",
        description: e instanceof Error ? e.message : undefined,
        variant: "error",
      });
    } finally {
      setIsDeleting(false);
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
        <div className="flex items-center gap-3">
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

      {/* ── Redesigned "Add Medicine" Form Container ── */}
      {showAddForm && (
        <Card className="border border-vault-teal/40 bg-vault-light/20 dark:border-teal-500/30 dark:bg-card shadow-sm animate-in fade-in duration-150">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-vault-teal text-white">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-foreground">
                  {t("planner.addMedicine")}
                </h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowAddForm(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Inputs: Name, Dosage, Instructions */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                  {isUrdu ? "دوا کا نام *" : "Medicine Name *"}
                </label>
                <Input
                  placeholder={t("planner.medicineNamePlaceholder", "e.g., Panadol Extra")}
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                  {isUrdu ? "خوراک / طاقت" : "Dosage / Strength"}
                </label>
                <Input
                  placeholder={t("planner.dosagePlaceholder", "e.g., 500mg, 1 tablet")}
                  value={addDosage}
                  onChange={(e) => setAddDosage(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                  {isUrdu ? "ہدایات / نوٹ" : "Instructions / Notes"}
                </label>
                <Input
                  placeholder={t("planner.instructionsPlaceholder", "e.g., After meals for pain")}
                  value={addInstructions}
                  onChange={(e) => setAddInstructions(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* 3-Slot Selection Checkboxes / Toggle Chips */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1.5 block">
                {t("planner.selectSlots", "Scheduled Time Slots *")}
              </label>
              <div className="flex flex-wrap gap-2.5">
                {/* Morning */}
                <button
                  type="button"
                  onClick={() => toggleSlot(addSlots, setAddSlots, "morning")}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
                    addSlots.includes("morning")
                      ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/30"
                      : "border-slate-200 dark:border-slate-800 bg-card text-muted-foreground hover:border-slate-300"
                  )}
                >
                  <Sunrise className="w-3.5 h-3.5 text-amber-500" />
                  <span>{t("planner.slotMorning", "Morning")}</span>
                  {addSlots.includes("morning") && <Check className="w-3 h-3 ml-1 text-amber-600" />}
                </button>

                {/* Afternoon */}
                <button
                  type="button"
                  onClick={() => toggleSlot(addSlots, setAddSlots, "afternoon")}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
                    addSlots.includes("afternoon")
                      ? "border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-300 ring-1 ring-orange-500/30"
                      : "border-slate-200 dark:border-slate-800 bg-card text-muted-foreground hover:border-slate-300"
                  )}
                >
                  <Sun className="w-3.5 h-3.5 text-orange-500" />
                  <span>{t("planner.slotAfternoon", "Afternoon")}</span>
                  {addSlots.includes("afternoon") && <Check className="w-3 h-3 ml-1 text-orange-600" />}
                </button>

                {/* Night */}
                <button
                  type="button"
                  onClick={() => toggleSlot(addSlots, setAddSlots, "night")}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
                    addSlots.includes("night")
                      ? "border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500/30"
                      : "border-slate-200 dark:border-slate-800 bg-card text-muted-foreground hover:border-slate-300"
                  )}
                >
                  <Moon className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{t("planner.slotNight", "Night")}</span>
                  {addSlots.includes("night") && <Check className="w-3 h-3 ml-1 text-indigo-600" />}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium"
                onClick={() => setShowAddForm(false)}
              >
                {t("planner.cancel")}
              </Button>
              <Button
                size="sm"
                className="h-8 bg-vault-teal text-white text-xs font-bold hover:bg-vault-active shadow-xs"
                onClick={handleAddManual}
                disabled={!addName.trim() || addSlots.length === 0 || isAdding}
              >
                {isAdding ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    <span>{t("planner.saving", "Saving...")}</span>
                  </>
                ) : (
                  <>
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                    <span>{t("planner.save", "Save Medicine")}</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Medication List ── */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-xl border border-vault-border bg-card animate-pulse dark:border-border"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/40 dark:bg-red-950/20">
          <p className="text-sm font-semibold text-red-700">Error: {error}</p>
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
        <div className="space-y-4">
          {groups.map((group, gi) => {
            const isManualGroup = !group.record_id;
            return (
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
                      {group.doctor_name.trim().match(/^dr\.?\s*/i)
                        ? group.doctor_name.trim()
                        : `Dr. ${group.doctor_name.trim()}`}
                    </span>
                  )}
                </div>

                {/* Medication Rows */}
                <div className="space-y-2">
                  {group.medications.map((med) => (
                    <MedicationRow
                      key={med.id}
                      med={med}
                      isManual={isManualGroup || Boolean(med.is_manual)}
                      locale={locale}
                      onToggle={handleToggle}
                      onEdit={handleStartEdit}
                      onDelete={(m) => setDeletingMed(m)}
                      t={t}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Edit Medicine Modal Dialog ── */}
      {editingMed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          dir={isUrdu ? "rtl" : "ltr"}
        >
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-vault-teal/10 text-vault-teal flex items-center justify-center shrink-0">
                  <Pencil className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {t("planner.editMedicine", "Edit Medicine")}
                </h3>
              </div>
              <button
                onClick={() => setEditingMed(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  {isUrdu ? "دوا کا نام *" : "Medicine Name *"}
                </label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  {isUrdu ? "خوراک / طاقت" : "Dosage / Strength"}
                </label>
                <Input
                  value={editDosage}
                  onChange={(e) => setEditDosage(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  {isUrdu ? "ہدایات / نوٹ" : "Instructions / Notes"}
                </label>
                <Input
                  value={editInstructions}
                  onChange={(e) => setEditInstructions(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  {t("planner.selectSlots", "Scheduled Time Slots *")}
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => toggleSlot(editSlots, setEditSlots, "morning")}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
                      editSlots.includes("morning")
                        ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/30"
                        : "border-slate-200 dark:border-slate-800 bg-card text-muted-foreground hover:border-slate-300"
                    )}
                  >
                    <Sunrise className="w-3.5 h-3.5 text-amber-500" />
                    <span>{t("planner.slotMorning", "Morning")}</span>
                    {editSlots.includes("morning") && <Check className="w-3 h-3 ml-1 text-amber-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleSlot(editSlots, setEditSlots, "afternoon")}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
                      editSlots.includes("afternoon")
                        ? "border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-300 ring-1 ring-orange-500/30"
                        : "border-slate-200 dark:border-slate-800 bg-card text-muted-foreground hover:border-slate-300"
                    )}
                  >
                    <Sun className="w-3.5 h-3.5 text-orange-500" />
                    <span>{t("planner.slotAfternoon", "Afternoon")}</span>
                    {editSlots.includes("afternoon") && <Check className="w-3 h-3 ml-1 text-orange-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleSlot(editSlots, setEditSlots, "night")}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
                      editSlots.includes("night")
                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500/30"
                        : "border-slate-200 dark:border-slate-800 bg-card text-muted-foreground hover:border-slate-300"
                    )}
                  >
                    <Moon className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{t("planner.slotNight", "Night")}</span>
                    {editSlots.includes("night") && <Check className="w-3 h-3 ml-1 text-indigo-600" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setEditingMed(null)}
                disabled={isUpdating}
              >
                {t("planner.cancel")}
              </Button>
              <Button
                size="sm"
                className="h-8 bg-vault-teal text-white text-xs font-bold hover:bg-vault-active shadow-xs"
                onClick={handleSaveEdit}
                disabled={!editName.trim() || editSlots.length === 0 || isUpdating}
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    <span>{t("planner.saving", "Saving...")}</span>
                  </>
                ) : (
                  <>
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                    <span>{t("planner.saveChanges", "Save Changes")}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Dialog ── */}
      {deletingMed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          dir={isUrdu ? "rtl" : "ltr"}
        >
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {t("planner.deleteConfirmTitle", "Delete Medication")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {deletingMed.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {t(
                "planner.deleteConfirmMsg",
                "Are you sure you want to remove this medication from your schedule?"
              )}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setDeletingMed(null)}
                disabled={isDeleting}
              >
                {t("planner.cancel")}
              </Button>
              <Button
                size="sm"
                className="h-8 bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <span>{t("planner.deleteMedicine", "Delete")}</span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Individual Medication Row ──────────────────────────────────── */

interface MedicationRowProps {
  med: MedicationDetailResponse;
  isManual: boolean;
  locale: "en" | "ur";
  onToggle: (id: string, newState: boolean) => void;
  onEdit?: (med: MedicationDetailResponse) => void;
  onDelete?: (med: MedicationDetailResponse) => void;
  t: (key: string, fallback?: string) => string;
}

function MedicationRow({
  med,
  isManual,
  locale,
  onToggle,
  onEdit,
  onDelete,
  t,
}: MedicationRowProps) {
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
        <div className="flex-1 space-y-0.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-foreground truncate">{med.name}</span>
            {med.dosage && (
              <span className="rounded bg-vault-light px-1.5 py-0.5 text-[10px] font-semibold text-vault-teal dark:bg-muted dark:text-foreground">
                {med.dosage}
              </span>
            )}
            {med.time_slots && med.time_slots.length > 0 ? (
              <div className="flex items-center gap-1">
                {med.time_slots.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {s === "morning" ? (
                      <>
                        <Sunrise className="w-2.5 h-2.5 text-amber-500" />
                        <span>{t("planner.morning", "Morning")}</span>
                      </>
                    ) : s === "afternoon" || s === "noon" ? (
                      <>
                        <Sun className="w-2.5 h-2.5 text-orange-500" />
                        <span>{t("planner.afternoon", "Afternoon")}</span>
                      </>
                    ) : (
                      <>
                        <Moon className="w-2.5 h-2.5 text-indigo-500" />
                        <span>{t("planner.night", "Night")}</span>
                      </>
                    )}
                  </span>
                ))}
              </div>
            ) : med.frequency ? (
              <span className="text-[10px] text-muted-foreground">
                {med.frequency}
              </span>
            ) : null}
          </div>

          {displayInstruction && (
            <p
              className={cn(
                "text-xs text-muted-foreground truncate",
                locale === "ur" && "font-medium text-vault-teal dark:text-teal-400"
              )}
              dir={locale === "ur" ? "rtl" : "ltr"}
            >
              {displayInstruction}
            </p>
          )}
        </div>

        {/* Actions: Edit & Delete for manual entries */}
        {isManual && (
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-vault-teal hover:bg-vault-light/60 dark:hover:bg-vault-dark"
              onClick={() => onEdit?.(med)}
              title={t("planner.editMedicine", "Edit")}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
              onClick={() => onDelete?.(med)}
              title={t("planner.deleteMedicine", "Delete")}
            >
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
            </Button>
          </div>
        )}

        {/* Toggle + Badge */}
        <div className="flex items-center gap-2.5 shrink-0">
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
