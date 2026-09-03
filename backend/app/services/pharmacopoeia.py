# HealthVault AI — Pakistani Pharmacopoeia Cross-Reference & Clinical Sanity Engine
# Provides South Asian drug brand validation, Levenshtein fuzzy correction,
# sig notation validation, dosage fraction protection, and clinical date sanity checks.

from __future__ import annotations

import datetime
import logging
import re
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("healthvault")

# Curated Pakistani & South Asian Pharmaceutical Brands Dictionary
PAKISTANI_PHARMACOPOEIA: Dict[str, Dict[str, Any]] = {
    "solif": {"brand": "Solif", "generic": "Solifenacin Succinate", "form": "Tablet", "strengths": ["5mg", "10mg"], "default_purpose_en": "Overactive bladder & urinary urgency", "default_purpose_ur": "پیشاب کے کنٹرول اور مثانے کے سکون کے لیے"},
    "femax": {"brand": "Femax", "generic": "Iron Polymaltose Complex + Folic Acid", "form": "Tablet", "strengths": ["100mg", "500mg"], "default_purpose_en": "Iron deficiency anemia & pregnancy supplement", "default_purpose_ur": "خون کی کمی (آئرن) اور توانائی کے لیے"},
    "neoprox": {"brand": "Neoprox", "generic": "Naproxen Sodium", "form": "Tablet", "strengths": ["250mg", "500mg"], "default_purpose_en": "Pain relief & anti-inflammatory", "default_purpose_ur": "درد، سوجن اور اینٹھن میں آرام کے لیے"},
    "ulsanic": {"brand": "Ulsanic", "generic": "Sucralfate", "form": "Suspension / Syrup", "strengths": ["1g/5ml"], "default_purpose_en": "Gastric ulcer & stomach lining protection", "default_purpose_ur": "معدے کے السر اور تیزابیت سے حفاظت کے لیے"},
    "risek": {"brand": "Risek", "generic": "Omeprazole", "form": "Capsule", "strengths": ["20mg", "40mg"], "default_purpose_en": "GERD, acidity, and gastric ulcers", "default_purpose_ur": "معدے کی تیزابیت اور جلن سے بچاؤ کے لیے"},
    "nexum": {"brand": "Nexum", "generic": "Esomeprazole", "form": "Capsule", "strengths": ["20mg", "40mg"], "default_purpose_en": "Stomach acid reflux & heartburn", "default_purpose_ur": "معدے کی تیزابیت اور سینے کی جلن کے لیے"},
    "panadol": {"brand": "Panadol", "generic": "Paracetamol", "form": "Tablet", "strengths": ["500mg"], "default_purpose_en": "Fever and mild to moderate pain relief", "default_purpose_ur": "بخار اور جسم کے درد میں آرام کے لیے"},
    "augmentin": {"brand": "Augmentin", "generic": "Amoxicillin + Clavulanic Acid", "form": "Tablet", "strengths": ["375mg", "625mg", "1g"], "default_purpose_en": "Bacterial infections antibiotic", "default_purpose_ur": "بیکٹیریل انفیکشن کے خاتمے کے لیے اینٹی بائیوٹک"},
    "lipiget": {"brand": "Lipiget", "generic": "Atorvastatin", "form": "Tablet", "strengths": ["10mg", "20mg", "40mg"], "default_purpose_en": "Cholesterol reduction & cardiovascular prevention", "default_purpose_ur": "کولیسٹرول کم کرنے اور دل کی حفاظت کے لیے"},
    "glucophage": {"brand": "Glucophage", "generic": "Metformin HCl", "form": "Tablet", "strengths": ["500mg", "850mg", "1000mg"], "default_purpose_en": "Type 2 Diabetes blood sugar regulation", "default_purpose_ur": "شوگر (ذیابیطس) کو قابو میں رکھنے کے لیے"},
    "concor": {"brand": "Concor", "generic": "Bisoprolol Fumarate", "form": "Tablet", "strengths": ["2.5mg", "5mg", "10mg"], "default_purpose_en": "Hypertension & heart rate control", "default_purpose_ur": "بلڈ پریشر اور دل کی دھڑکن کے توازن کے لیے"},
    "klaricid": {"brand": "Klaricid", "generic": "Clarithromycin", "form": "Tablet", "strengths": ["250mg", "500mg"], "default_purpose_en": "Respiratory and chest infections antibiotic", "default_purpose_ur": "سینے اور گلے کے انفیکشن کے لیے اینٹی بائیوٹک"},
    "leflox": {"brand": "Leflox", "generic": "Levofloxacin", "form": "Tablet", "strengths": ["250mg", "500mg"], "default_purpose_en": "Bacterial respiratory & urinary infection", "default_purpose_ur": "سانس اور پیشاب کی نالی کے انفیکشن کے لیے اینٹی بائیوٹک"},
    "ciproxin": {"brand": "Ciproxin", "generic": "Ciprofloxacin", "form": "Tablet", "strengths": ["250mg", "500mg"], "default_purpose_en": "Broad-spectrum antibacterial treatment", "default_purpose_ur": "انفیکشن کے علاج کے لیے اینٹی بائیوٹک"},
    "velosef": {"brand": "Velosef", "generic": "Cephradine", "form": "Capsule", "strengths": ["250mg", "500mg"], "default_purpose_en": "Antibiotic for skin and wound healing", "default_purpose_ur": "زخموں اور انفیکشن سے بچاؤ کے لیے اینٹی بائیوٹک"},
    "calpol": {"brand": "Calpol", "generic": "Paracetamol", "form": "Syrup / Suspension", "strengths": ["120mg/5ml", "250mg/5ml"], "default_purpose_en": "Pediatric fever & pain relief", "default_purpose_ur": "بچوں کے بخار اور درد میں آرام کے لیے"},
    "brufen": {"brand": "Brufen", "generic": "Ibuprofen", "form": "Tablet", "strengths": ["200mg", "400mg", "600mg"], "default_purpose_en": "Pain, fever, and inflammation reduction", "default_purpose_ur": "درد، سوجن اور بخار سے نجات کے لیے"},
    "disprin": {"brand": "Disprin", "generic": "Aspirin (Soluble)", "form": "Tablet", "strengths": ["300mg"], "default_purpose_en": "Fast pain relief and blood thinning", "default_purpose_ur": "فوری درد سے نجات اور خون پتلا رکھنے کے لیے"},
    "arinac": {"brand": "Arinac", "generic": "Ibuprofen + Pseudoephedrine", "form": "Tablet", "strengths": ["200mg/30mg"], "default_purpose_en": "Cold, flu, and sinus congestion", "default_purpose_ur": "نزلہ، زکام اور سر درد کے خاتمے کے لیے"},
    "sancos": {"brand": "Sancos", "generic": "Pholcodine + Pseudoephedrine", "form": "Syrup", "strengths": ["5ml"], "default_purpose_en": "Dry cough and throat soothing", "default_purpose_ur": "خشک کھانسی اور گلے کی خراش کے لیے"},
    "flagyl": {"brand": "Flagyl", "generic": "Metronidazole", "form": "Tablet", "strengths": ["200mg", "400mg"], "default_purpose_en": "Amoebic infection and gut diarrhea", "default_purpose_ur": "پیٹ کی خرابی، مروڑ اور انفیکشن کے علاج کے لیے"},
    "gravinate": {"brand": "Gravinate", "generic": "Dimenhydrinate", "form": "Tablet", "strengths": ["50mg"], "default_purpose_en": "Nausea, vomiting, and motion sickness", "default_purpose_ur": "متلی، قے اور چکر روکنے کے لیے"},
    "ponstan": {"brand": "Ponstan", "generic": "Mefenamic Acid", "form": "Tablet", "strengths": ["250mg", "500mg"], "default_purpose_en": "Dental pain, period pain, and cramps", "default_purpose_ur": "دانتوں کے درد اور اینٹھن میں سکون کے لیے"},
    "telfast": {"brand": "Telfast", "generic": "Fexofenadine HCl", "form": "Tablet", "strengths": ["120mg", "180mg"], "default_purpose_en": "Seasonal allergies, sneezing, and hives", "default_purpose_ur": "الرجی، چھینکوں اور خارش سے نجات کے لیے"},
    "softin": {"brand": "Softin", "generic": "Loratadine", "form": "Tablet", "strengths": ["10mg"], "default_purpose_en": "Non-drowsy anti-allergy antihistamine", "default_purpose_ur": "الرجی اور جلد کی خارش کے لیے"},
    "zyrtec": {"brand": "Zyrtec", "generic": "Cetirizine HCl", "form": "Tablet", "strengths": ["10mg"], "default_purpose_en": "Allergy and runny nose relief", "default_purpose_ur": "الرجی اور بہتی ناک کے آرام کے لیے"},
    "xyzal": {"brand": "Xyzal", "generic": "Levocetirizine", "form": "Tablet", "strengths": ["5mg"], "default_purpose_en": "Fast allergy relief", "default_purpose_ur": "تیز الرجی سے نجات کے لیے"},
    "sitamet": {"brand": "Sitamet", "generic": "Sitagliptin + Metformin", "form": "Tablet", "strengths": ["50/500mg", "50/1000mg"], "default_purpose_en": "Diabetes glycemic management", "default_purpose_ur": "شوگر کا لیول متوازن رکھنے کے لیے"},
    "januvia": {"brand": "Januvia", "generic": "Sitagliptin", "form": "Tablet", "strengths": ["50mg", "100mg"], "default_purpose_en": "Diabetes glycemic control", "default_purpose_ur": "شوگر کنٹرول کرنے کے لیے"},
    "jardiance": {"brand": "Jardiance", "generic": "Empagliflozin", "form": "Tablet", "strengths": ["10mg", "25mg"], "default_purpose_en": "Diabetes & kidney/heart protection", "default_purpose_ur": "شوگر کنٹرول اور گردوں و دل کے تحفظ کے لیے"},
    "tenormin": {"brand": "Tenormin", "generic": "Atenolol", "form": "Tablet", "strengths": ["25mg", "50mg", "100mg"], "default_purpose_en": "Hypertension & angina prevention", "default_purpose_ur": "بلڈ پریشر اور دل کی صحت کے لیے"},
    "cardnit": {"brand": "Cardnit", "generic": "Glyceryl Trinitrate", "form": "Tablet", "strengths": ["2.6mg", "6.4mg"], "default_purpose_en": "Angina and ischemic chest pain", "default_purpose_ur": "سینے کے درد اور دل کی رگوں کو کھولنے کے لیے"},
    "loprin": {"brand": "Loprin", "generic": "Low-dose Aspirin", "form": "Tablet", "strengths": ["75mg"], "default_purpose_en": "Blood thinning & cardiac protection", "default_purpose_ur": "خون پتلا رکھنے اور دل کے دورے سے بچاؤ کے لیے"},
    "rivotril": {"brand": "Rivotril", "generic": "Clonazepam", "form": "Tablet", "strengths": ["0.5mg", "2mg"], "default_purpose_en": "Seizures, anxiety, and sleep tremors", "default_purpose_ur": "بے چینی، دورے اور سکون کے لیے"},
    "lexotan": {"brand": "Lexotan", "generic": "Bromazepam", "form": "Tablet", "strengths": ["3mg"], "default_purpose_en": "Anxiety and nervous tension relief", "default_purpose_ur": "گھبراہٹ اور اعصابی تناؤ کے خاتمے کے لیے"},
    "xanax": {"brand": "Xanax", "generic": "Alprazolam", "form": "Tablet", "strengths": ["0.25mg", "0.5mg"], "default_purpose_en": "Panic attacks and severe anxiety", "default_purpose_ur": "بے چینی اور گھبراہٹ کو دور کرنے کے لیے"},
    "inderal": {"brand": "Inderal", "generic": "Propranolol", "form": "Tablet", "strengths": ["10mg", "40mg"], "default_purpose_en": "Tremors, performance anxiety, and migraine", "default_purpose_ur": "ہاتھوں کے کپکپانے اور بلڈ پریشر کے توازن کے لیے"},
    "motilium": {"brand": "Motilium", "generic": "Domperidone", "form": "Tablet", "strengths": ["10mg"], "default_purpose_en": "Nausea, fullness, and bloating relief", "default_purpose_ur": "بدہضمی، متلی اور پیٹ کے بھاری پن کے لیے"},
    "ganaton": {"brand": "Ganaton", "generic": "Itopride HCl", "form": "Tablet", "strengths": ["50mg"], "default_purpose_en": "Dyspepsia and gastric motility", "default_purpose_ur": "معدے کی حرکت اور ہاضمے کی بہتری کے لیے"},
    "gaviscon": {"brand": "Gaviscon", "generic": "Sodium Alginate + Potassium Bicarbonate", "form": "Syrup / Liquid", "strengths": ["10ml"], "default_purpose_en": "Heartburn and acid indigestion barrier", "default_purpose_ur": "سینے کی جلن اور کھٹے ڈکاروں سے فوری نجات کے لیے"},
    "hydryllin": {"brand": "Hydryllin", "generic": "Aminophylline + Diphenhydramine", "form": "Syrup", "strengths": ["5ml"], "default_purpose_en": "Cough, chest tightness, and asthma", "default_purpose_ur": "کھانسی، سینے کی جکڑن اور بلغم کے خاتمے کے لیے"},
    "surbex": {"brand": "Surbex Z", "generic": "Zinc + Vitamin B-Complex + Vitamin C", "form": "Tablet", "strengths": ["High Potency"], "default_purpose_en": "Immunity, vitality, and cellular recovery", "default_purpose_ur": "قوتِ مدافعت، بالوں اور اعصابی کمزوری کے لیے"},
    "cac-1000": {"brand": "CaC-1000 Plus", "generic": "Calcium + Vitamin C + Vitamin D3", "form": "Effervescent Tablet", "strengths": ["1000mg"], "default_purpose_en": "Bone density, calcium, and vitality", "default_purpose_ur": "ہڈیوں کی مضبوطی اور کیلشیم کی کمی دور کرنے کے لیے"},
    "neurobion": {"brand": "Neurobion", "generic": "Vitamin B1, B6, B12", "form": "Tablet", "strengths": ["Forte"], "default_purpose_en": "Nerve health, numbness, and tingling", "default_purpose_ur": "اعصابی کمزوری اور پٹھوں کے کھچاؤ کے لیے"},
    "myteka": {"brand": "Myteka", "generic": "Montelukast", "form": "Tablet", "strengths": ["5mg", "10mg"], "default_purpose_en": "Asthma and allergic rhinitis management", "default_purpose_ur": "دمہ، سانس کی تنگی اور الرجی کے علاج کے لیے"},
    "montiget": {"brand": "Montiget", "generic": "Montelukast Sodium", "form": "Tablet", "strengths": ["5mg", "10mg"], "default_purpose_en": "Asthma and airway inflammation", "default_purpose_ur": "دمہ اور سانس کی نالیوں کی الرجی کے لیے"},
    "anafortan": {"brand": "Anafortan Plus", "generic": "Camylofin + Paracetamol", "form": "Tablet", "strengths": ["50/325mg"], "default_purpose_en": "Abdominal spasmodic pain relief", "default_purpose_ur": "پیٹ کے مروڑ اور درد میں سکون کے لیے"},
    "polyfax": {"brand": "Polyfax", "generic": "Polymyxin B + Bacitracin", "form": "Ointment", "strengths": ["Eye/Skin"], "default_purpose_en": "Topical antibacterial protection for cuts & eyes", "default_purpose_ur": "زخموں اور آنکھوں کے انفیکشن کے لیے مرہم"},
    "fucidin": {"brand": "Fucidin", "generic": "Fusidic Acid", "form": "Cream / Ointment", "strengths": ["2%"], "default_purpose_en": "Bacterial skin infections and boils", "default_purpose_ur": "جلد کے دانوں اور زخموں کے لیے اینٹی بائیوٹک کریم"},
    "betnovate": {"brand": "Betnovate", "generic": "Betamethasone Valerate", "form": "Cream", "strengths": ["0.1%"], "default_purpose_en": "Skin inflammation, eczema, and psoriasis", "default_purpose_ur": "جلد کی سوزش، خارش اور الرجی کے لیے"},
}


