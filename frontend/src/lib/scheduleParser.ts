/**
 * HealthVault AI — Dosage Schedule Parser
 *
 * Normalises raw prescription data into a unified DosageTimingSchedule.
 * Priority:
 *   1. Explicit `dosage_schedule` JSONB object from the backend.
 *   2. Fallback parsing of `timing` / `frequency` sig strings
 *      (Pakistani prescription conventions: "1-0-1", "TDS", "شام کو", etc.)
 */

import type { DosageSchedulePayload } from "@/types/api";

/* ── Slot type ──────────────────────────────────────────────────── */

export type SlotKey = "morning" | "noon" | "night";

export interface ParsedSchedule {
  morning: boolean;
  afternoon: boolean;
  evening: boolean;
  frequency_per_day: number;
  meal_relation: string;
}

/* ── Default target times per slot ──────────────────────────────── */

export const SLOT_TIMES: Record<SlotKey, { en: string; ur: string }> = {
  morning: { en: "08:00 AM", ur: "صبح ۰۸:۰۰" },
  noon: { en: "01:30 PM", ur: "دوپہر ۰۱:۳۰" },
  night: { en: "08:30 PM", ur: "رات ۰۸:۳۰" },
};

/* ── Sig-string → schedule map ──────────────────────────────────── */

const SIG_PATTERNS: Array<{
  pattern: RegExp;
  schedule: { morning: boolean; afternoon: boolean; evening: boolean };
}> = [
  // Numeric sig: "1-0-1", "1-1-1", "0-0-1", "1-0-0", "0-1-0", "1+1+1", "1+0+1"
  {
    pattern: /^[12]\s*[-+]\s*0\s*[-+]\s*0/,
    schedule: { morning: true, afternoon: false, evening: false },
  },
  {
    pattern: /^[12]\s*[-+]\s*0\s*[-+]\s*1/,
    schedule: { morning: true, afternoon: false, evening: true },
  },
  {
    pattern: /^[12]\s*[-+]\s*1\s*[-+]\s*0/,
    schedule: { morning: true, afternoon: true, evening: false },
  },
  {
    pattern: /^[12]\s*[-+]\s*1\s*[-+]\s*1/,
    schedule: { morning: true, afternoon: true, evening: true },
  },
  {
    pattern: /^0\s*[-+]\s*0\s*[-+]\s*1/,
    schedule: { morning: false, afternoon: false, evening: true },
  },
  {
    pattern: /^0\s*[-+]\s*1\s*[-+]\s*0/,
    schedule: { morning: false, afternoon: true, evening: false },
  },
  {
    pattern: /^0\s*[-+]\s*1\s*[-+]\s*1/,
    schedule: { morning: false, afternoon: true, evening: true },
  },
  // Two-part sig: "1+1", "1+0", "0+1"
  {
    pattern: /^1\s*[-+]\s*1\s*$/,
    schedule: { morning: true, afternoon: false, evening: true },
  },
  {
    pattern: /^1\s*[-+]\s*0\s*$/,
    schedule: { morning: true, afternoon: false, evening: false },
  },
  {
    pattern: /^0\s*[-+]\s*1\s*$/,
    schedule: { morning: false, afternoon: false, evening: true },
  },
];

/* ── Keyword → schedule map ─────────────────────────────────────── */

interface KeywordEntry {
  keywords: string[];
  schedule: { morning: boolean; afternoon: boolean; evening: boolean };
}

const KEYWORD_MAP: KeywordEntry[] = [
  // English
  { keywords: ["tds", "tid", "thrice"], schedule: { morning: true, afternoon: true, evening: true } },
  { keywords: ["bd", "bid", "twice"], schedule: { morning: true, afternoon: false, evening: true } },
  { keywords: ["od morning", "morning"], schedule: { morning: true, afternoon: false, evening: false } },
  { keywords: ["od noon", "noon", "afternoon", "lunch"], schedule: { morning: false, afternoon: true, evening: false } },
  { keywords: ["od night", "night", "evening", "bedtime", "bed"], schedule: { morning: false, afternoon: false, evening: true } },
  // Urdu
  { keywords: ["تین بار", "تن بار", "tds"], schedule: { morning: true, afternoon: true, evening: true } },
  { keywords: ["دو بار", "صبح و شام"], schedule: { morning: true, afternoon: false, evening: true } },
  { keywords: ["صبح کو", "صبح"], schedule: { morning: true, afternoon: false, evening: false } },
  { keywords: ["دوپہر کو", "دوپہر"], schedule: { morning: false, afternoon: true, evening: false } },
  { keywords: ["شام کو", "رات کو", "شام", "رات"], schedule: { morning: false, afternoon: false, evening: true } },
];

