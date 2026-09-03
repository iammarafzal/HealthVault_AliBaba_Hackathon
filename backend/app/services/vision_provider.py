# HealthVault AI — Pluggable Multimodal Vision Provider Engine
# Direct image/PDF bytes → structured medical JSON extraction.

from __future__ import annotations

import asyncio
import base64
import json
import logging
import re
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import settings
from app.core.mock_data import MOCK_LAB_EXTRACTION, MOCK_PRESCRIPTION_EXTRACTION
from app.services.image_preprocessor import preprocess_clinical_image
from app.services.pharmacopoeia import (
    match_and_correct_brand,
    sanitize_clinical_date,
    sanitize_dosage_fractions,
    validate_sig_frequency,
)

logger = logging.getLogger("healthvault")


VISION_EXTRACTION_SYSTEM_PROMPT = """
You are HealthVault AI's medical document vision extraction engine, specialized in clinical handwriting and South Asian / Pakistani medical prescriptions, lab reports, and clinical records.
Your FIRST task is to determine whether the uploaded file is a legitimate medical document.

STEP 1 — MEDICAL DOCUMENT VALIDATION:
Evaluate whether the image/PDF represents a real medical/clinical document.
Acceptable types: prescription, lab report, ultrasound report, radiology/imaging report
(X-ray, MRI, CT scan), discharge summary, clinical note, or hospital bill/invoice.

Reject the file if it is ANY of: a selfie/portrait, landscape/scenery, meme, receipt,
screenshot of an app/website, unrelated photograph, blank page, or any non-medical content.

STEP 2 — DYNAMIC CATEGORIZATION (only if is_medical_document is true):
Classify the document into exactly ONE of these categories:
  - "prescription"         — doctor's prescription / medication order
  - "lab_report"           — pathology / blood test / biochemical analysis report
  - "ultrasound_report"    — sonography / ultrasound imaging report
  - "imaging_report"       — X-ray, MRI, CT scan radiology report
  - "discharge_summary"    — hospital discharge summary / discharge certificate
  - "clinical_note"        — doctor's clinical note / progress note / consultation note
  - "other_medical"        — any other legitimate medical document (e.g. hospital bill, insurance claim)

STEP 3 — CLINICAL & HANDWRITING EXTRACTION RULES (MANDATORY FOR PRESCRIPTIONS):
When processing prescriptions (especially Pakistani / South Asian doctor handwritten notes):
1. RECOGNIZE MIXED ENGLISH/URDU HANDWRITTEN SIGS:
   - Pakistani doctors write drug brand names in English (e.g., "Tab Solif 5mg", "Tab Femax 500mg", "Tab Neoprox 250mg", "Cap Eso 20mg", "Tab Anafortan Plus", "Syp Ulsanic") and the directions/instructions in Urdu or mixed Urdu/English script underneath (e.g., "آدھی گولی روزانہ شام کو ۵ دن", "ایک گولی شام کو", "درد کے لیے ۳ دن", "1+0+1 ۱۰ دن کھانے سے پہلے", "۲ چمچ").
2. INTERPRET SOUTH ASIAN DOSAGE NOTATIONS:
   - "1 + 1" or "1-0-1" = Morning & Night (BD / Twice Daily).
   - "1 + 1 + 1" = Morning, Afternoon, Night (TDS / Thrice Daily).
   - "1 + 0 + 1" = Morning and Night.
   - "0 + 0 + 1" or "شام کو" = Evening / Night only.
   - "0 + 1 + 0" or "دوپہر" = Afternoon only.
   - "1 + 0 + 0" or "صبح" = Morning only.
   - "آدھی گولی" = Half tablet (0.5 tab).
   - "ایک گولی" = 1 tablet (1.0 tab).
   - "۲ چمچ" or "2 چمچ" = 2 teaspoons (10ml).
   - "۳ دن" / "۵ دن" / "۱۰ دن" or circled numbers like ⑤ / ⑩ = Duration in days (e.g., 3 days, 5 days, 10 days).
   - "کھانے سے پہلے" / "AC" / "نہار منہ" = Before meals.
   - "کھانے کے بعد" / "PC" = After meals.
   - "درد کے لیے" = For pain relief.
3. NEVER DEFAULT TO "1-0-1" IF THE DOCTOR SPECIFIES DIFFERENT TIMING OR FRACTIONS (e.g. "آدھی گولی شام کو" is strictly Half Tablet Evening Only, not 1-0-1).
4. EXTRACT ALL MEDICATIONS: Extract every single listed medication on the prescription without truncation (e.g. all 6 items).
5. GENERATE NATIVE URDU AUDIO SCRIPT (audio_script_ur):
   Provide a natural, conversational, crystal-clear Urdu script designed for low-literacy text-to-speech, e.g.:
   "ٹیبلٹ سولف پانچ ملی گرام۔ روزانہ شام کو آدھی گولی پانی کے ساتھ لیں۔ یہ دوا پانچ دن تک جاری رکھیں۔"

Required JSON schema (return ONLY this JSON object, no Markdown, no prose):
{
  "is_medical_document": boolean,
  "rejection_reason": string | null,
  "detected_document_type": "prescription" | "lab_report" | "ultrasound_report" | "imaging_report" | "discharge_summary" | "clinical_note" | "other_medical" | null,
  "confidence_score": number,
  "doctor_name": string | null,
  "clinic_hospital_name": string | null,
  "consultation_date": string | null,
  "diagnoses": string[],
  "medications": [
    {
      "name": string,
      "dosage": string,
      "frequency": string,
      "timing": string,
      "fraction": "half" | "full" | "2_spoons" | "other",
      "fraction_label_en": string,
      "fraction_label_ur": string,
      "meal_context": "before_meal" | "after_meal" | "with_meal" | "unspecified",
      "meal_context_en": string,
      "meal_context_ur": string,
      "purpose_en": string | null,
      "purpose_ur": string | null,
      "duration": string | null,
      "duration_ur": string | null,
      "timing_breakdown": {
        "morning": boolean,
        "afternoon": boolean,
        "night": boolean
      },
      "instructions_en": string,
      "instructions_ur": string,
      "audio_script_ur": string,
      "is_active": boolean
    }
  ],
  "allergies": string[],
  "biomarkers": [
    {
      "analyte_name": string,
      "value": number,
      "unit": string,
      "ref_min": number | null,
      "ref_max": number | null,
      "status": "normal" | "high" | "low"
    }
  ],
  "raw_text": string
}
""".strip()


