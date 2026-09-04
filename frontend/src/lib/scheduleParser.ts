import type { DosageSchedulePayload } from "@/types/api";

/** Valid time-slot keys used throughout the planner. */
export type SlotKey = "morning" | "noon" | "night";

/** Bilingual display labels for each time slot. */
export const SLOT_TIMES: Record<
  SlotKey,
  { en: string; ur: string }
> = {
  morning: { en: "8:00 AM", ur: "صبح 8:00" },
  noon: { en: "1:00 PM", ur: "دوپہر 1:00" },
  night: { en: "9:00 PM", ur: "رات 9:00" },
};

/**
 * Parsed schedule result — which slots are active and the raw frequency string.
 */
export interface ParsedSchedule {
  morning: boolean;
  noon: boolean;
  night: boolean;
  frequency: string;
}

/**
 * Parse a medication's dosage schedule into a normalised ParsedSchedule.
 *
 * Handles three input shapes:
 * 1. DosageSchedulePayload object with morning/afternoon/evening booleans
 * 2. A timing string like "morning,night" or "twice daily"
 * 3. A frequency string like "1-0-1" (morning-noon-night count)
 */
export function parseMedSchedule(
  dosageSchedule: DosageSchedulePayload | Record<string, unknown> | null | undefined,
  timing: string | null | undefined,
  frequency: string | null | undefined,
): ParsedSchedule {
  const result: ParsedSchedule = {
    morning: false,
    noon: false,
    night: false,
    frequency: frequency || "",
  };

  // Try dosage_schedule object first
  if (dosageSchedule && typeof dosageSchedule === "object") {
    const ds = dosageSchedule as Record<string, unknown>;
    result.morning = Boolean(ds.morning);
    // Map "afternoon" → noon, "evening" → night
    result.noon = Boolean(ds.afternoon);
    result.night = Boolean(ds.evening);

    // If at least one slot is set, return early
    if (result.morning || result.noon || result.night) {
      return result;
    }
  }

  // Try timing string (comma-separated slot names)
  if (timing) {
    const lower = timing.toLowerCase();
    if (lower.includes("morning")) result.morning = true;
    if (lower.includes("afternoon") || lower.includes("noon") || lower.includes("midday")) {
      result.noon = true;
    }
    if (lower.includes("evening") || lower.includes("night")) result.night = true;

    if (result.morning || result.noon || result.night) {
      return result;
    }
  }

  // Try frequency string in "1-0-1" format (morning-noon-night)
  if (frequency) {
    const parts = frequency.split(/[-–]/).map((p) => parseInt(p.trim(), 10));
    if (parts.length >= 3 && parts.every((p) => !isNaN(p))) {
      result.morning = parts[0] > 0;
      result.noon = parts[1] > 0;
      result.night = parts[2] > 0;
      return result;
    }

    // Fallback: keyword-based frequency
    const lower = frequency.toLowerCase();
    if (lower.includes("morning")) result.morning = true;
    if (lower.includes("afternoon") || lower.includes("noon")) result.noon = true;
    if (lower.includes("evening") || lower.includes("night")) result.night = true;
  }

  // Default: once daily → morning
  if (!result.morning && !result.noon && !result.night) {
    result.morning = true;
  }

  return result;
}

/**
 * Return the list of active slot keys for a parsed schedule.
 */
export function getSlotsForSchedule(schedule: ParsedSchedule): SlotKey[] {
  const slots: SlotKey[] = [];
  if (schedule.morning) slots.push("morning");
  if (schedule.noon) slots.push("noon");
  if (schedule.night) slots.push("night");
  return slots;
}