def levenshtein_distance(s1: str, s2: str) -> int:
    """Compute the Levenshtein edit distance between two lowercase strings."""
    if s1 == s2:
        return 0
    if len(s1) == 0:
        return len(s2)
    if len(s2) == 0:
        return len(s1)

    previous_row = list(range(len(s2) + 1))
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]


def extract_clean_brand_stem(raw_name: str) -> str:
    """Strip common dosage prefixes (Tab, Cap, Syp, Inj) and trailing doses (5mg, 500) to isolate brand root."""
    cleaned = re.sub(r"^(tab|cap|syp|syrup|tablet|capsule|inj|injection|sachet)\.?\s*", "", raw_name.strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r"\b\d+(\.\d+)?\s*(mg|g|ml|mcg|iu)\b.*$", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"[^a-zA-Z\s]", "", cleaned).strip()
    # Take first word if compound like "Solif Plus"
    tokens = cleaned.split()
    return tokens[0].lower() if tokens else ""


def match_and_correct_brand(raw_name: str) -> Tuple[str, Optional[Dict[str, Any]], bool]:
    """
    Grounds extracted drug name against Pakistani Pharmacopoeia.
    If Levenshtein distance <= 2, auto-corrects to verified brand name.
    Returns: (corrected_name_string, pharma_entry_or_none, was_corrected_bool)
    """
    if not raw_name or not raw_name.strip():
        return raw_name, None, False

    original = raw_name.strip()
    stem = extract_clean_brand_stem(original)
    if not stem:
        return original, None, False

    # 1. Exact match check
    if stem in PAKISTANI_PHARMACOPOEIA:
        entry = PAKISTANI_PHARMACOPOEIA[stem]
        # Keep original form prefix if present
        prefix = "Tab " if "tab" in original.lower() else ("Cap " if "cap" in original.lower() else ("Syp " if "syp" in original.lower() else ""))
        # Keep original dosage if present
        dose_match = re.search(r"(\d+(?:\.\d+)?\s*(?:mg|g|ml|mcg|iu))", original, re.IGNORECASE)
        dose_suffix = f" {dose_match.group(1)}" if dose_match else ""
        corrected_name = f"{prefix}{entry['brand']}{dose_suffix}".strip()
        return corrected_name, entry, False

    # 2. Fuzzy Levenshtein match (distance <= 2)
    best_match_key = None
    best_dist = 999

    for key in PAKISTANI_PHARMACOPOEIA:
        dist = levenshtein_distance(stem, key)
        # Threshold: allow 1 edit for short words (len <= 4), 2 edits for longer words (len > 4)
        max_allowed = 1 if len(key) <= 4 else 2
        if dist <= max_allowed and dist < best_dist:
            best_dist = dist
            best_match_key = key

    if best_match_key is not None:
        entry = PAKISTANI_PHARMACOPOEIA[best_match_key]
        prefix = "Tab " if "tab" in original.lower() else ("Cap " if "cap" in original.lower() else ("Syp " if "syp" in original.lower() else ""))
        dose_match = re.search(r"(\d+(?:\.\d+)?\s*(?:mg|g|ml|mcg|iu))", original, re.IGNORECASE)
        dose_suffix = f" {dose_match.group(1)}" if dose_match else ""
        corrected_name = f"{prefix}{entry['brand']}{dose_suffix}".strip()
        logger.info("Pharmacopoeia auto-corrected drug brand: '%s' -> '%s' (dist=%d)", original, corrected_name, best_dist)
        return corrected_name, entry, True

    return original, None, False