class VisionProviderError(RuntimeError):
    """Raised when a configured live vision provider cannot extract data."""


class BaseVisionProvider(ABC):
    """Abstract base contract for multimodal medical document extraction."""

    @abstractmethod
    async def extract_document_data(
        self, image_bytes: bytes, mime_type: str, document_type: str
    ) -> Dict[str, Any]:
        """Extract HealthVault structured entities from raw uploaded file bytes."""

    @staticmethod
    def _extract_json(text: str) -> Dict[str, Any]:
        if not text or not text.strip():
            return {}
        fence_match = re.search(
            r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL | re.IGNORECASE
        )
        candidate = fence_match.group(1).strip() if fence_match else text.strip()
        try:
            parsed = json.loads(candidate)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            pass
        obj_match = re.search(r"(\{.*\})", candidate, re.DOTALL)
        if obj_match:
            try:
                parsed = json.loads(obj_match.group(1))
                return parsed if isinstance(parsed, dict) else {}
            except json.JSONDecodeError:
                pass
        logger.warning("Unable to parse JSON from vision model output: %s", text[:300])
        return {}

    @staticmethod
    def _data_uri(image_bytes: bytes, mime_type: str) -> str:
        encoded = base64.b64encode(image_bytes).decode("ascii")
        return f"data:{mime_type};base64,{encoded}"

    @staticmethod
    def _normalize_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
        def as_str(value: Any) -> Optional[str]:
            if value is None:
                return None
            text = str(value).strip()
            return text or None

        def as_str_list(value: Any) -> List[str]:
            if isinstance(value, str):
                return [value.strip()] if value.strip() else []
            if isinstance(value, list):
                values: List[str] = []
                for item in value:
                    if isinstance(item, dict):
                        text = as_str(item.get("allergen") or item.get("name"))
                    else:
                        text = as_str(item)
                    if text:
                        values.append(text)
                return values
            return []

        # ── Step 1: Medical document validation gate ──
        is_medical = payload.get("is_medical_document")
        if is_medical is None:
            is_medical = True
        is_medical = bool(is_medical)

        VALID_CATEGORIES = {
            "prescription", "lab_report", "ultrasound_report",
            "imaging_report", "discharge_summary", "clinical_note", "other_medical",
        }
        detected_type = as_str(payload.get("detected_document_type"))
        if detected_type and detected_type not in VALID_CATEGORIES:
            detected_type = "other_medical"

        try:
            confidence = float(payload.get("confidence_score", 0.0))
        except (TypeError, ValueError):
            confidence = 0.0
        confidence = max(0.0, min(1.0, confidence))

        rejection_reason = as_str(payload.get("rejection_reason"))

        # ── Step 2: If non-medical, short-circuit ──
        if not is_medical:
            return {
                "is_medical_document": False,
                "rejection_reason": rejection_reason or "The uploaded file does not appear to be a medical document.",
                "detected_document_type": None,
                "confidence_score": confidence,
                "doctor_name": None,
                "clinic_hospital_name": None,
                "consultation_date": None,
                "diagnoses": [],
                "medications": [],
                "allergies": [],
                "biomarkers": [],
                "raw_text": as_str(payload.get("raw_text") or payload.get("raw_ocr_text")) or "",
            }

        # ── Step 3: Full entity extraction with Pakistani handwriting enrichment ──
        medications = []
        for item in payload.get("medications") or []:
            if not isinstance(item, dict) or not as_str(item.get("name")):
                continue

            raw_name = as_str(item.get("name")) or ""
            name, pharma_info, _ = match_and_correct_brand(raw_name)
            dosage = as_str(item.get("dosage")) or ""
            frequency = as_str(item.get("frequency")) or ""
            timing = as_str(item.get("timing")) or ""
            instr_en = as_str(item.get("instructions_en")) or ""
            instr_ur = as_str(item.get("instructions_ur")) or ""
            comb_text = f"{name} {dosage} {frequency} {timing} {instr_en} {instr_ur}".lower()

            # Fraction determination and dosage fraction protection
            raw_fraction = as_str(item.get("fraction"))
            dosage, fraction, frac_lbl_en, frac_lbl_ur = sanitize_dosage_fractions(
                dosage, f"{instr_en} {instr_ur} {comb_text}", raw_fraction
            )
            fraction_label_en = as_str(item.get("fraction_label_en")) or frac_lbl_en
            fraction_label_ur = as_str(item.get("fraction_label_ur")) or frac_lbl_ur

            # Timing breakdown and sig notation validation (e.g. 1+0+1 -> morning & night)
            tb = item.get("timing_breakdown") if isinstance(item.get("timing_breakdown"), dict) else None
            timing_map, validated_freq = validate_sig_frequency(frequency, tb, comb_text)
            morning = timing_map["morning"]
            afternoon = timing_map["afternoon"]
            night = timing_map["night"]
            if not frequency and validated_freq:
                frequency = validated_freq

            # Meal context
            raw_mc = as_str(item.get("meal_context"))
            if raw_mc in {"before_meal", "after_meal", "with_meal", "unspecified"}:
                meal_context = raw_mc
            elif any(w in comb_text for w in ["پہلے", "before", "ac", "نہار منہ", "empty stomach"]):
                meal_context = "before_meal"
            elif any(w in comb_text for w in ["بعد", "after", "pc"]):
                meal_context = "after_meal"
            else:
                meal_context = "after_meal"

            meal_context_en = as_str(item.get("meal_context_en")) or (
                "Before meals (30 mins before food)" if meal_context == "before_meal" else "After meals"
            )
            meal_context_ur = as_str(item.get("meal_context_ur")) or (
                "کھانے سے پہلے (نہار منہ)" if meal_context == "before_meal" else "کھانے کے بعد"
            )

            # Purpose and Duration
            purpose_en = as_str(item.get("purpose_en"))
            purpose_ur = as_str(item.get("purpose_ur"))
            if pharma_info:
                if not purpose_en:
                    purpose_en = pharma_info.get("default_purpose_en")
                if not purpose_ur:
                    purpose_ur = pharma_info.get("default_purpose_ur")
            if not purpose_ur and any(w in comb_text for w in ["درد", "pain", "dysmenorrhea"]):
                purpose_en = purpose_en or "For pain relief & dysmenorrhea"
                purpose_ur = "درد کے لیے (درد اور اینٹھن میں آرام)"
            elif not purpose_ur and any(w in comb_text for w in ["uti", "solif", "bladder", "پیشاب"]):
                purpose_en = purpose_en or "For urinary bladder control & UTI"
                purpose_ur = "پیشاب کے کنٹرول اور مثانے کے سکون کے لیے"
            elif not purpose_ur and any(w in comb_text for w in ["eso", "acidity", "stomach", "معدہ"]):
                purpose_en = purpose_en or "For stomach acid control & protection"
                purpose_ur = "معدے کی تیزابیت اور جلن سے بچاؤ کے لیے"

            duration = as_str(item.get("duration"))
            duration_ur = as_str(item.get("duration_ur"))
            if not duration:
                if any(w in comb_text for w in ["۵ دن", "5 days", "5 day", "⑤"]):
                    duration = "5 days"
                    duration_ur = "۵ دن"
                elif any(w in comb_text for w in ["۳ دن", "3 days", "3 day", "③"]):
                    duration = "3 days"
                    duration_ur = "۳ دن"
                elif any(w in comb_text for w in ["۱۰ دن", "10 days", "10 day", "⑩"]):
                    duration = "10 days"
                    duration_ur = "۱۰ دن"

            # Conversational Urdu audio script
            audio_script_ur = as_str(item.get("audio_script_ur"))
            if not audio_script_ur:
                med_type = "شربت" if fraction == "2_spoons" else ("کیپسول" if "cap" in name.lower() else "ٹیبلٹ")
                dose_desc = fraction_label_ur
                timing_desc = "شام کو" if (night and not morning) else ("صبح اور شام" if (morning and night) else "دن میں ایک بار")
                dur_desc = f" یہ دوا {duration_ur} تک جاری رکھیں۔" if duration_ur else ""
                audio_script_ur = f"{med_type} {name}۔ روزانہ {timing_desc} {meal_context_ur} {dose_desc} پانی کے ساتھ لیں۔{dur_desc}"

            medications.append(
                {
                    "name": name,
                    "dosage": dosage,
                    "frequency": frequency,
                    "timing": timing,
                    "fraction": fraction,
                    "fraction_label_en": fraction_label_en,
                    "fraction_label_ur": fraction_label_ur,
                    "meal_context": meal_context,
                    "meal_context_en": meal_context_en,
                    "meal_context_ur": meal_context_ur,
                    "purpose_en": purpose_en,
                    "purpose_ur": purpose_ur,
                    "duration": duration,
                    "duration_ur": duration_ur,
                    "timing_breakdown": {
                        "morning": morning,
                        "afternoon": afternoon,
                        "night": night,
                    },
                    "instructions_en": instr_en,
                    "instructions_ur": instr_ur,
                    "audio_script_ur": audio_script_ur,
                    "is_active": bool(item.get("is_active", True)),
                }
            )

        biomarkers = []
        for item in payload.get("biomarkers") or payload.get("lab_biomarkers") or []:
            if not isinstance(item, dict):
                continue
            name = as_str(item.get("analyte_name") or item.get("biomarker_name"))
            try:
                value = float(item.get("value"))
            except (TypeError, ValueError):
                continue
            status = (as_str(item.get("status") or item.get("flag")) or "normal").lower()
            if status not in {"normal", "high", "low"}:
                status = "normal"
            biomarkers.append(
                {
                    "analyte_name": name or "",
                    "value": value,
                    "unit": as_str(item.get("unit")) or "",
                    "ref_min": item.get("ref_min", item.get("reference_min")),
                    "ref_max": item.get("ref_max", item.get("reference_max")),
                    "status": status,
                }
            )

        return {
            "is_medical_document": True,
            "rejection_reason": None,
            "detected_document_type": detected_type or "prescription",
            "confidence_score": confidence or 0.95,
            "doctor_name": as_str(payload.get("doctor_name")),
            "clinic_hospital_name": as_str(
                payload.get("clinic_hospital_name") or payload.get("hospital_name")
            ),
            "consultation_date": sanitize_clinical_date(payload.get("consultation_date") or payload.get("test_date")),
            "diagnoses": as_str_list(payload.get("diagnoses")),
            "medications": medications,
            "allergies": as_str_list(payload.get("allergies")),
            "biomarkers": biomarkers,
            "raw_text": as_str(payload.get("raw_text") or payload.get("raw_ocr_text")) or "",
        }

    @staticmethod
    def _user_prompt(document_type: str) -> str:
        return (
            f"Document type hint: {document_type}. Extract the visible medical details "
            "into the exact JSON schema. If the hint conflicts with visible evidence, "
            "still preserve the requested document_type workflow and extract all visible entities."
        )


