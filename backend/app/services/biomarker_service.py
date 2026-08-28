# HealthVault AI — Biomarker Timeline Aggregation Service
# Chronological time-series queries with trend analysis and name normalization.

import logging
from collections import defaultdict
from datetime import date
from typing import Dict, List, Optional, Tuple
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.biomarker import Biomarker
from app.models.record import MedicalRecord
from app.schemas.biomarker import (
    BiomarkerDataPoint,
    BiomarkerSeries,
    BiomarkerTimelineResponse,
)

logger = logging.getLogger("healthvault")

# ---------------------------------------------------------------------------
# Biomarker name aliases → canonical name + category
# ---------------------------------------------------------------------------
_ALIAS_MAP: Dict[str, Tuple[str, str]] = {
    # Diabetes / Glycemic
    "hba1c":                          ("HbA1c", "Diabetes"),
    "hb a1c":                         ("HbA1c", "Diabetes"),
    "glycated hemoglobin":            ("HbA1c", "Diabetes"),
    "hemoglobin a1c":                 ("HbA1c", "Diabetes"),
    "fasting glucose":                ("Fasting Glucose", "Diabetes"),
    "fasting blood glucose":          ("Fasting Glucose", "Diabetes"),
    "fbg":                            ("Fasting Glucose", "Diabetes"),
    "blood glucose":                  ("Fasting Glucose", "Diabetes"),
    "random blood glucose":           ("Fasting Glucose", "Diabetes"),
    "rbg":                            ("Fasting Glucose", "Diabetes"),
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
    "triglyceride":                   ("Triglycerides", "Lipid Profile"),
    # CBC
    "hemoglobin":                     ("Hemoglobin", "CBC"),
    "hb":                             ("Hemoglobin", "CBC"),
    "platelets":                      ("Platelets", "CBC"),
    "platelet count":                 ("Platelets", "CBC"),
    "plt":                            ("Platelets", "CBC"),
    "wbc":                            ("WBC", "CBC"),
    "white blood cells":              ("WBC", "CBC"),
    "white blood cell count":         ("WBC", "CBC"),
    "leukocytes":                     ("WBC", "CBC"),
    "rbc":                            ("RBC", "CBC"),
    "red blood cells":                ("RBC", "CBC"),
    "red blood cell count":           ("RBC", "CBC"),
    # Renal
    "serum creatinine":               ("Serum Creatinine", "Renal"),
    "creatinine":                     ("Serum Creatinine", "Renal"),
    # Hepatic
    "alt":                            ("ALT", "Liver Function"),
    "sgpt":                           ("ALT", "Liver Function"),
    "ast":                            ("AST", "Liver Function"),
    "sgot":                           ("AST", "Liver Function"),
}

# Default clinical reference ranges (midpoint used for trend computation)
_DEFAULT_RANGES: Dict[str, Tuple[float, float]] = {
    "HbA1c":             (4.0, 5.6),
    "Fasting Glucose":   (70.0, 99.0),
    "Total Cholesterol": (0.0, 200.0),
    "LDL Cholesterol":   (0.0, 100.0),
    "HDL Cholesterol":   (40.0, 60.0),
    "Triglycerides":     (0.0, 150.0),
    "Hemoglobin":        (12.0, 17.5),
    "Platelets":         (150.0, 400.0),
    "WBC":               (4.5, 11.0),
    "RBC":               (4.2, 5.9),
    "Serum Creatinine":  (0.7, 1.2),
    "ALT":               (7.0, 56.0),
    "AST":               (10.0, 40.0),
}

# Stability threshold — change < 5 % of reference span → "stable"
_STABILITY_FRACTION = 0.05


def _normalize_name(raw: str) -> Tuple[str, str]:
    """Return (canonical_name, category) for a raw biomarker label."""
    key = raw.strip().lower()
    if key in _ALIAS_MAP:
        return _ALIAS_MAP[key]
    # Fallback: title-case the raw name, category "Other"
    return raw.strip().title(), "Other"


def _compute_trend(
    data_points: List[BiomarkerDataPoint],
    canonical_name: str,
) -> str:
    """Determine trend direction by comparing baseline vs. latest value.

    Logic:
    - If both values are within the reference range → *stable*.
    - If both values are on the same side of the range, compare their
      distance from the nearest boundary.  Closer → *improving*,
      farther → *worsening*.
    - If the value crossed from abnormal to normal → *improving*.
    - If the value crossed from normal to abnormal → *worsening*.
    - Change < 5 % of reference span → *stable*.
    """
    if len(data_points) < 2:
        return "stable"

    baseline = data_points[0].value
    latest = data_points[-1].value

    # Derive reference span from data or fallback defaults
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
    if span == 0:
        return "stable"

    # Classify positions
    baseline_in_range = ref_min <= baseline <= ref_max
    latest_in_range = ref_min <= latest <= ref_max

    # Both within normal range → stable
    if baseline_in_range and latest_in_range:
        return "stable"

    # Transition: abnormal → normal = improving
    if not baseline_in_range and latest_in_range:
        return "improving"

    # Transition: normal → abnormal = worsening
    if baseline_in_range and not latest_in_range:
        return "worsening"

    # Both abnormal — compare distance from nearest healthy boundary
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
    """Async service for chronological biomarker timeline aggregation."""

    @staticmethod
    async def get_biomarker_timeline(
        db: AsyncSession,
        user_id: UUID,
        biomarker_names: Optional[List[str]] = None,
    ) -> BiomarkerTimelineResponse:
        """Return aggregated biomarker series for *user_id*.

        Args:
            db: Async database session.
            user_id: Patient UUID.
            biomarker_names: Optional filter — only return series whose
                canonical name matches one of these (case-insensitive).

        Returns:
            BiomarkerTimelineResponse with chronologically ordered series.
        """
        # Build query — filter by user, optionally by raw name
        query = (
            select(Biomarker)
            .where(Biomarker.user_id == user_id)
            .order_by(Biomarker.test_date.asc())
            .options(selectinload(Biomarker.record))
        )

        if biomarker_names:
            # Accept both canonical and alias names from the caller
            canonical_filter: set = set()
            for name in biomarker_names:
                canon, _ = _normalize_name(name)
                canonical_filter.add(canon)
            # Also include any raw names that map to those canonical names
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

        # Group by canonical name (preserving chronological order)
        grouped: Dict[str, List[Biomarker]] = defaultdict(list)
        for bm in rows:
            canon, _ = _normalize_name(bm.biomarker_name)
            grouped[canon].append(bm)

        # If name filter was provided, only keep matching canonical names
        if biomarker_names:
            canonical_filter = {_normalize_name(n)[0] for n in biomarker_names}
            grouped = {
                k: v for k, v in grouped.items() if k in canonical_filter
            }

        # Build series
        series_list: List[BiomarkerSeries] = []
        total_points = 0
        for canon_name, biomarkers in grouped.items():
            _, category = _normalize_name(biomarkers[0].biomarker_name)
            unit = biomarkers[0].unit

            data_points: List[BiomarkerDataPoint] = []
            for bm in biomarkers:
                # Fallback to record consultation_date if test_date is missing
                test_dt: date = bm.test_date
                record_id: UUID = bm.record_id or (
                    bm.record.id if bm.record else UUID(int=0)
                )
                data_points.append(
                    BiomarkerDataPoint(
                        record_id=record_id,
                        test_date=test_dt,
                        value=float(bm.value),
                        unit=unit,
                        reference_min=float(bm.reference_min) if bm.reference_min is not None else None,
                        reference_max=float(bm.reference_max) if bm.reference_max is not None else None,
                        status=bm.status,
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