def validate_sig_frequency(
    frequency_str: str,
    timing_breakdown: Optional[Dict[str, bool]] = None,
    raw_instructions: str = "",
) -> Tuple[Dict[str, bool], str]:
    """
    Validate that frequency notation matches timing breakdown.
    e.g. "1+0+1" strictly validates to 2 doses/day: Morning and Night.
    """
    comb = f"{frequency_str} {raw_instructions}".lower().strip()

    # Priority 1: Exact South Asian matrix notation
    if re.search(r"\b1\s*[\+\-]\s*0\s*[\+\-]\s*1\b", comb):
        return {"morning": True, "afternoon": False, "night": True}, "Twice daily (Morning & Night / 1+0+1)"
    if re.search(r"\b1\s*[\+\-]\s*1\s*[\+\-]\s*1\b", comb):
        return {"morning": True, "afternoon": True, "night": True}, "Three times daily (Morning, Afternoon, Night / 1+1+1)"
    if re.search(r"\b0\s*[\+\-]\s*0\s*[\+\-]\s*1\b", comb) or re.search(r"\b0\s*[\+\-]\s*1\b", comb):
        return {"morning": False, "afternoon": False, "night": True}, "Once daily at night (0+0+1)"
    if re.search(r"\b1\s*[\+\-]\s*0\s*[\+\-]\s*0\b", comb) or re.search(r"\b1\s*[\+\-]\s*0\b", comb):
        return {"morning": True, "afternoon": False, "night": False}, "Once daily in the morning (1+0+0)"
    if re.search(r"\b0\s*[\+\-]\s*1\s*[\+\-]\s*0\b", comb):
        return {"morning": False, "afternoon": True, "night": False}, "Once daily in afternoon (0+1+0)"
    if re.search(r"\b1\s*[\+\-]\s*1\b", comb):
        return {"morning": True, "afternoon": False, "night": True}, "Twice daily (Morning & Night / 1+1)"

    # Priority 2: Use existing breakdown or text clues
    tb = timing_breakdown or {}
    morning = bool(tb.get("morning", False))
    afternoon = bool(tb.get("afternoon", False))
    night = bool(tb.get("night", False))

    if not (morning or afternoon or night):
        morning = any(w in comb for w in ["صبح", "morning", "bd", "tds"])
        afternoon = any(w in comb for w in ["دوپہر", "afternoon", "tds"])
        night = any(w in comb for w in ["شام", "رات", "night", "evening", "bedtime", "hs", "bd", "tds"])

    # If only evening is mentioned
    if ("شام" in comb or "evening" in comb) and not ("صبح" in comb or "morning" in comb or "bd" in comb):
        morning = False
        afternoon = False
        night = True

    count = sum([morning, afternoon, night])
    freq_label = (
        "Three times daily" if count == 3
        else ("Twice daily" if count == 2
        else ("Once daily" if count == 1
        else (frequency_str or "As directed by physician")))
    )

    return {"morning": morning, "afternoon": afternoon, "night": night}, freq_label


