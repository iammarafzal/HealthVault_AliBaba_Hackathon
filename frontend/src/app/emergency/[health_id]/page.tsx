import { mockEmergencyProfile } from "@/lib/mockData";
import {
  AlertTriangle,
  Activity,
  Heart,
  Pill,
  Phone,
  ShieldAlert,
  FileText,
} from "lucide-react";

interface EmergencyPageProps {
  params: { health_id: string };
}

export default function EmergencyPage({ params }: EmergencyPageProps) {
  const profile = mockEmergencyProfile;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-destructive px-4 py-4 text-destructive-foreground sm:px-6">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <ShieldAlert className="h-7 w-7" />
          <div>
            <h1 className="text-lg font-bold">Emergency Medical Card</h1>
            <p className="text-sm opacity-90">
              Health ID: {profile.health_id}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
        {/* Patient Info */}
        <section className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">Patient Information</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Full Name</p>
              <p className="font-medium">{profile.full_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Blood Group</p>
              <p className="font-medium">{profile.blood_group ?? "N/A"}</p>
            </div>
          </div>
        </section>

        {/* Critical Allergies */}
        {profile.critical_allergies.length > 0 && (
          <section className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <h2 className="text-base font-semibold text-destructive">
                Critical Allergies
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.critical_allergies.map((allergy) => (
                <span
                  key={allergy}
                  className="rounded-full bg-destructive px-3 py-1 text-xs font-medium text-destructive-foreground"
                >
                  {allergy}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Chronic Conditions */}
        {profile.chronic_conditions.length > 0 && (
          <section className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Heart className="h-5 w-5 text-rose-500" />
              <h2 className="text-base font-semibold">Chronic Conditions</h2>
            </div>
            <ul className="space-y-1 text-sm">
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
        {profile.active_medications.length > 0 && (
          <section className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Pill className="h-5 w-5 text-blue-500" />
              <h2 className="text-base font-semibold">Active Medications</h2>
            </div>
            <ul className="space-y-1 text-sm">
              {profile.active_medications.map((med) => (
                <li key={med} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  {med}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Emergency Contacts */}
        {profile.emergency_contacts.length > 0 && (
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
                    <p className="text-muted-foreground">
                      {contact.relation}
                    </p>
                  </div>
                  <a
                    href={`tel:${contact.phone}`}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    {contact.phone}
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="flex items-center justify-center gap-2 pb-6 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          <span>
            This is a public emergency card. Information is read-only.
          </span>
        </footer>
      </main>
    </div>
  );
}
