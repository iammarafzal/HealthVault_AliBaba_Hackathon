"use client";

import { useEffect } from "react";
import { Printer, QrCode, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EmergencyProfile } from "@/types/models";
import QRCodeCanvas from "@/components/emergency/QRCodeCanvas";

interface EmergencyCardModalProps {
  profile: EmergencyProfile;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Credit-card-sized wallet badge with emergency info and dynamic QR code.
 * Includes @media print styles for clean wallet-sized card printing.
 */
export default function EmergencyCardModal({
  profile,
  isOpen,
  onClose,
}: EmergencyCardModalProps) {
  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const primaryContact = profile.emergency_contacts[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 mx-4 w-full max-w-md space-y-4 rounded-xl border bg-background p-6 shadow-2xl">
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-3 top-3 h-8 w-8"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
            <QrCode className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Emergency Health Card</h2>
            <p className="text-xs text-muted-foreground">
              Printable wallet-sized emergency access card
            </p>
          </div>
        </div>

        {/* ── Wallet Card ─────────────────────────────────── */}
        <div
          id="emergency-card-print"
          className="emergency-card-container mx-auto w-full max-w-[380px] overflow-hidden rounded-xl border-2 border-destructive/30 bg-gradient-to-br from-destructive/5 via-background to-background shadow-lg"
        >
          {/* Card header */}
          <div className="bg-destructive px-4 py-2.5 text-destructive-foreground">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">
                HealthVault AI Emergency Access
              </span>
            </div>
          </div>

          {/* Card body */}
          <div className="flex gap-4 p-4">
            {/* Left: patient info */}
            <div className="flex-1 space-y-2.5">
              <div>
                <p className="text-[10px] font-medium uppercase text-muted-foreground">
                  Patient Name
                </p>
                <p className="text-sm font-bold">{profile.full_name}</p>
              </div>
              <div className="flex gap-4">
                <div>
                  <p className="text-[10px] font-medium uppercase text-muted-foreground">
                    Health ID
                  </p>
                  <p className="text-xs font-semibold">{profile.health_id}</p>
                </div>
                {profile.blood_group && (
                  <div>
                    <p className="text-[10px] font-medium uppercase text-muted-foreground">
                      Blood Group
                    </p>
                    <p className="text-xs font-bold text-destructive">
                      {profile.blood_group}
                    </p>
                  </div>
                )}
              </div>
              {primaryContact && (
                <div>
                  <p className="text-[10px] font-medium uppercase text-muted-foreground">
                    Emergency Contact
                  </p>
                  <p className="text-xs font-semibold">
                    {primaryContact.name} — {primaryContact.phone}
                  </p>
                </div>
              )}
              {profile.critical_allergies.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium uppercase text-destructive">
                    Allergies
                  </p>
                  <p className="text-xs font-semibold text-destructive">
                    {profile.critical_allergies.join(", ")}
                  </p>
                </div>
              )}
            </div>

            {/* Right: QR code */}
            <div className="flex shrink-0 flex-col items-center justify-center">
              <QRCodeCanvas healthId={profile.health_id} size={100} />
              <p className="mt-1 text-[8px] text-muted-foreground">
                Scan for full profile
              </p>
            </div>
          </div>

          {/* Card footer */}
          <div className="border-t px-4 py-1.5 text-center text-[8px] text-muted-foreground">
            Scan QR or visit healthvault.ai/emergency/{profile.health_id}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={() => window.print()}
          >
            <Printer className="mr-2 h-4 w-4" />
            Print Card
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