def sanitize_dosage_fractions(
    dose_text: str,
    instructions: str = "",
    fraction_hint: Optional[str] = None,
) -> Tuple[str, str, str, str]:
    """
    Guards against misreading "0.5 tablet" or "آدھی گولی" as "5 tablets".
    Returns: (sanitized_dosage, fraction_type, label_en, label_ur)
    """
    comb = f"{dose_text} {instructions}".lower()

    # Detect fractional half tablet
    is_half = (
        fraction_hint == "half"
        or any(w in comb for w in ["آدھی", "آدھا", "0.5", "1/2", "half tab", "half tablet", "نصف"])
    )

    # Detect liquid teaspoon
    is_syrup = (
        fraction_hint == "2_spoons"
        or any(w in comb for w in ["چمچ", "teaspoon", "tsp", "10ml", "5ml", "spoon", "syp", "syrup"])
    )

    if is_half:
        # Prevent hallucinated "5" or "5 tablets"
        sanitized_dosage = "0.5 tablet (Half)"
        return sanitized_dosage, "half", "Half Tablet (0.5)", "آدھی گولی (0.5)"

    if is_syrup:
        if any(w in comb for w in ["۲", "2", "two", "10ml"]):
            return "2 teaspoons (10ml)", "2_spoons", "2 Teaspoons (10ml)", "۲ چمچ (10 ملی لیٹر)"
        return "1 teaspoon (5ml)", "other", "1 Teaspoon (5ml)", "۱ چمچ (5 ملی لیٹر)"

    # Default full tablet / capsule
    if any(w in comb for w in ["cap", "capsule", "کیپسول"]):
        return dose_text or "1 capsule", "full", "1 Capsule (1.0)", "1 کیپسول (1.0)"

    return dose_text or "1 tablet", "full", "1 Tablet (1.0)", "1 گولی (1.0)"


