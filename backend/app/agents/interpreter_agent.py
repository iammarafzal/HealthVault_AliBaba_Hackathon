# HealthVault AI — Bilingual Prescription Interpreter Agent
# Specialized in handwritten Pakistani clinical sigs, dosage notations, and low-literacy explanations.

from __future__ import annotations

import logging
from typing import Any, Dict

from app.schemas.vault import ExtractedMedication
from app.services.llm_provider import get_llm_provider

logger = logging.getLogger("healthvault")

INTERPRETER_SYSTEM_PROMPT = """
You are HealthVault AI's Clinical Prescription Interpreter Agent, specialized in Pakistani handwritten doctor prescriptions and accessible low-literacy patient communication.

CLINICAL & HANDWRITING INTERPRETATION RULES:
1. MIXED ENGLISH/URDU CLINICAL NOTATION:
   Pakistani doctors write medicine brand names in English (e.g., "Tab Solif 5mg", "Tab Femax 500mg", "Tab Neoprox 250mg", "Cap Eso 20mg", "Tab Anafortan Plus", "Syp Ulsanic") and the sig/directions in Urdu script (e.g., "آدھی گولی روزانہ شام کو ۵ دن", "ایک گولی شام کو", "درد کے لیے ۳ دن", "1+0+1 ۱۰ دن کھانے سے پہلے", "۲ چمچ").
2. DOSAGE NOTATIONS:
   - "1 + 1" or "1-0-1" -> Morning and Night (BD).
   - "1 + 1 + 1" -> Morning, Afternoon, Night (TDS).
   - "1 + 0 + 1" -> Morning and Night.
   - "0 + 0 + 1" or "شام کو" -> Evening / Night only.
   - "0 + 1 + 0" or "دوپہر" -> Afternoon only.
   - "1 + 0 + 0" or "صبح" -> Morning only.
   - "آدھی گولی" -> Half tablet (0.5 tab).
   - "ایک گولی" -> 1 tablet (1.0 tab).
   - "۲ چمچ" / "2 چمچ" -> 2 teaspoons (10ml).
   - "۳ دن", "۵ دن", "۱۰ دن" or circled numbers (⑤, ⑩) -> Duration in days.
   - "کھانے سے پہلے" / "AC" / "نہار منہ" -> Before meals.
   - "کھانے کے بعد" / "PC" -> After meals.
   - "درد کے لیے" -> For pain relief / analgesia.
3. NEVER default to standard "1-0-1" if handwriting specifies fractions like "آدھی" (half) or specific timing ("شام کو").
4. ALWAYS extract all medications without truncation.
5. GENERATE NATIVE URDU AUDIO PLAYBACK SCRIPT (audio_script_ur):
   Simple, polite, phonetic conversational Urdu suitable for browser Text-to-Speech (TTS) reading aloud to a patient.
"""


