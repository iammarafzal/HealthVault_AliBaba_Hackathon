"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Heart,
  Phone,
  Pill,
  QrCode,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockEmergencyProfile } from "@/lib/mockData";
import { getEmergencyProfile } from "@/services/apiService";
import EmergencyCardModal from "@/components/emergency/EmergencyCardModal";
import type { EmergencyProfile, PrivacySettings } from "@/types/models";

interface EmergencyPageProps {
  params: { health_id: string };
}

/* ── Default privacy settings (all visible) ────────────────── */
const defaultPrivacy: PrivacySettings = {
  show_blood_group: true,
  show_allergies: true,
  show_active_meds: true,
  show_emergency_contacts: true,
  show_chronic_conditions: true,
  qr_revoked: false,
};

export default function EmergencyPage({ params }: EmergencyPageProps) {
  const [profile, setProfile] = useState<EmergencyProfile | null>(
    mockEmergencyProfile
  );
  const [privacy] = useState<PrivacySettings>(defaultPrivacy);
  const [isCardOpen, setIsCardOpen] = useState(false);

  // Fetch real profile from backend
  useEffect(() => {
    getEmergencyProfile(params.health_id)
      .then(setProfile)
      .catch(() => setProfile(mockEmergencyProfile));
  }, [params.health_id]);

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading emergency profile…</p>
      </div>
    );
  }

  // Revoked QR access
  if (profile.is_revoked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-sm space-y-4 text-center">
          <ShieldAlert className="mx-auto h-16 w-16 text-destructive" />
          <h1 className="text-xl font-bold">Access Revoked</h1>
          <p className="text-sm text-muted-foreground">
            This emergency QR code has been revoked by the account holder.
            The emergency profile is no longer publicly accessible.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Red Emergency Banner ─────────────────────────────── */}
      <header className="bg-destructive px-4 py-4 text-destructive-foreground sm:px-6">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-7 w-7" />
              <div>
                <h1 className="text-sm font-bold uppercase tracking-wider sm:text-base">
                  Public Emergency Medical Profile
                </h1>
                <p className="text-xs opacity-90">
                  Health ID: {profile.health_id}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-destructive-foreground/30 bg-transparent text-destructive-foreground hover:bg-destructive-foreground/10"
              onClick={() => setIsCardOpen(true)}
            >
              <QrCode className="mr-1.5 h-3.5 w-3.5" />
              Emergency Card
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
        {/* Patient Name — always visible */}
        <section className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">Patient Details</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Full Name</p>
              <p className="text-lg font-bold">{profile.full_name}</p>
            </div>
            {privacy.show_blood_group && profile.blood_group && (
              <div>
                <p className="text-muted-foreground">Blood Group</p>
                <p className="text-lg font-bold text-destructive">
                  {profile.blood_group}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Critical Allergies — high-contrast red alerts */}
        {privacy.show_allergies && profile.critical_allergies.length > 0 && (
          <section className="rounded-lg border-2 border-destructive/40 bg-destructive/5 p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <h2 className="text-base font-bold text-destructive">
                Severe Allergies
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.critical_allergies.map((allergy) => (
                <span
                  key={allergy}
                  className="rounded-full bg-destructive px-3 py-1.5 text-sm font-bold text-destructive-foreground shadow-sm"
                >
                  ⚠ {allergy}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Chronic Conditions */}
        {privacy.show_chronic_conditions &&
          profile.chronic_conditions.length > 0 && (
            <section className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Heart className="h-5 w-5 text-rose-500" />
                <h2 className="text-base font-semibold">Chronic Conditions</h2>
              </div>
              <ul className="space-y-1.5 text-sm">
                {profile.chronic_conditions.map((condition) => (
                  <li key={condition} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    {condition}
                  </li>
                ))}
              </ul>
            </section>
          )}

        {/* Active Medications */}
        {privacy.show_active_meds &&
          profile.active_medications.length > 0 && (
            <section className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Pill className="h-5 w-5 text-blue-500" />
                <h2 className="text-base font-semibold">Active Medications</h2>
              </div>
              <ul className="space-y-1.5 text-sm">
                {profile.active_medications.map((med) => (
                  <li key={med} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    {med}
                  </li>
                ))}
              </ul>
            </section>
          )}

        {/* Emergency Contacts — with tel: triggers */}
        {privacy.show_emergency_contacts &&
          profile.emergency_contacts.length > 0 && (
            <section className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Phone className="h-5 w-5 text-green-600" />
                <h2 className="text-base font-semibold">Emergency Contacts</h2>
              </div>
              <div className="space-y-2">
                {profile.emergency_contacts.map((contact) => (
                  <div
                    key={contact.name}
                    className="flex items-center justify-between rounded-md border bg-background p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{contact.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {contact.relation}
                      </p>
                    </div>
                    <a
                      href={`tel:${contact.phone}`}
                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      <Phone className="mr-1 inline h-3 w-3" />
                      {contact.phone}
                    </a>
                  </div>
                ))}
              </div>
            </section>
          )}

        {/* Footer */}
        <footer className="flex items-center justify-center gap-2 pb-6 pt-2 text-xs text-muted-foreground">
          <ShieldAlert className="h-3.5 w-3.5" />
          <span>
            Public emergency card — information is read-only. Data provided by
            HealthVault AI.
          </span>
        </footer>
      </main>

      {/* Emergency Card Modal */}
      <EmergencyCardModal
        profile={profile}
        isOpen={isCardOpen}
        onClose={() => setIsCardOpen(false)}
      />
    </div>
  );
}
