# HealthVault AI — Biomarker Aggregation & Analysis Service
# Generic clinical lab engine supporting arbitrary analytes, category grouping, and dynamic history queries.

import logging
from collections import defaultdict
from datetime import date
from typing import Dict, List, Optional, Tuple
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.biomarker import Biomarker
from app.schemas.biomarker import (
    BiomarkerDataPoint,
    BiomarkerHistoryResponse,
    BiomarkerSeries,
    BiomarkerSummaryResponse,
    BiomarkerTimelineResponse,
)

logger = logging.getLogger("healthvault")

# ---------------------------------------------------------------------------
# Biomarker name aliases → (canonical_name, category)
# ---------------------------------------------------------------------------
_ALIAS_MAP: Dict[str, Tuple[str, str]] = {
    # Complete Blood Count (CBC)
    "hemoglobin":                     ("Hemoglobin", "Complete Blood Count"),
    "hb":                             ("Hemoglobin", "Complete Blood Count"),
    "wbc":                            ("WBC Count", "Complete Blood Count"),
    "white blood cell":               ("WBC Count", "Complete Blood Count"),
    "white blood cells":              ("WBC Count", "Complete Blood Count"),
    "leukocytes":                     ("WBC Count", "Complete Blood Count"),
    "platelets":                      ("Platelet Count", "Complete Blood Count"),
    "platelet count":                 ("Platelet Count", "Complete Blood Count"),
    "plt":                            ("Platelet Count", "Complete Blood Count"),
    "rbc":                            ("RBC Count", "Complete Blood Count"),
    "red blood cells":                ("RBC Count", "Complete Blood Count"),
    "hematocrit":                     ("Hematocrit (HCT)", "Complete Blood Count"),
    "hct":                            ("Hematocrit (HCT)", "Complete Blood Count"),
    "neutrophils":                    ("Neutrophils", "Complete Blood Count"),
    "lymphocytes":                    ("Lymphocytes", "Complete Blood Count"),

    # Diabetes / Glycemic
    "hba1c":                          ("HbA1c", "Diabetes"),
    "hb a1c":                         ("HbA1c", "Diabetes"),
    "glycated hemoglobin":            ("HbA1c", "Diabetes"),
    "fasting glucose":                ("Fasting Glucose", "Diabetes"),
    "fasting blood sugar":            ("Fasting Glucose", "Diabetes"),
    "fbg":                            ("Fasting Glucose", "Diabetes"),
    "random glucose":                 ("Random Glucose", "Diabetes"),
    "rbg":                            ("Random Glucose", "Diabetes"),
    "blood sugar":                    ("Fasting Glucose", "Diabetes"),

    # Lipid Profile
    "total cholesterol":              ("Total Cholesterol", "Lipid Profile"),
    "cholesterol":                    ("Total Cholesterol", "Lipid Profile"),
    "ldl":                            ("LDL Cholesterol", "Lipid Profile"),
    "ldl cholesterol":                ("LDL Cholesterol", "Lipid Profile"),
    "ldl-c":                          ("LDL Cholesterol", "Lipid Profile"),
    "hdl":                            ("HDL Cholesterol", "Lipid Profile"),
    "hdl cholesterol":                ("HDL Cholesterol", "Lipid Profile"),
    "hdl-c":                          ("HDL Cholesterol", "Lipid Profile"),
    "triglycerides":                  ("Triglycerides", "Lipid Profile"),
    "tg":                             ("Triglycerides", "Lipid Profile"),

    # Liver Function (LFTs)
    "alt":                            ("ALT (SGPT)", "Liver Function"),
    "sgpt":                           ("ALT (SGPT)", "Liver Function"),
    "ast":                            ("AST (SGOT)", "Liver Function"),
    "sgot":                           ("AST (SGOT)", "Liver Function"),
    "alkaline phosphatase":           ("Alkaline Phosphatase (ALP)", "Liver Function"),
    "alp":                            ("Alkaline Phosphatase (ALP)", "Liver Function"),
    "bilirubin":                      ("Total Bilirubin", "Liver Function"),
    "total bilirubin":                ("Total Bilirubin", "Liver Function"),
    "albumin":                        ("Serum Albumin", "Liver Function"),

    # Kidney Function (RFTs / Renal)
    "creatinine":                     ("Serum Creatinine", "Kidney Function"),
    "serum creatinine":               ("Serum Creatinine", "Kidney Function"),
    "blood urea":                     ("Blood Urea", "Kidney Function"),
    "urea":                           ("Blood Urea", "Kidney Function"),
    "bun":                            ("BUN (Urea Nitrogen)", "Kidney Function"),
    "uric acid":                      ("Uric Acid", "Kidney Function"),
    "egfr":                           ("eGFR", "Kidney Function"),

    # Thyroid Panel
    "tsh":                            ("TSH (Thyroid Stimulating Hormone)", "Thyroid"),
    "thyroid stimulating hormone":    ("TSH (Thyroid Stimulating Hormone)", "Thyroid"),
    "free t3":                        ("Free T3", "Thyroid"),
    "ft3":                            ("Free T3", "Thyroid"),
    "free t4":                        ("Free T4", "Thyroid"),
    "ft4":                            ("Free T4", "Thyroid"),

    # Electrolytes
    "sodium":                         ("Sodium (Na)", "Electrolytes"),
    "potassium":                      ("Potassium (K)", "Electrolytes"),
    "chloride":                       ("Chloride (Cl)", "Electrolytes"),
    "calcium":                        ("Serum Calcium", "Electrolytes"),

    # Vitamins & Iron
    "vitamin d":                      ("Vitamin D (25-OH)", "Vitamins"),
    "vitamin d3":                     ("Vitamin D (25-OH)", "Vitamins"),
    "vitamin b12":                    ("Vitamin B12", "Vitamins"),
    "ferritin":                       ("Serum Ferritin", "Vitamins"),
    "iron":                           ("Serum Iron", "Vitamins"),
}

