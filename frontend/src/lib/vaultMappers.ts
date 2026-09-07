/**
 * HealthVault AI — Vault Record Mappers
 * Pure, defensive hydration layer that maps raw backend payloads
 * (GET /vault/records/{user_id} and POST /vault/upload-and-extract)
 * into the MedicalRecord view model consumed by the vault UI.
 *
 * No mock data, no static fallbacks — every value originates from the API.
 */

import type {
  BiomarkerItem,
  ExtractedEntities,
  ExtractionResponse,
  MedicalRecord,
  MedicalRecordResponse,
  MedicationItem,
} from "@/types/api";
import { getApiBaseUrl } from "@/services/apiClient";

/* ── Primitive guards ───────────────────────────────────────── */

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function asStringArray(value: unknown): string[] {
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asString(item))
    .filter((item) => item.length > 0);
}

/* ── Entity parsers ─────────────────────────────────────────── */

/** Parse medications into the UI view model (name, dosage, frequency, Urdu). */
export function parseMedications(raw: unknown): MedicationItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item): MedicationItem | null => {
      if (!item || typeof item !== "object") return null;
      const med = item as Record<string, unknown>;
      const name = asString(med.name);
      if (!name) return null;
      const urdu =
        asString(med.instructions_ur) || asString(med.urdu_instructions);
      return {
        name,
        dosage: asString(med.dosage),
        frequency: asString(med.frequency),
        urdu_instructions: urdu || undefined,
      };
    })
    .filter((med): med is MedicationItem => med !== null);
}

/** Flatten allergy entries (objects or plain strings) into allergen labels. */
export function parseAllergies(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item): string => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        return asString((item as Record<string, unknown>).allergen);
      }
      return "";
    })
    .filter((label) => label.length > 0);
}

function normalizeFlag(
  rawFlag: string,
  value: number,
  refMin?: number,
  refMax?: number
): BiomarkerItem["flag"] {
  const lowered = rawFlag.toLowerCase();
  if (lowered === "high" || lowered === "low" || lowered === "normal") {
    return lowered;
  }
  // Derive the flag from the reference range when the LLM omits status
  if (refMax !== undefined && value > refMax) return "high";
  if (refMin !== undefined && value < refMin) return "low";
  return "normal";
}

/** Parse lab biomarkers into the UI view model (analyte, value, range, flag). */
export function parseBiomarkers(raw: unknown): BiomarkerItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item): BiomarkerItem | null => {
      if (!item || typeof item !== "object") return null;
      const bio = item as Record<string, unknown>;
      const analyteName =
        asString(bio.analyte_name) || asString(bio.biomarker_name);
      const value = asNumber(bio.value);
      if (!analyteName || value === undefined) return null;

      const refMin = asNumber(bio.ref_min ?? bio.reference_min);
      const refMax = asNumber(bio.ref_max ?? bio.reference_max);
      const flag = normalizeFlag(
        asString(bio.flag ?? bio.status),
        value,
        refMin,
        refMax
      );

      return {
        analyte_name: analyteName,
        value,
        unit: asString(bio.unit),
        ref_min: refMin,
        ref_max: refMax,
        flag,
      };
    })
    .filter((bio): bio is BiomarkerItem => bio !== null);
}

/** Build the full ExtractedEntities view model from a raw extracted_data blob. */
export function parseExtractedData(
  raw: Record<string, unknown> | null | undefined,
  rawOcrText?: string
): ExtractedEntities {
  const ed = raw ?? {};
  const biomarkers = parseBiomarkers(ed.biomarkers ?? ed.lab_biomarkers);

  return {
    diagnoses: asStringArray(ed.diagnoses),
    medications: parseMedications(ed.medications),
    allergies: parseAllergies(ed.allergies),
    biomarkers,
    raw_text: asString(ed.raw_text) || rawOcrText || undefined,
  };
}

/* ── Record mappers ─────────────────────────────────────────── */