def sanitize_clinical_date(raw_date_str: Optional[str]) -> Optional[str]:
    """
    Validates clinical consultation/test date:
    - Dates cannot be in the future.
    - If year is omitted or OCR misread year (e.g. 2095, 2035), infers current or recent calendar year.
    Returns ISO date string (YYYY-MM-DD) or None.
    """
    if not raw_date_str or not str(raw_date_str).strip():
        return None

    cleaned = str(raw_date_str).strip()
    today = datetime.date.today()
    current_year = today.year

    # 1. Try ISO format directly
    try:
        parsed = datetime.date.fromisoformat(cleaned)
        if parsed > today:
            # Date is in the future: likely misread year, adjust to current year
            adjusted = parsed.replace(year=current_year)
            if adjusted > today:
                # If still future, might be last year
                adjusted = adjusted.replace(year=current_year - 1)
            return adjusted.isoformat()
        return parsed.isoformat()
    except ValueError:
        pass

    # 2. Extract day, month, year with regex
    # Match patterns like 15/08/2024, 15-08-2024, 15.08.2024, 15/08/24, 15 Aug 2024
    patterns = [
        r"(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})",  # DD/MM/YYYY or MM/DD/YYYY
        r"(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})",  # YYYY/MM/DD
        r"(\d{1,2})[\s\-]+([A-Za-z]{3,9})[\s\-,]+(\d{2,4})?", # 15 Aug 2024 or 15 Aug
    ]

    for pat in patterns:
        m = re.search(pat, cleaned)
        if m:
            groups = m.groups()
            try:
                if len(groups) == 3 and groups[0].isdigit() and len(groups[0]) == 4:
                    # YYYY-MM-DD
                    y, mo, d = int(groups[0]), int(groups[1]), int(groups[2])
                elif groups[1].isalpha():
                    # DD Mon YYYY
                    d = int(groups[0])
                    mo_name = groups[1][:3].title()
                    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
                    mo = months.index(mo_name) + 1 if mo_name in months else 1
                    y = int(groups[2]) if groups[2] else current_year
                else:
                    d, mo = int(groups[0]), int(groups[1])
                    raw_y = groups[2] if len(groups) > 2 and groups[2] else str(current_year)
                    y = int(raw_y)
                    if y < 100:
                        y = 2000 + y

                # Year sanity: cannot exceed current year + cannot be < 1990
                if y > current_year or y < 1990:
                    y = current_year

                candidate = datetime.date(y, mo, d)
                if candidate > today:
                    candidate = datetime.date(current_year - 1, mo, d)
                return candidate.isoformat()
            except (ValueError, IndexError):
                continue

    # 3. Fallback: if day/month found without year, assume current year
    short_match = re.search(r"(\d{1,2})[\/\-\.](\d{1,2})", cleaned)
    if short_match:
        try:
            d, mo = int(short_match.group(1)), int(short_match.group(2))
            cand = datetime.date(current_year, mo, d)
            if cand > today:
                cand = datetime.date(current_year - 1, mo, d)
            return cand.isoformat()
        except ValueError:
            pass

    return None