class GeminiVisionProvider(BaseVisionProvider):
    """Google Gemini multimodal provider via REST generateContent."""

    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None) -> None:
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model_name = model_name or settings.VISION_MODEL
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models"

    async def extract_document_data(
        self, image_bytes: bytes, mime_type: str, document_type: str
    ) -> Dict[str, Any]:
        if not self.api_key:
            raise VisionProviderError("GEMINI_API_KEY is required for Gemini vision extraction.")

        # Clinical handwriting preprocessing (deskew, CLAHE contrast, unsharp mask)
        image_bytes = preprocess_clinical_image(image_bytes, mime_type)

        endpoint = f"{self.base_url}/{self.model_name}:generateContent"
        payload = {
            "system_instruction": {"parts": [{"text": VISION_EXTRACTION_SYSTEM_PROMPT}]},
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"text": self._user_prompt(document_type)},
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": base64.b64encode(image_bytes).decode("ascii"),
                            }
                        },
                    ],
                }
            ],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.0,
            },
        }
        async with httpx.AsyncClient(timeout=settings.LLM_TIMEOUT_SECONDS) as client:
            response = await client.post(endpoint, params={"key": self.api_key}, json=payload)
        if response.status_code != 200:
            raise VisionProviderError(f"Gemini Vision API error {response.status_code}: {response.text[:300]}")
        candidates = response.json().get("candidates", [])
        text = ""
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            text = "\n".join(part.get("text", "") for part in parts if isinstance(part, dict))
        return self._normalize_payload(self._extract_json(text))