/** Map a historical record (GET /vault/records/{user_id}) into the view model. */
export function mapServerRecord(r: MedicalRecordResponse): MedicalRecord {
  const ed = (r.extracted_data || {}) as Record<string, unknown>;
  const rawTarget = r.signed_url || r.document_url;
  return {
    id: r.id,
    user_id: r.user_id,
    document_type: r.document_type,
    file_url: resolveFileUrl(rawTarget),
    signed_url: r.signed_url,
    document_url: r.document_url,
    created_at: r.created_at,
    extracted_data: parseExtractedData(ed, r.raw_ocr_text),
    doctor_name: r.doctor_name || asString(ed.doctor_name) || undefined,
    hospital_name: r.hospital_name || asString(ed.hospital_name) || undefined,
    consultation_date: r.consultation_date || asString(ed.consultation_date) || undefined,
    test_name: asString(ed.test_name) || undefined,
    test_date: asString(ed.test_date) || undefined,
    surgical_notes: asStringArray(ed.surgical_notes),
    follow_up_instructions: asStringArray(
      ed.follow_up_instructions ?? ed.clinical_notes
    ),
  };
}

/** Map an upload-and-extract response into the view model for instant prepend. */
export function mapExtractionToRecord(
  resp: ExtractionResponse,
  userId: string,
  localPreviewUrl?: string
): MedicalRecord {
  const entities: ExtractedEntities = {
    diagnoses: asStringArray(resp.diagnoses),
    medications: parseMedications(resp.medications),
    allergies: parseAllergies(resp.allergies),
    biomarkers: parseBiomarkers(resp.biomarkers),
    raw_text: resp.raw_ocr_text || undefined,
  };

  return {
    id: resp.record_id,
    user_id: userId,
    document_type: resp.document_type,
    file_url: resp.document_url
      ? resolveFileUrl(resp.document_url)
      : localPreviewUrl ?? "",
    created_at: new Date().toISOString(),
    extracted_data: entities,
    doctor_name: resp.doctor_name,
    hospital_name: resp.hospital_name,
    consultation_date: resp.consultation_date,
    test_name: resp.test_name,
    test_date: resp.test_date,
    surgical_notes: asStringArray(resp.surgical_notes),
    follow_up_instructions: asStringArray(resp.follow_up_instructions),
  };
}

/* ── File URL helpers ───────────────────────────────────────── */

/** Resolve a backend document_url into a browser-loadable URL. */
export function resolveFileUrl(fileUrl?: string): string {
  if (!fileUrl) return "";
  if (/^https?:\/\//i.test(fileUrl) || fileUrl.startsWith("blob:")) {
    return fileUrl;
  }
  const apiBase = getApiBaseUrl();
  const origin = apiBase.replace(/\/api\/v1\/?$/, "");
  if (fileUrl.startsWith("/api/v1/")) {
    return `${origin}${fileUrl}`;
  }
  if (fileUrl.startsWith("api/v1/")) {
    return `${origin}/${fileUrl}`;
  }
  const cleanPath = fileUrl.replace(/^uploads\//, "/uploads/");
  return `${origin}${cleanPath.startsWith("/") ? "" : "/"}${cleanPath}`;
}

/** Derive a human-friendly filename from a storage URL. */
export function getFilenameFromUrl(fileUrl?: string): string {
  if (!fileUrl) return "";
  try {
    const path = fileUrl.startsWith("blob:")
      ? ""
      : new URL(fileUrl).pathname;
    const segment = decodeURIComponent(path.split("/").pop() || "");
    // Storage names are prefixed with a UUID: <uuid>_<original_name>
    return segment.replace(/^[0-9a-f]{36}_/i, "") || "";
  } catch {
    return "";
  }
}

/* ── Display helpers ────────────────────────────────────────── */

/** Best-effort display date: consultation date, test date, or created_at. */
export function getRecordDisplayDate(record: MedicalRecord): string | undefined {
  return record.consultation_date || record.test_date || record.created_at;
}

export function formatDisplayDate(iso?: string): string {
  if (!iso) return "";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