# Default clinical reference ranges (used when DB record lacks reference_min/max)
_DEFAULT_RANGES: Dict[str, Tuple[float, float]] = {
    "HbA1c":                           (4.0, 5.6),
    "Fasting Glucose":                 (70.0, 99.0),
    "Random Glucose":                  (70.0, 140.0),
    "Total Cholesterol":               (0.0, 200.0),
    "LDL Cholesterol":                 (0.0, 100.0),
    "HDL Cholesterol":                 (40.0, 60.0),
    "Triglycerides":                   (0.0, 150.0),
    "Hemoglobin":                      (12.0, 17.5),
    "Platelet Count":                  (150.0, 400.0),
    "WBC Count":                       (4.5, 11.0),
    "RBC Count":                       (4.2, 5.9),
    "Serum Creatinine":                (0.7, 1.3),
    "Blood Urea":                      (7.0, 20.0),
    "ALT (SGPT)":                      (7.0, 56.0),
    "AST (SGOT)":                      (10.0, 40.0),
    "TSH (Thyroid Stimulating Hormone)": (0.4, 4.0),
    "Sodium (Na)":                     (135.0, 145.0),
    "Potassium (K)":                   (3.5, 5.0),
    "Vitamin D (25-OH)":               (30.0, 100.0),
}

_STABILITY_FRACTION = 0.05


def _normalize_name(raw: str, db_category: Optional[str] = None) -> Tuple[str, str]:
    """Return (canonical_name, category) for a raw biomarker label."""
    if not raw:
        return "Unknown Analyte", db_category or "Other"
    key = raw.strip().lower()
    if key in _ALIAS_MAP:
        canon, cat = _ALIAS_MAP[key]
        return canon, (db_category if db_category and db_category != "Other" else cat)
    
    # Title-case raw name and infer/fallback category
    canon = raw.strip().title()
    category = db_category or "Other"
    return canon, category


