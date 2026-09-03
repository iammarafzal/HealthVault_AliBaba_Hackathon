# HealthVault AI — Web Push Dispatcher & Dynamic Medicine Reminder Background Scheduler
# Sends browser push notifications via Web Push API, handles personalized routine meal timings,
# evaluates meal offsets (Before Meal / After Meal), and coordinates auto-dismissal.

import asyncio
import json
import logging
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Set
from uuid import UUID

from pywebpush import WebPushException, webpush
from py_vapid import Vapid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import async_session_factory
from app.models.medication import Medication, MedicationDoseLog
from app.models.notification import PushSubscription
from app.models.user import User
from app.models.user_schedule import PatientRoutineSchedule
from app.services.medication_service import _normalize_schedule

logger = logging.getLogger("healthvault")


class NotificationService:
    def __init__(self):
        self._vapid_key_cache: Optional[Vapid] = None
        # In-memory tracking of dispatched reminders to prevent spamming:
        # Key: (user_id_str, dose_date_iso, slot_key)
        self._dispatched_reminders: Set[str] = set()

    def _get_vapid_key(self) -> Vapid:
        """Parse or load the configured VAPID private key."""
        if self._vapid_key_cache is not None:
            return self._vapid_key_cache

        priv_key_str = settings.VAPID_PRIVATE_KEY
        if priv_key_str.startswith("-----BEGIN"):
            self._vapid_key_cache = Vapid.from_pem(priv_key_str.encode("utf-8"))
        else:
            self._vapid_key_cache = Vapid.from_string(priv_key_str)
        return self._vapid_key_cache

    # ── Subscription Management ─────────────────────────────────────

    async def save_or_update_subscription(
        self,
        db: AsyncSession,
        user_id: UUID,
        endpoint: str,
        p256dh: str,
        auth: str,
        user_agent: Optional[str] = None,
    ) -> PushSubscription:
        """Upsert a browser push subscription for the given user."""
        stmt = select(PushSubscription).where(PushSubscription.endpoint == endpoint)
        result = await db.execute(stmt)
        subscription = result.scalar_one_or_none()

        if subscription:
            subscription.user_id = user_id
            subscription.p256dh = p256dh
            subscription.auth = auth
            subscription.user_agent = user_agent
        else:
            subscription = PushSubscription(
                user_id=user_id,
                endpoint=endpoint,
                p256dh=p256dh,
                auth=auth,
                user_agent=user_agent,
            )
            db.add(subscription)

        await db.commit()
        await db.refresh(subscription)
        return subscription

    async def delete_subscription(
        self,
        db: AsyncSession,
        user_id: UUID,
        endpoint: Optional[str] = None,
    ) -> int:
        """Remove a push subscription or all subscriptions for a user."""
        stmt = select(PushSubscription).where(PushSubscription.user_id == user_id)
        if endpoint:
            stmt = stmt.where(PushSubscription.endpoint == endpoint)

        result = await db.execute(stmt)
        subs = list(result.scalars().all())
        count = len(subs)

        for sub in subs:
            await db.delete(sub)

        await db.commit()
        return count

    async def get_user_subscriptions(
        self,
        db: AsyncSession,
        user_id: UUID,
    ) -> List[PushSubscription]:
        """Fetch all push subscriptions associated with a user."""
        stmt = select(PushSubscription).where(PushSubscription.user_id == user_id)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    # ── Push Notification Dispatcher ────────────────────────────────

    def _sync_send_push(
        self,
        subscription_info: Dict[str, Any],
        payload_str: str,
    ) -> Any:
        """Synchronous pywebpush invocation to be executed in worker thread."""
        vapid_key = self._get_vapid_key()
        return webpush(
            subscription_info=subscription_info,
            data=payload_str,
            vapid_private_key=vapid_key,
            vapid_claims={"sub": settings.VAPID_CLAIM_EMAIL},
            ttl=3600,
        )

    async def send_push_notification(
        self,
        db: AsyncSession,
        subscription: PushSubscription,
        title: str,
        body: str,
        url: str = "/planner",
        tag: Optional[str] = None,
        extra_data: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """Send a single Web Push notification. Clean up expired subscriptions."""
        sub_info = {
            "endpoint": subscription.endpoint,
            "keys": {
                "p256dh": subscription.p256dh,
                "auth": subscription.auth,
            },
        }

        payload_dict = {
            "title": title,
            "body": body,
            "url": url,
            "tag": tag,
            **(extra_data or {}),
        }
        payload_str = json.dumps(payload_dict)

        try:
            await asyncio.to_thread(self._sync_send_push, sub_info, payload_str)
            logger.info(f"Push notification delivered to subscription {subscription.id} (tag: {tag})")
            return True
        except WebPushException as ex:
            status_code = getattr(ex.response, "status_code", None)
            logger.warning(
                f"WebPushException for sub {subscription.id} (status: {status_code}): {ex}"
            )
            # If endpoint is 404 or 410 (Gone/Unsubscribed), purge from database
            if status_code in (404, 410):
                logger.info(f"Purging expired/unregistered push subscription {subscription.id}")
                await db.delete(subscription)
                await db.commit()
            return False
        except Exception as e:
            logger.error(f"Unexpected error sending push to sub {subscription.id}: {e}")
            return False

    async def send_notification_to_user(
        self,
        db: AsyncSession,
        user_id: UUID,
        title: str,
        body: str,
        url: str = "/planner",
        tag: Optional[str] = None,
        extra_data: Optional[Dict[str, Any]] = None,
    ) -> int:
        """Send push notification to all active subscriptions of a user."""
        subscriptions = await self.get_user_subscriptions(db, user_id)
        if not subscriptions:
            return 0

        success_count = 0
        for sub in subscriptions:
            ok = await self.send_push_notification(
                db=db,
                subscription=sub,
                title=title,
                body=body,
                url=url,
                tag=tag,
                extra_data=extra_data,
            )
            if ok:
                success_count += 1
        return success_count

    # ── Notification Auto-Dismissal ─────────────────────────────────

    async def dismiss_slot_notification(
        self,
        db: AsyncSession,
        user_id: UUID,
        slot: str,
        target_date: Optional[date] = None,
    ) -> int:
        """Send a silent Web Push message instructing browser service workers to close active notifications for this slot."""
        effective_date = target_date or date.today()
        tag = f"dose-slot-{slot}-{effective_date.isoformat()}"
        subscriptions = await self.get_user_subscriptions(db, user_id)
        if not subscriptions:
            return 0

        payload = {
            "type": "DISMISS_DOSE_NOTIFICATION",
            "tag": tag,
            "slot": slot,
            "date": effective_date.isoformat(),
        }
        payload_str = json.dumps(payload)

        dismiss_count = 0
        for sub in subscriptions:
            sub_info = {
                "endpoint": sub.endpoint,
                "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
            }
            try:
                await asyncio.to_thread(self._sync_send_push, sub_info, payload_str)
                dismiss_count += 1
            except Exception as e:
                logger.warning(f"Could not deliver dismiss push to subscription {sub.id}: {e}")

        logger.info(f"Broadcasted notification dismissal for user {user_id} slot {slot} (tag: {tag})")
        return dismiss_count

    # ── Time-Window & Slot Identification ───────────────────────────

    @staticmethod
    def _parse_time_to_minutes(time_str: Optional[str], default_mins: int) -> int:
        if not time_str or ":" not in time_str:
            return default_mins
        try:
            parts = time_str.split(":")
            return int(parts[0]) * 60 + int(parts[1])
        except Exception:
            return default_mins

    @staticmethod
    def get_current_time_slot(now: Optional[datetime] = None) -> Optional[str]:
        """Default mapping when no custom user routine is available."""
        current = now or datetime.now()
        hour = current.hour
        if 6 <= hour < 12:
            return "morning"
        elif 12 <= hour < 17:
            return "afternoon"
        elif 17 <= hour <= 23:
            return "night"
        return None

    def get_user_time_slot(
        self,
        schedule: Optional[PatientRoutineSchedule],
        now: Optional[datetime] = None,
    ) -> Optional[str]:
        """Map current local time to the active meal slot based on user's custom routine schedule."""
        if not schedule:
            return self.get_current_time_slot(now)

        current = now or datetime.now()
        cur_mins = current.hour * 60 + current.minute

        b_mins = self._parse_time_to_minutes(schedule.breakfast_time, 8 * 60)
        l_mins = self._parse_time_to_minutes(schedule.lunch_time, 13 * 60 + 30)
        d_mins = self._parse_time_to_minutes(schedule.dinner_time, 20 * 60 + 30)

        # Midpoints separating meal slots
        m_l_mid = (b_mins + l_mins) // 2
        l_d_mid = (l_mins + d_mins) // 2

        # 05:00 onwards: Morning window
        if 300 <= cur_mins < m_l_mid:
            return "morning"
        # Midpoint to lunch-dinner midpoint: Afternoon window
        elif m_l_mid <= cur_mins < l_d_mid:
            return "afternoon"
        # Lunch-dinner midpoint to late night (23:59): Night window
        elif l_d_mid <= cur_mins <= 1439:
            return "night"

        return None

    def is_dose_time_due(
        self,
        med: Medication,
        slot: str,
        schedule: Optional[PatientRoutineSchedule],
        now: Optional[datetime] = None,
    ) -> bool:
        """Evaluate if an active medication is currently due for alert dispatch based on meal offsets:

        - "before_meals": 30 minutes before meal time
        - "after_meals": at meal time or up to 15 minutes after
        - default: reminder_lead_minutes before meal time
        """
        current = now or datetime.now()
        cur_mins = current.hour * 60 + current.minute

        # Determine meal time in minutes for this slot
        lead_mins = schedule.reminder_lead_minutes if schedule else 15
        if slot == "morning":
            meal_time_str = schedule.breakfast_time if schedule else "08:00"
            meal_mins = self._parse_time_to_minutes(meal_time_str, 8 * 60)
        elif slot == "afternoon":
            meal_time_str = schedule.lunch_time if schedule else "13:30"
            meal_mins = self._parse_time_to_minutes(meal_time_str, 13 * 60 + 30)
        else:
            meal_time_str = schedule.dinner_time if schedule else "20:30"
            meal_mins = self._parse_time_to_minutes(meal_time_str, 20 * 60 + 30)

        # Inspect medication dosage_schedule for meal_relation
        sched = med.dosage_schedule or {}
        meal_relation = sched.get("meal_relation", "unspecified")

        if meal_relation == "before_meals":
            target_time = meal_mins - 30
        elif meal_relation == "after_meals":
            target_time = meal_mins
        else:
            target_time = meal_mins - lead_mins

        # Due if current time is within or past the target alert threshold
        return cur_mins >= target_time

    @staticmethod
    def is_medication_scheduled_for_slot(med: Medication, slot: str) -> bool:
        """Determine whether a medication is scheduled for a given time slot."""
        sched = _normalize_schedule(med)
        if not sched:
            return False

        if "time_slots" in sched and isinstance(sched["time_slots"], list):
            s_set = {str(s).lower() for s in sched["time_slots"]}
            if slot == "morning":
                return "morning" in s_set
            elif slot in ("afternoon", "noon"):
                return "afternoon" in s_set or "noon" in s_set
            elif slot in ("evening", "night"):
                return "night" in s_set or "evening" in s_set or "night" in s_set

        if slot == "morning":
            return bool(sched.get("morning"))
        elif slot in ("afternoon", "noon"):
            return bool(sched.get("afternoon"))
        elif slot in ("evening", "night"):
            return bool(sched.get("evening")) or bool(sched.get("night"))
        return False

    # ── In-Process Local Scheduler Job ──────────────────────────────

    async def check_and_dispatch_medicine_reminders(self) -> int:
        """Periodic background job executed by APScheduler.

        1. Identifies active time window (evaluated per user's custom routine).
        2. Queries subscribed users with active medications.
        3. Checks dose logs for today and calculates meal offsets (Before Meal / After Meal).
        4. Sends deterministic-tagged push notifications (tag: dose-slot-{slot}-{date}).
        """
        now = datetime.now()
        today = date.today()
        slot_labels = {
            "morning": {
                "en": "Morning",
                "ur": "صبح",
                "log_slots": ["morning"],
            },
            "afternoon": {
                "en": "Afternoon",
                "ur": "دوپہر",
                "log_slots": ["afternoon", "noon"],
            },
            "night": {
                "en": "Night",
                "ur": "رات",
                "log_slots": ["night", "evening"],
            },
        }

        dispatched_count = 0

        async with async_session_factory() as db:
            # 1. Query users who have at least one push subscription with their routine schedule
            sub_users_stmt = (
                select(User)
                .join(PushSubscription, User.id == PushSubscription.user_id)
                .options(selectinload(User.routine_schedule))
                .distinct()
            )
            sub_users_res = await db.execute(sub_users_stmt)
            users = list(sub_users_res.scalars().all())

            for user in users:
                # Determine user's current active slot
                current_slot = self.get_user_time_slot(user.routine_schedule, now)
                if not current_slot:
                    continue

                slot_info = slot_labels.get(current_slot)
                if not slot_info:
                    continue

                # Check deduplication to prevent sending multiple notifications in same window
                dispatch_key = f"{user.id}_{today.isoformat()}_{current_slot}"
                if dispatch_key in self._dispatched_reminders:
                    continue

                # 2. Query user's active medications
                meds_stmt = select(Medication).where(
                    Medication.user_id == user.id,
                    Medication.is_active.is_(True),
                )
                meds_res = await db.execute(meds_stmt)
                all_active_meds = list(meds_res.scalars().all())

                # Filter medications scheduled for current slot
                slot_meds = [
                    m for m in all_active_meds
                    if self.is_medication_scheduled_for_slot(m, current_slot)
                ]
                if not slot_meds:
                    continue

                # 3. Query dose logs taken today for this user and this slot
                slot_med_ids = [m.id for m in slot_meds]
                logs_stmt = select(MedicationDoseLog).where(
                    MedicationDoseLog.user_id == user.id,
                    MedicationDoseLog.dose_date == today,
                    MedicationDoseLog.time_slot.in_(slot_info["log_slots"]),
                    MedicationDoseLog.medication_id.in_(slot_med_ids),
                    MedicationDoseLog.taken.is_(True),
                )
                logs_res = await db.execute(logs_stmt)
                taken_med_ids = {log.medication_id for log in logs_res.scalars().all()}

                # Filter out medications already taken today
                pending_meds = [m for m in slot_meds if m.id not in taken_med_ids]
                if not pending_meds:
                    continue

                # Check if doses are due based on custom meal routine offsets
                due_meds = [
                    m for m in pending_meds
                    if self.is_dose_time_due(m, current_slot, user.routine_schedule, now)
                ]
                if not due_meds:
                    continue

                # 4. Build bilingual push payload with deterministic tag
                med_names = ", ".join(m.name for m in due_meds[:3])
                if len(due_meds) > 3:
                    med_names += f" (+{len(due_meds) - 3} more)"

                title = "HealthVault Medicine Reminder"
                slot_en = slot_info["en"]
                slot_ur = slot_info["ur"]
                body = (
                    f"Time to take your {slot_en} medicines: {med_names}. Tap to mark as taken.\n"
                    f"صحت والٹ: {slot_ur} کی ادویات کا وقت ہو گیا ہے۔"
                )

                tag = f"dose-slot-{current_slot}-{today.isoformat()}"

                sent = await self.send_notification_to_user(
                    db=db,
                    user_id=user.id,
                    title=title,
                    body=body,
                    url=f"/planner?slot={current_slot}",
                    tag=tag,
                    extra_data={
                        "slot": current_slot,
                        "date": today.isoformat(),
                        "tag": tag,
                        "medication_ids": [str(m.id) for m in due_meds],
                    },
                )
                if sent > 0:
                    self._dispatched_reminders.add(dispatch_key)
                    dispatched_count += sent

        logger.info(f"Medicine reminder check completed. Sent {dispatched_count} notifications.")
        return dispatched_count


notification_service = NotificationService()