class DashScopeVisionProvider(BaseVisionProvider):
    """Alibaba DashScope Qwen-VL multimodal provider."""

    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None) -> None:
        self.api_key = api_key or settings.DASHSCOPE_API_KEY
        self.model_name = model_name or settings.VISION_MODEL

    async def extract_document_data(
        self, image_bytes: bytes, mime_type: str, document_type: str
    ) -> Dict[str, Any]:
        if not self.api_key:
            raise VisionProviderError("DASHSCOPE_API_KEY is required for Qwen-VL extraction.")

        # Clinical handwriting preprocessing (deskew, CLAHE contrast, unsharp mask)
        image_bytes = preprocess_clinical_image(image_bytes, mime_type)

        def _call_dashscope() -> Dict[str, Any]:
            import dashscope
            from dashscope import MultiModalConversation

            dashscope.api_key = self.api_key
            response = MultiModalConversation.call(
                model=self.model_name,
                messages=[
                    {
                        "role": "system",
                        "content": [{"text": VISION_EXTRACTION_SYSTEM_PROMPT}],
                    },
                    {
                        "role": "user",
                        "content": [
                            {"text": self._user_prompt(document_type)},
                            {"image": self._data_uri(image_bytes, mime_type)},
                        ],
                    },
                ],
            )
            if getattr(response, "status_code", None) != 200:
                raise VisionProviderError(
                    f"DashScope Vision API error {response.status_code}: {getattr(response, 'message', '')}"
                )
            content = response.output.choices[0].message.content
            if isinstance(content, list):
                text = "\n".join(part.get("text", "") for part in content if isinstance(part, dict))
            else:
                text = str(content)
            return self._normalize_payload(self._extract_json(text))

        return await asyncio.wait_for(
            asyncio.to_thread(_call_dashscope), timeout=settings.LLM_TIMEOUT_SECONDS
        )


