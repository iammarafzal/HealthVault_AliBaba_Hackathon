"use client";

import { useState } from "react";
import {
  Eye,
  EyeOff,
  QrCode,
  RefreshCw,
  Shield,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PrivacyToggle {
  key: string;
  label: string;
  description: string;
  defaultValue: boolean;
}

const privacyToggles: PrivacyToggle[] = [
  {
    key: "show_blood_group",
    label: "Show Blood Group",
    description:
      "Display your blood group on the Emergency QR card visible to first responders.",
    defaultValue: true,
  },
  {
    key: "show_allergies",
    label: "Show Allergies",
    description:
      "Display known drug & environmental allergies on the emergency card.",
    defaultValue: true,
  },
  {
    key: "show_active_meds",
    label: "Show Active Medications",
    description:
      "Display your current medication list on the emergency card.",
    defaultValue: true,
  },
  {
    key: "show_emergency_contacts",
    label: "Show Emergency Contacts",
    description:
      "Allow emergency responders to see your designated contact numbers.",
    defaultValue: true,
  },
];

export default function SettingsPage() {
  const [toggles, setToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(privacyToggles.map((t) => [t.key, t.defaultValue]))
  );
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleToggle = (key: string) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleRegenerateQR = async () => {
    setIsRegenerating(true);
    await new Promise((r) => setTimeout(r, 2000));
    setIsRegenerating(false);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Privacy &amp; Security Settings
        </h1>
        <p className="text-muted-foreground">
          Manage field visibility on your Emergency Card.
        </p>
      </div>

      {/* Privacy toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-primary" />
            Emergency Card Visibility
          </CardTitle>
          <CardDescription>
            Control which fields are visible when someone scans your QR code.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {privacyToggles.map((toggle) => {
            const isOn = toggles[toggle.key];
            return (
              <div
                key={toggle.key}
                className="flex items-center justify-between gap-4 rounded-lg border p-4"
              >
                <div className="flex items-start gap-3">
                  {isOn ? (
                    <Eye className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
                    <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{toggle.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {toggle.description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(toggle.key)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                    isOn ? "bg-primary" : "bg-muted"
                  }`}
                  role="switch"
                  aria-checked={isOn}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-background shadow transition-transform ${
                      isOn ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* QR Code section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <QrCode className="h-4 w-4 text-primary" />
            Emergency QR Code
          </CardTitle>
          <CardDescription>
            Your unique QR code grants zero-login access to your emergency
            profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* QR placeholder */}
          <div className="flex items-center justify-center rounded-lg border border-dashed p-8">
            <div className="flex flex-col items-center gap-3 text-center">
              <QrCode className="h-24 w-24 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">
                QR Code renders here via{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
                  qrcode.react
                </code>
              </p>
              <p className="text-[11px] text-muted-foreground">
                Health ID: HV-PAK-98214
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleRegenerateQR}
              disabled={isRegenerating}
              className="flex-1"
            >
              {isRegenerating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Regenerating…
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Regenerate QR Code
                </>
              )}
            </Button>
            <Button variant="outline">
              <ShieldCheck className="mr-2 h-4 w-4" />
              Revoke Access
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security note */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-3 py-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-semibold">Security Notice</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Your emergency data is encrypted at rest and in transit. Revoking
              QR access immediately invalidates all active emergency scans.
              Changes take effect within 60 seconds.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