def _compute_trend(
    data_points: List[BiomarkerDataPoint],
    canonical_name: str,
) -> str:
    """Determine trend direction by comparing baseline vs. latest value."""
    if len(data_points) < 2:
        return "stable"

    baseline = data_points[0].value
    latest = data_points[-1].value

    ref_min: Optional[float] = None
    ref_max: Optional[float] = None
    for dp in data_points:
        if dp.reference_min is not None:
            ref_min = dp.reference_min
            break
    for dp in reversed(data_points):
        if dp.reference_max is not None:
            ref_max = dp.reference_max
            break

    if ref_min is None or ref_max is None:
        default = _DEFAULT_RANGES.get(canonical_name)
        if default:
            ref_min = ref_min if ref_min is not None else default[0]
            ref_max = ref_max if ref_max is not None else default[1]
        else:
            return "stable"

    span = ref_max - ref_min
    if span <= 0:
        return "stable"

    baseline_in_range = ref_min <= baseline <= ref_max
    latest_in_range = ref_min <= latest <= ref_max

    if baseline_in_range and latest_in_range:
        return "stable"
    if not baseline_in_range and latest_in_range:
        return "improving"
    if baseline_in_range and not latest_in_range:
        return "worsening"

    def _distance_outside(v: float) -> float:
        if v < ref_min:
            return ref_min - v
        if v > ref_max:
            return v - ref_max
        return 0.0

    baseline_dist = _distance_outside(baseline)
    latest_dist = _distance_outside(latest)
    delta = latest_dist - baseline_dist

    if abs(delta) < _STABILITY_FRACTION * span:
        return "stable"
    return "improving" if delta < 0 else "worsening"