class OpenAIVisionProvider(BaseVisionProvider):
    """OpenAI-compatible multimodal chat-completions provider via REST."""

    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None) -> None:
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.model_name = model_name or settings.VISION_MODEL
        self.base_url = "https://api.openai.com/v1/chat/completions"

    async def extract_document_data(
        self, image_bytes: bytes, mime_type: str, document_type: str
    ) -> Dict[str, Any]:
        if not self.api_key:
            raise VisionProviderError("OPENAI_API_KEY is required for OpenAI vision extraction.")

        # Clinical handwriting preprocessing (deskew, CLAHE contrast, unsharp mask)
        image_bytes = preprocess_clinical_image(image_bytes, mime_type)

        payload = {
            "model": self.model_name,
            "temperature": 0,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": VISION_EXTRACTION_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": self._user_prompt(document_type)},
                        {
                            "type": "image_url",
                            "image_url": {"url": self._data_uri(image_bytes, mime_type)},
                        },
                    ],
                },
            ],
        }
        headers = {"Authorization": f"Bearer {self.api_key}"}
        async with httpx.AsyncClient(timeout=settings.LLM_TIMEOUT_SECONDS) as client:
            response = await client.post(self.base_url, headers=headers, json=payload)
        if response.status_code != 200:
            raise VisionProviderError(f"OpenAI Vision API error {response.status_code}: {response.text[:300]}")
        text = response.json().get("choices", [{}])[0].get("message", {}).get("content", "")
        return self._normalize_payload(self._extract_json(text))


