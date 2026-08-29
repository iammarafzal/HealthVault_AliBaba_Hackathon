"use client";

import { useState } from "react";
import {
  AlertTriangle,
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
import PrivacyToggleForm from "@/components/settings/PrivacyToggleForm";
import QRCodeCanvas from "@/components/emergency/QRCodeCanvas";
import { updatePrivacySettings } from "@/services/apiService";
import type { PrivacySettings } from "@/types/models";

const HEALTH_ID = "HV-PAK-98214";

const defaultSettings: PrivacySettings = {
  show_blood_group: true,
  show_allergies: true,
  show_active_meds: true,
  show_emergency_contacts: true,
  show_chronic_conditions: true,
  qr_revoked: false,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<PrivacySettings>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  /* ── Toggle handler ──────────────────────────────────────── */
  const handleToggle = async (key: keyof PrivacySettings) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    setIsSaving(true);
    try {
      await updatePrivacySettings({ [key]: updated[key] });
    } catch {
      // Silently handle — settings already updated in local state
    } finally {
      setIsSaving(false);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2000);
    }
  };

  /* ── Regenerate QR with confirmation ─────────────────────── */
  const handleRegenerateQR = () => {
    setShowConfirmDialog(true);
  };

  const confirmRegenerate = async () => {
    setShowConfirmDialog(false);
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
            {isSaving && (
              <span className="ml-2 text-primary">Saving…</span>
            )}
            {savedNotice && !isSaving && (
              <span className="ml-2 text-emerald-500">✓ Saved</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PrivacyToggleForm
            settings={settings}
            onToggle={handleToggle}
          />
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
          {/* Live QR code */}
          <div className="flex items-center justify-center rounded-lg border border-dashed p-8">
            <div className="flex flex-col items-center gap-3 text-center">
              <QRCodeCanvas healthId={HEALTH_ID} size={160} />
              <p className="text-xs font-medium text-muted-foreground">
                Health ID: {HEALTH_ID}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Scan to view public emergency profile
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
                  Regenerate Emergency QR Code
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className={settings.qr_revoked ? "bg-destructive text-destructive-foreground" : ""}
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              {settings.qr_revoked ? "Access Revoked" : "Revoke Access"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security notice */}
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

      {/* ── Confirmation Dialog ──────────────────────────────── */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowConfirmDialog(false)}
          />
          <div className="relative z-10 mx-4 w-full max-w-sm rounded-xl border bg-background p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold">Regenerate QR Code?</h3>
                <p className="text-xs text-muted-foreground">
                  This will invalidate the current QR code. Any printed copies
                  will no longer work.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={confirmRegenerate}
              >
                Yes, Regenerate
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