/* ── Meal relation extraction ───────────────────────────────────── */

const MEAL_PATTERNS: Array<{ pattern: RegExp; value: string }> = [
  { pattern: /before\s*meal|کھانے\s*سے\s*پہلے|پہلے\s*کھانا/i, value: "before_meals" },
  { pattern: /after\s*meal|کھانے\s*کے\s*بعد|بعد\s*کھانا/i, value: "after_meals" },
  { pattern: /with\s*meal|کھانے\s*کے\s*ساتھ|کھانے\s*میں/i, value: "with_meals" },
  { pattern: /as\s*needed|ضرورت\s*کے\s*مطابق/i, value: "as_needed" },
];

function extractMealRelation(text: string): string {
  for (const { pattern, value } of MEAL_PATTERNS) {
    if (pattern.test(text)) return value;
  }
  return "unspecified";
}

/* ── Parse sig string ───────────────────────────────────────────── */

function parseSigString(text: string): { morning: boolean; afternoon: boolean; evening: boolean } | null {
  const lower = text.toLowerCase().trim();
  if (!lower) return null;

  // 1) Try numeric sig patterns
  for (const { pattern, schedule } of SIG_PATTERNS) {
    if (pattern.test(lower)) return schedule;
  }

  // 2) Try keyword matching
  for (const entry of KEYWORD_MAP) {
    for (const kw of entry.keywords) {
      if (lower.includes(kw.toLowerCase())) return entry.schedule;
    }
  }

  return null;
}

/* ── Public API ─────────────────────────────────────────────────── */

/**
 * Parse a medication's schedule from its `dosage_schedule` JSONB or
 * fallback `timing` / `frequency` strings.
 *
 * Returns a normalised ParsedSchedule that the planner can use to
 * determine which time windows a medication belongs to.
 */
export function parseMedSchedule(
  dosageSchedule: DosageSchedulePayload | Record<string, unknown> | null | undefined,
  timing: string | null | undefined,
  frequency: string | null | undefined,
): ParsedSchedule {
  // 1) Explicit dosage_schedule object
  if (dosageSchedule && typeof dosageSchedule === "object") {
    const s = dosageSchedule as Record<string, unknown>;
    const morning = Boolean(s.morning);
    const afternoon = Boolean(s.afternoon);
    const evening = Boolean(s.evening);

    // If at least one slot is explicitly set, use it
    if (morning || afternoon || evening) {
      const freq = typeof s.frequency_per_day === "number"
        ? s.frequency_per_day
        : [morning, afternoon, evening].filter(Boolean).length;
      const meal = typeof s.meal_relation === "string" ? s.meal_relation : "unspecified";
      return { morning, afternoon, evening, frequency_per_day: freq, meal_relation: meal };
    }
  }

  // 2) Fallback: parse timing string
  const combined = `${timing || ""} ${frequency || ""}`.trim();
  const parsed = parseSigString(combined);

  if (parsed) {
    const freq = [parsed.morning, parsed.afternoon, parsed.evening].filter(Boolean).length;
    return {
      ...parsed,
      frequency_per_day: freq || 1,
      meal_relation: extractMealRelation(combined),
    };
  }

  // 3) Ultimate fallback: default to morning only
  return {
    morning: true,
    afternoon: false,
    evening: false,
    frequency_per_day: 1,
    meal_relation: extractMealRelation(combined),
  };
}

/**
 * Given a ParsedSchedule, return which SlotKeys this medication belongs to.
 */
export function getSlotsForSchedule(schedule: ParsedSchedule): SlotKey[] {
  const slots: SlotKey[] = [];
  if (schedule.morning) slots.push("morning");
  if (schedule.afternoon) slots.push("noon");
  if (schedule.evening) slots.push("night");
  return slots;
}
