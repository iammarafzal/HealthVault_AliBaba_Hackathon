/**
 * HealthVault AI — Patient Routine Schedule Service
 * Interacts with backend endpoints to manage customized daily meal routine timings (Breakfast, Lunch, Dinner).
 */

import apiClient from "@/services/apiClient";

export interface RoutineSchedule {
  id: string;
  user_id: string;
  breakfast_time: string;
  lunch_time: string;
  dinner_time: string;
  reminder_lead_minutes: number;
  timezone: string;
  updated_at: string;
}

export interface RoutineScheduleUpdate {
  breakfast_time?: string;
  lunch_time?: string;
  dinner_time?: string;
  reminder_lead_minutes?: number;
  timezone?: string;
}

/** Fetch patient's routine meal schedule. */
export async function getRoutineSchedule(): Promise<RoutineSchedule> {
  const response = await apiClient.get("/user/routine-schedule");
  return response as unknown as RoutineSchedule;
}

/** Update patient's routine meal timings and reminder lead time. */
export async function updateRoutineSchedule(
  payload: RoutineScheduleUpdate
): Promise<RoutineSchedule> {
  const response = await apiClient.put("/user/routine-schedule", payload);
  return response as unknown as RoutineSchedule;
}
