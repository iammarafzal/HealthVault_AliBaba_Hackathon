import type { MedicalRecord, MedicalRecordResponse } from "@/types/api";

/**
 * Extract the most relevant display date from a medical record.
 * Priority: consultation_date > test_date > created_at
 */
export function getRecordDisplayDate(record: MedicalRecord): string | null {
  return record.consultation_date || record.test_date || record.created_at || null;
}

/**
 * Format a date string for display (e.g. "Mar 15, 2024").
 */
export function formatDisplayDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Extract a human-readable filename from a URL.
 */
export function getFilenameFromUrl(url: string): string {
  if (!url) return "Unknown";
  try {
    const decoded = decodeURIComponent(url);
    const parts = decoded.split("/");
    return parts[parts.length - 1] || "Unknown";
  } catch {
    return "Unknown";
  }
}

/**
 * Resolve a file URL for preview/rendering.
 * Returns the URL as-is for remote URLs, or constructs a local API URL.
 */
export function resolveFileUrl(url: string): string {
  if (!url) return "";
  // Already an absolute URL (http/https/blob/data)
  if (/^(https?:\/\/|blob:|data:)/i.test(url)) {
    return url;
  }
  // Relative path — resolve against the API base
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

/**
 * Map a server-side MedicalRecordResponse to the frontend MedicalRecord model.
 */
export function mapServerRecord(
  server: MedicalRecordResponse
): MedicalRecord {
  return {
    id: server.id,
    user_id: server.user_id,
    document_type: server.document_type || "unknown",
    file_url: server.document_url || "",
    created_at: server.created_at,
    extracted_data: {
      diagnoses: [],
      medications: [],
      allergies: [],
      biomarkers: [],
      ...(server.extracted_data as Record<string, unknown>),
    },
    doctor_name: server.doctor_name,
    hospital_name: server.hospital_name,
    consultation_date: server.consultation_date,
    test_name: undefined,
    test_date: undefined,
    surgical_notes: [],
    follow_up_instructions: [],
  };
}