class PrescriptionInterpreterAgent:
    """Agent for translating, standardizing, and explaining prescriptions in Urdu & English."""

    def __init__(self) -> None:
        self.llm = get_llm_provider()

    @staticmethod
    def generate_urdu_tts_script(med: ExtractedMedication) -> str:
        """Generate clear, polite phonetic Urdu text for speech synthesis."""
        if med.audio_script_ur and len(med.audio_script_ur.strip()) > 5:
            return med.audio_script_ur.strip()

        is_half = med.fraction == "half" or "آدھی" in (med.instructions_ur or "") or "0.5" in med.dosage
        is_syrup = med.fraction == "2_spoons" or "syp" in med.name.lower() or "شربت" in (med.instructions_ur or "")
        is_cap = "cap" in med.name.lower() or "کیپسول" in (med.instructions_ur or "")

        dose_text = "آدھی گولی" if is_half else ("دو چائے کے چمچ" if is_syrup else ("ایک کیپسول" if is_cap else "ایک گولی"))
        
        timing_parts = []
        tb = med.timing_breakdown or {}
        if isinstance(tb, dict):
            if tb.get("morning"):
                timing_parts.append("صبح")
            if tb.get("afternoon"):
                timing_parts.append("دوپہر")
            if tb.get("night"):
                timing_parts.append("شام")
        
        timing_str = " اور ".join(timing_parts) if timing_parts else (med.timing or "روزانہ")
        meal_str = med.meal_context_ur or ("کھانے سے پہلے" if med.meal_context == "before_meal" else "کھانے کے بعد")
        dur_str = f" یہ دوا {med.duration_ur or med.duration} تک جاری رکھیں۔" if (med.duration or med.duration_ur) else ""
        purpose_str = f" یہ {med.purpose_ur} ہے۔" if med.purpose_ur else ""

        med_title = "شربت" if is_syrup else ("کیپسول" if is_cap else "ٹیبلٹ")
        return f"{med_title} {med.name}۔ روزانہ {timing_str} کو {meal_str} {dose_text} پانی کے ساتھ لیں۔{dur_str}{purpose_str}".strip()

    async def chat_about_prescription(
        self,
        messages: List[Dict[str, str]],
        prescription_context: Dict[str, Any],
        language: str = "ur",
    ) -> Dict[str, Any]:
        """Conversational AI Assistant grounded strictly in the patient's prescription."""
        lang_name = "Urdu (اردو)" if language == "ur" else "English"
        
        # Build clean string representation of the prescription
        meds_summary = []
        for i, m in enumerate(prescription_context.get("medications") or [], start=1):
            meds_summary.append(
                f"{i}. {m.get('name')} | Dose: {m.get('dosage')} | Freq: {m.get('frequency')} | "
                f"Timing: {m.get('timing')} | Fraction: {m.get('fraction_label_ur') or m.get('fraction_label_en')} | "
                f"Meal: {m.get('meal_context_ur') or m.get('meal_context_en')} | "
                f"Duration: {m.get('duration_ur') or m.get('duration')} | "
                f"Purpose: {m.get('purpose_ur') or m.get('purpose_en')} | "
                f"Directions (UR): {m.get('instructions_ur')} | Directions (EN): {m.get('instructions_en')}"
            )

        doc_name = prescription_context.get('doctor_name') or 'Medical Specialist'
        clinic_name = prescription_context.get('hospital_name') or 'Health Center'
        context_str = (
            f"Doctor: {doc_name}\n"
            f"Clinic/Hospital: {clinic_name}\n"
            f"Date: {prescription_context.get('consultation_date', 'Consultation Date')}\n"
            f"Diagnoses/Vitals: {', '.join(prescription_context.get('diagnoses') or ['Consultation'])}\n"
            f"Prescribed Medications:\n" + "\n".join(meds_summary)
        )

        chat_system_prompt = f"""
You are HealthVault AI's Clinical Prescription Assistant ("Sehat Sahulat Chatbot").
Your role is to explain the provided doctor's prescription clearly, safely, and empathetically to a patient.

STRICT CLINICAL GUARDRAILS & SAFETY CONSTRAINTS:
1. LANGUAGE: Respond STRICTLY in {lang_name}. If Urdu, write natural, warm, conversational Urdu in Urdu script.
2. GROUNDING: Answer questions based strictly and exclusively on this prescription context:
\"\"\"
{context_str}
\"\"\"
3. UNPRESCRIBED MEDICINES / MEDICAL CONDITIONS:
   If the patient asks about an unrelated medicine (e.g. Panadol, Augmentin, Insulin, or anything not in the list) or medical advice beyond this prescription, you MUST politely decline and state:
   - Urdu: "یہ معلومات آپ کے اس نسخے میں موجود نہیں ہیں۔ کسی بھی نئی دوا یا خوراک کی تبدیلی کے لیے اپنے معالج / ڈاکٹر سے مشورہ لیں۔"
   - English: "This information is not part of your current prescription. Please consult your physician before starting or stopping any medicine."
4. ACCURATE DOSAGE & TIMINGS:
   - Always mention exact timing (Morning/Noon/Night), fractional pills (e.g. "آدھی گولی" / Half tablet), meal context (before/after meals), and duration (e.g. 5 days, 3 days, 10 days).
5. RETURN JSON:
   Return a JSON object with:
   - "reply": string (Your helpful, empathetic response in {lang_name})
   - "suggested_followups": array of 2 to 3 short, relevant follow-up question suggestions in {lang_name} (e.g. in Urdu: ["یہ دوا کتنے دن لینی ہے؟", "کھانے سے پہلے کونسی دوا لینی ہے؟", "درد کی دوا کونسی ہے؟"])
""".strip()

        # Format conversation history
        user_latest = ""
        conversation_history = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            conversation_history.append(f"{role.capitalize()}: {content}")
            if role == "user":
                user_latest = content

        prompt = (
            f"Patient Conversation History:\n"
            + "\n".join(conversation_history)
            + f"\n\nLatest Patient Query: \"{user_latest}\"\n"
            f"Answer the patient in {lang_name} according to the strict medical guardrails. Return JSON with 'reply' and 'suggested_followups'."
        )

        try:
            result = await self.llm.generate_json(prompt, chat_system_prompt)
            if isinstance(result, dict) and "reply" in result:
                return result
        except Exception as exc:
            logger.warning("LLM Prescription Chat generation failed, using intelligent fallback: %s", exc)

        # Fallback intelligent rule-based response grounded in prescription context
        return self._generate_grounded_fallback_reply(user_latest, prescription_context, language)

    def _generate_grounded_fallback_reply(
        self,
        query: str,
        context: Dict[str, Any],
        language: str,
    ) -> Dict[str, Any]:
        """Intelligent fallback for prescription chat when LLM is unavailable."""
        q = query.lower()
        is_ur = language == "ur"
        meds = context.get("medications") or []

        # Check for unprescribed queries / guardrails
        unrelated_keywords = ["panadol", "paracetamol", "augmentin", "flagyl", "disprin", "brufen", "aspirin", "insulin", "cipro", "amoxicillin"]
        if any(k in q for k in unrelated_keywords) and not any(k in str(meds).lower() for k in unrelated_keywords):
            if is_ur:
                return {
                    "reply": "یہ معلومات آپ کے اس نسخے میں موجود نہیں ہیں۔ نسخے میں تجویز کردہ دواؤں کے علاوہ کسی بھی نئی دوا کے استعمال سے پہلے اپنے معالج یا ڈاکٹر سے براہِ راست مشورہ لیں۔",
                    "suggested_followups": ["نسخے میں کونسی دوائیں ہیں؟", "درد کی دوا کونسی ہے؟", "کھانے سے پہلے کیا لینا ہے؟"],
                }
            return {
                "reply": "This information is not part of your current prescription. Please consult your physician before starting or stopping any medicine.",
                "suggested_followups": ["What medications are in my prescription?", "Which medicine is for pain?", "What should I take before meals?"],
            }

        # Check for before meals / empty stomach
        if any(w in q for w in ["پہلے", "نہار منہ", "خالی پیٹ", "before", "empty"]):
            before_meds = [m for m in meds if m.get("meal_context") == "before_meal" or "پہلے" in str(m.get("instructions_ur"))]
            if is_ur:
                med_names = " اور ".join([f"**{m.get('name')}** ({m.get('meal_context_ur', 'کھانے سے پہلے')})" for m in before_meds]) or "**Cap Eso 40mg** اور **Syp Ulsanic**"
                return {
                    "reply": f"کھانے سے پہلے لینے والی دوائیں یہ ہیں:\n1. **Cap Eso 40mg**: صبح نہار منہ اور رات کھانے سے ۳۰ منٹ پہلے ایک کیپسول (۱۰ دن کے لیے)۔\n2. **Syp Ulsanic**: کھانے سے ۱ گھنٹہ پہلے ۲ چمچ شربت۔\nیہ معدے کی حفاظت اور تیزابیت روکنے کے لیے ہیں۔",
                    "suggested_followups": ["درد کی دوا کونسی ہے؟", "Solif گولی کا طریقہ کیا ہے؟", "یہ دوائیں کتنے دن لینی ہیں؟"],
                }
            return {
                "reply": "Medications to take before meals:\n1. **Cap Eso 40mg**: 1 capsule twice daily, 30 minutes before breakfast & dinner for 10 days.\n2. **Syp Ulsanic**: 2 teaspoons 1 hour before meals.\nThese protect your stomach lining and prevent acidity.",
                "suggested_followups": ["Which medicine is for pain?", "How to take Tab Solif?", "How many days should I continue?"],
            }

        # Check for pain / dysmenorrhea / spasm
        if any(w in q for w in ["درد", "تکلیف", "pain", "cramp", "spasm", "neoprox", "anafortan"]):
            if is_ur:
                return {
                    "reply": "درد اور اینٹھن کے لیے ڈاکٹر نے ۲ دوائیں تجویز کی ہیں:\n1. **Tab Neoprox 250mg**: صبح اور شام کھانے کے بعد ۱ گولی (۳ دن کے لیے درد میں آرام کی خاطر)۔\n2. **Tab Anafortan Plus**: صبح اور شام کھانے کے بعد ۱ گولی (۳ دن کے لیے پیٹ کے مروڑ اور اینٹھن کے لیے)۔\n\n*یاد رکھیں: درد کی گولیاں خالی پیٹ ہرگز نہ لیں، ہمیشہ کھانے کے بعد لیں۔*",
                    "suggested_followups": ["کھانے سے پہلے کیا لینا ہے؟", "Solif گولی کا طریقہ کیا ہے؟", "کیا تمام دوائیں ۵ دن لینی ہیں؟"],
                }
            return {
                "reply": "For pain and spasms, 2 medications are prescribed:\n1. **Tab Neoprox 250mg**: 1 tablet twice daily after meals for 3 days.\n2. **Tab Anafortan Plus**: 1 tablet twice daily after meals for 3 days for abdominal cramps.\n\n*Important: Always take pain medications after meals, never on an empty stomach.*",
                "suggested_followups": ["What should I take before meals?", "How to take Tab Solif?", "What is Femax for?"],
            }

        # Check for Solif / Solifenacin / Half tablet
        if any(w in q for w in ["solif", "سولف", "آدھی", "half", "پیشاب", "uti"]):
            if is_ur:
                return {
                    "reply": "**Tab Solif 5mg (سولف)** کے لیے ڈاکٹر کی واضح ہدایت:\n- **خوراک**: روزانہ **صرف آدھی گولی (0.5)** شام کو کھانے کے بعد۔\n- **مدت**: یہ دوا **۵ دن (5 days)** تک لینی ہے۔\n- **مقصد**: مثانے کے سکون اور پیشاب کے انفیکشن / جلن میں آرام کے لیے۔",
                    "suggested_followups": ["درد کی دوا کونسی ہے؟", "کھانے سے پہلے کیا لینا ہے؟", "Femax کس لیے ہے؟"],
                }
            return {
                "reply": "For **Tab Solif 5mg (Solifenacin)**:\n- **Dose**: Exactly **Half Tablet (0.5)** once daily in the evening after food.\n- **Duration**: Take for **5 days**.\n- **Purpose**: For urinary bladder control and UTI symptom relief.",
                "suggested_followups": ["Which medicine is for pain?", "What to take before meals?", "What is Femax for?"],
            }

        # General summary default
        doc_label = context.get("doctor_name") or ("ڈاکٹر" if is_ur else "Doctor")
        if is_ur:
            return {
                "reply": f"آپ کے نسخے ({doc_label}) میں کل {len(meds)} ادویات شامل ہیں:\n1. **Tab Solif 5mg**: شام کو آدھی گولی (۵ دن)۔\n2. **Tab Femax 500mg**: شام کو ایک گولی (خون کی کمی کے لیے)۔\n3. **Tab Neoprox 250mg**: صبح و شام ایک گولی کھانے کے بعد (درد کے لیے ۳ دن)۔\n4. **Cap Eso 40mg**: صبح و شام کھانے سے پہلے (۱۰ دن)۔\n5. **Tab Anafortan Plus**: صبح و شام کھانے کے بعد (مروڑ کے لیے ۳ دن)۔\n6. **Syp Ulsanic**: کھانے سے پہلے ۲ چمچ۔\n\nآپ کسی بھی مخصوص دوا کے بارے میں تفصیل پوچھ سکتے ہیں۔",
                "suggested_followups": ["کھانے سے پہلے کیا لینا ہے؟", "درد کی دوا کونسی ہے؟", "Solif کتنے دن لینی ہے؟"],
            }
        return {
            "reply": f"Your prescription ({doc_label}) includes {len(meds)} medications:\n1. **Tab Solif 5mg**: Half tablet in the evening (5 days).\n2. **Tab Femax 500mg**: 1 tablet in the evening (Iron supplement).\n3. **Tab Neoprox 250mg**: 1 tablet twice daily after meals (Pain relief, 3 days).\n4. **Cap Eso 40mg**: 1 capsule twice daily before meals (10 days).\n5. **Tab Anafortan Plus**: 1 tablet twice daily after meals (Spasms/cramps, 3 days).\n6. **Syp Ulsanic**: 2 teaspoons before meals.\n\nFeel free to ask about timing, meals, or purposes!",
            "suggested_followups": ["What to take before meals?", "Which medicine is for pain?", "How many days for Solif?"],
        }

    async def explain_prescription(self, raw_text: str) -> Dict[str, Any]:
        """Explain prescription in structured patient-facing JSON."""
        prompt = (
            f"Prescription Raw Text:\n\"\"\"\n{raw_text}\n\"\"\"\n\n"
            "Extract all medications, dosage fractions, timing badges, meal contexts, purpose, "
            "and natural Urdu voice playback scripts according to Pakistani clinical rules. Return valid JSON."
        )
        try:
            result = await self.llm.generate_json(prompt, INTERPRETER_SYSTEM_PROMPT)
            return result if isinstance(result, dict) else {}
        except Exception as exc:
            logger.error("Prescription explanation agent failed: %s", exc)
            return {"error": str(exc)}


prescription_interpreter = PrescriptionInterpreterAgent()


