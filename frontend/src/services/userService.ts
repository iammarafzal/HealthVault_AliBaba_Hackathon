/**
 * HealthVault AI — User Service
 * Account management: profile update, email change, password change, account deletion.
 */

import apiClient from "@/services/apiClient";
import type { UserResponse, UserProfileUpdate } from "@/types/api";

/** Update profile vitals (full_name, phone, blood_group, dob, gender). */
export async function updateProfile(
  profileData: UserProfileUpdate
): Promise<UserResponse> {
  return apiClient.patch("/user/profile", profileData) as unknown as UserResponse;
}

/** Change email address — requires current password for verification. */
export async function updateEmail(
  newEmail: string,
  currentPassword: string
): Promise<UserResponse> {
  return apiClient.patch("/user/email", {
    new_email: newEmail,
    current_password: currentPassword,
  }) as unknown as UserResponse;
}

/** Change password — requires current password for verification. */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ status: string; message: string }> {
  return apiClient.patch("/user/password", {
    current_password: currentPassword,
    new_password: newPassword,
  }) as unknown as { status: string; message: string };
}

/** Permanently delete the user's account and all associated data. */
export async function deleteAccount(
  password: string,
  confirmationPhrase: string
): Promise<{ status: string; message: string }> {
  return apiClient.delete("/user/account", {
    data: {
      password,
      confirmation_phrase: confirmationPhrase,
    },
  }) as unknown as { status: string; message: string };
}