class BiomarkerService:
    """Async service for generic clinical lab biomarker aggregation."""

    @staticmethod
    async def get_biomarker_summary(
        db: AsyncSession,
        user_id: UUID,
    ) -> BiomarkerSummaryResponse:
        """Return dynamic summary of patient's lab biomarkers grouped by category."""
        query = (
            select(Biomarker)
            .where(Biomarker.user_id == user_id)
            .order_by(Biomarker.test_date.desc(), Biomarker.created_at.desc())
            .options(selectinload(Biomarker.record))
        )
        result = await db.scalars(query)
        rows: List[Biomarker] = result.all()

        # Group latest measurement per canonical test name
        latest_map: Dict[str, Biomarker] = {}
        all_dp: List[BiomarkerDataPoint] = []

        for bm in rows:
            canon, cat = _normalize_name(bm.biomarker_name, bm.category)
            
            # Format reference text
            ref_text = bm.ref_range_text
            if not ref_text and (bm.reference_min is not None or bm.reference_max is not None):
                if bm.reference_min is not None and bm.reference_max is not None:
                    ref_text = f"{bm.reference_min} – {bm.reference_max} {bm.unit}"
                elif bm.reference_min is not None:
                    ref_text = f"> {bm.reference_min} {bm.unit}"
                elif bm.reference_max is not None:
                    ref_text = f"< {bm.reference_max} {bm.unit}"

            dp = BiomarkerDataPoint(
                record_id=bm.record_id or (bm.record.id if bm.record else None),
                biomarker_name=canon,
                category=cat,
                test_date=bm.test_date,
                value=float(bm.value),
                value_text=bm.value_text or str(bm.value),
                unit=bm.unit,
                reference_min=float(bm.reference_min) if bm.reference_min is not None else None,
                reference_max=float(bm.reference_max) if bm.reference_max is not None else None,
                ref_range_text=ref_text,
                status=bm.status or "normal",
                lab_name=bm.lab_name,
            )
            all_dp.append(dp)
            if canon not in latest_map:
                latest_map[canon] = bm

        latest_readings: List[BiomarkerDataPoint] = []
        categories_set = set()

        for canon, bm in latest_map.items():
            canon, cat = _normalize_name(bm.biomarker_name, bm.category)
            categories_set.add(cat)
            
            ref_text = bm.ref_range_text
            if not ref_text and (bm.reference_min is not None or bm.reference_max is not None):
                if bm.reference_min is not None and bm.reference_max is not None:
                    ref_text = f"{bm.reference_min} – {bm.reference_max} {bm.unit}"
                elif bm.reference_min is not None:
                    ref_text = f"> {bm.reference_min} {bm.unit}"
                elif bm.reference_max is not None:
                    ref_text = f"< {bm.reference_max} {bm.unit}"

            latest_readings.append(
                BiomarkerDataPoint(
                    record_id=bm.record_id or (bm.record.id if bm.record else None),
                    biomarker_name=canon,
                    category=cat,
                    test_date=bm.test_date,
                    value=float(bm.value),
                    value_text=bm.value_text or str(bm.value),
                    unit=bm.unit,
                    reference_min=float(bm.reference_min) if bm.reference_min is not None else None,
                    reference_max=float(bm.reference_max) if bm.reference_max is not None else None,
                    ref_range_text=ref_text,
                    status=bm.status or "normal",
                    lab_name=bm.lab_name,
                )
            )

        abnormal_readings = [dp for dp in latest_readings if dp.status in ("high", "low", "critical")]

        # Sort categories logically
        known_cats = [
            "Complete Blood Count",
            "Liver Function",
            "Kidney Function",
            "Lipid Profile",
            "Diabetes",
            "Thyroid",
            "Electrolytes",
            "Vitamins",
            "Other",
        ]
        sorted_categories = [c for c in known_cats if c in categories_set]
        for c in sorted(categories_set):
            if c not in sorted_categories:
                sorted_categories.append(c)

        return BiomarkerSummaryResponse(
            user_id=user_id,
            total_tests=len(latest_readings),
            abnormal_count=len(abnormal_readings),
            categories=sorted_categories,
            latest_readings=latest_readings,
            abnormal_readings=abnormal_readings,
        )

    @staticmethod
    async def get_biomarker_history(
        db: AsyncSession,
        user_id: UUID,
        test_name: str,
    ) -> BiomarkerHistoryResponse:
        """Return chronological time-series for a specific analyte test_name."""
        canon_name, cat = _normalize_name(test_name)

        # Match both exact raw name, alias, or canonical name
        matching_raw = {
            raw
            for raw, (c, _) in _ALIAS_MAP.items()
            if c.lower() == canon_name.lower() or test_name.lower() in raw.lower()
        }
        all_accepted = matching_raw | {canon_name, test_name}

        query = (
            select(Biomarker)
            .where(Biomarker.user_id == user_id)
            .where(
                or_(
                    Biomarker.biomarker_name.ilike(name) for name in all_accepted
                )
            )
            .order_by(Biomarker.test_date.asc())
            .options(selectinload(Biomarker.record))
        )
        result = await db.scalars(query)
        rows: List[Biomarker] = result.all()

        if not rows:
            return BiomarkerHistoryResponse(
                user_id=user_id,
                test_name=canon_name,
                category=cat,
                unit="",
                latest_value=0.0,
                latest_status="normal",
                trend="stable",
                history=[],
            )

        history: List[BiomarkerDataPoint] = []
        for bm in rows:
            ref_text = bm.ref_range_text
            if not ref_text and (bm.reference_min is not None or bm.reference_max is not None):
                if bm.reference_min is not None and bm.reference_max is not None:
                    ref_text = f"{bm.reference_min} – {bm.reference_max} {bm.unit}"
                elif bm.reference_min is not None:
                    ref_text = f"> {bm.reference_min} {bm.unit}"
                elif bm.reference_max is not None:
                    ref_text = f"< {bm.reference_max} {bm.unit}"

            history.append(
                BiomarkerDataPoint(
                    record_id=bm.record_id or (bm.record.id if bm.record else None),
                    biomarker_name=canon_name,
                    category=bm.category or cat,
                    test_date=bm.test_date,
                    value=float(bm.value),
                    value_text=bm.value_text or str(bm.value),
                    unit=bm.unit,
                    reference_min=float(bm.reference_min) if bm.reference_min is not None else None,
                    reference_max=float(bm.reference_max) if bm.reference_max is not None else None,
                    ref_range_text=ref_text,
                    status=bm.status or "normal",
                    lab_name=bm.lab_name,
                )
            )

        latest_point = history[-1]
        trend = _compute_trend(history, canon_name)

        return BiomarkerHistoryResponse(
            user_id=user_id,
            test_name=canon_name,
            category=latest_point.category or cat,
            unit=latest_point.unit,
            latest_value=latest_point.value,
            latest_status=latest_point.status,
            ref_range_text=latest_point.ref_range_text,
            ref_min=latest_point.reference_min,
            ref_max=latest_point.reference_max,
            trend=trend,
            history=history,
        )

    @staticmethod
    async def get_abnormal_biomarkers(
        db: AsyncSession,
        user_id: UUID,
    ) -> List[BiomarkerDataPoint]:
        """Return all out-of-range analytes for immediate review."""
        summary = await BiomarkerService.get_biomarker_summary(db, user_id)
        return summary.abnormal_readings

    @staticmethod
    async def get_biomarker_timeline(
        db: AsyncSession,
        user_id: UUID,
        biomarker_names: Optional[List[str]] = None,
    ) -> BiomarkerTimelineResponse:
        """Return aggregated biomarker series for backwards compatibility."""
        query = (
            select(Biomarker)
            .where(Biomarker.user_id == user_id)
            .order_by(Biomarker.test_date.asc())
            .options(selectinload(Biomarker.record))
        )

        if biomarker_names:
            canonical_filter: set = set()
            for name in biomarker_names:
                canon, _ = _normalize_name(name)
                canonical_filter.add(canon)
            matching_raw = {
                raw
                for raw, (canon, _) in _ALIAS_MAP.items()
                if canon in canonical_filter
            }
            all_accepted = matching_raw | canonical_filter
            query = query.where(
                or_(
                    Biomarker.biomarker_name.ilike(name)
                    for name in all_accepted
                )
            )

        result = await db.scalars(query)
        rows: List[Biomarker] = result.all()

        grouped: Dict[str, List[Biomarker]] = defaultdict(list)
        for bm in rows:
            canon, _ = _normalize_name(bm.biomarker_name, bm.category)
            grouped[canon].append(bm)

        if biomarker_names:
            canonical_filter = {_normalize_name(n)[0] for n in biomarker_names}
            grouped = {
                k: v for k, v in grouped.items() if k in canonical_filter
            }

        series_list: List[BiomarkerSeries] = []
        total_points = 0
        for canon_name, biomarkers in grouped.items():
            _, category = _normalize_name(biomarkers[0].biomarker_name, biomarkers[0].category)
            unit = biomarkers[0].unit

            data_points: List[BiomarkerDataPoint] = []
            for bm in biomarkers:
                test_dt: date = bm.test_date
                record_id = bm.record_id or (bm.record.id if bm.record else None)
                data_points.append(
                    BiomarkerDataPoint(
                        record_id=record_id,
                        biomarker_name=canon_name,
                        category=category,
                        test_date=test_dt,
                        value=float(bm.value),
                        value_text=bm.value_text or str(bm.value),
                        unit=unit,
                        reference_min=float(bm.reference_min) if bm.reference_min is not None else None,
                        reference_max=float(bm.reference_max) if bm.reference_max is not None else None,
                        status=bm.status or "normal",
                        lab_name=bm.lab_name,
                    )
                )

            trend = _compute_trend(data_points, canon_name)
            series_list.append(
                BiomarkerSeries(
                    biomarker_name=canon_name,
                    category=category,
                    unit=unit,
                    trend=trend,
                    data_points=data_points,
                )
            )
            total_points += len(data_points)

        return BiomarkerTimelineResponse(
            user_id=user_id,
            total_biomarkers=total_points,
            series=series_list,
        )