class GroqVisionProvider(OpenAIVisionProvider):
    """Groq OpenAI-compatible vision endpoint for supported multimodal models."""

    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None) -> None:
        super().__init__(api_key=api_key or settings.GROQ_API_KEY, model_name=model_name)
        self.base_url = "https://api.groq.com/openai/v1/chat/completions"


class MockVisionProvider(BaseVisionProvider):
    """Explicit demo-mode provider used only when USE_MOCK=True and no live key is configured."""

    async def extract_document_data(
        self, image_bytes: bytes, mime_type: str, document_type: str
    ) -> Dict[str, Any]:
        payload = (
            MOCK_LAB_EXTRACTION.model_dump(mode="json")
            if document_type == "lab_report"
            else MOCK_PRESCRIPTION_EXTRACTION.model_dump(mode="json")
        )
        payload["clinic_hospital_name"] = payload.get("hospital_name")
        payload["raw_text"] = payload.get("raw_ocr_text", "")
        # Inject validation fields for mock mode (always valid medical document)
        payload["is_medical_document"] = True
        payload["rejection_reason"] = None
        payload["detected_document_type"] = document_type
        payload["confidence_score"] = 0.95
        return self._normalize_payload(payload)


PROVIDER_REGISTRY = {
    "gemini": GeminiVisionProvider,
    "google": GeminiVisionProvider,
    "qwen": DashScopeVisionProvider,
    "dashscope": DashScopeVisionProvider,
    "openai": OpenAIVisionProvider,
    "groq": GroqVisionProvider,
    "mock": MockVisionProvider,
}


def _has_live_key(provider_name: str) -> bool:
    if provider_name in {"gemini", "google"}:
        return bool(settings.GEMINI_API_KEY)
    if provider_name in {"qwen", "dashscope"}:
        return bool(settings.DASHSCOPE_API_KEY)
    if provider_name == "openai":
        return bool(settings.OPENAI_API_KEY)
    if provider_name == "groq":
        return bool(settings.GROQ_API_KEY)
    return False


def get_vision_provider(
    provider_name: Optional[str] = None, model_name: Optional[str] = None
) -> BaseVisionProvider:
    selected = (provider_name or settings.VISION_PROVIDER).strip().lower()
    provider_class = PROVIDER_REGISTRY.get(selected)
    if provider_class is None:
        raise VisionProviderError(
            f"Unknown VISION_PROVIDER '{selected}'. Use gemini, qwen, openai, or mock."
        )

    if selected == "mock":
        return MockVisionProvider()

    if settings.USE_MOCK and not _has_live_key(selected):
        logger.info("USE_MOCK=True and no live vision key configured; using MockVisionProvider")
        return MockVisionProvider()

    return provider_class(model_name=model_name or settings.VISION_MODEL)
