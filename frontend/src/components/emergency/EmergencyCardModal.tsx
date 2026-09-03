"use client";

import { useEffect } from "react";
import { Download, Printer, QrCode, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EmergencyProfile } from "@/types/models";
import QRCodeCanvas from "@/components/emergency/QRCodeCanvas";

interface EmergencyCardModalProps {
  profile: EmergencyProfile;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Printable wallet emergency card modal.
 * Uses standard credit card (CR80) dimensions and print stylesheet.
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 mx-auto w-full max-w-lg space-y-4 rounded-2xl border border-vault-border bg-card p-6 shadow-2xl dark:border-border">
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-3.5 top-3.5 h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-vault-red/10 text-vault-red">
            <QrCode className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Printable Emergency Health Card</h2>
            <p className="text-xs text-muted-foreground">
              Credit card sized wallet badge for first responders and emergency doctors
            </p>
          </div>
        </div>

        {/* ── Red PVC Wallet Card ── */}
        <div
          id="emergency-card-print"
          className="emergency-card-container relative mx-auto w-full max-w-[420px] overflow-hidden rounded-2xl border border-red-800 bg-gradient-to-br from-[#C0392B] via-[#A93226] to-[#78281F] p-4 text-white shadow-xl aspect-[1.586/1] flex flex-col justify-between"
        >
          {/* Card Top Banner */}
          <div className="flex items-center justify-between border-b border-white/20 pb-2">
            <div className="flex items-center gap-1.5">
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[#C0392B]">
                <ShieldAlert className="h-3 w-3" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-white">
                HealthVault AI &bull; Emergency Medical ID
              </span>
            </div>
            <span className="text-[9px] font-bold text-red-200">
              {profile.is_revoked ? "SHARING OFF" : "ACTIVE ID"}
            </span>
          </div>

          {/* Card Body Grid */}
          <div className="flex items-center gap-3.5 py-1">
            {/* Dynamic QR Canvas */}
            <div className="flex flex-col items-center justify-center rounded-xl bg-white p-1.5 shadow-md shrink-0">
              <QRCodeCanvas healthId={profile.health_id} size={84} />
            </div>

            {/* Patient Info */}
            <div className="flex-1 space-y-1 overflow-hidden">
              <div>
                <p className="text-[8px] font-bold uppercase tracking-wider text-red-200">
                  Patient Name
                </p>
                <p className="truncate text-sm font-black tracking-tight text-white">
                  {profile.full_name.toUpperCase()}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                <div>
                  <p className="text-[8px] font-bold uppercase text-red-200">Blood Type</p>
                  <p className="font-black text-white">
                    {profile.blood_group || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] font-bold uppercase text-red-200">Health ID</p>
                  <p className="font-bold text-white truncate">
                    {profile.health_id}
                  </p>
                </div>
              </div>

              {profile.critical_allergies.length > 0 && (
                <div>
                  <p className="text-[8px] font-bold uppercase text-red-200">Critical Allergies</p>
                  <p className="truncate text-[10px] font-bold text-amber-200">
                    {profile.critical_allergies.join(", ")}
                  </p>
                </div>
              )}

              {primaryContact && (
                <div>
                  <p className="text-[8px] font-bold uppercase text-red-200">Emergency ICE Contact</p>
                  <p className="truncate text-[10px] font-bold text-white">
                    {primaryContact.relation}: {primaryContact.phone}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Card Footer Microtext */}
          <div className="border-t border-white/20 pt-1.5 text-center">
            <p className="text-[8px] font-medium leading-tight text-red-100">
              Scan with any smartphone camera for first responder emergency details &bull; No login required
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          <Button
            className="flex-1 bg-vault-teal text-xs font-bold text-white shadow-xs hover:bg-vault-active"
            onClick={() => window.print()}
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print Wallet Card
          </Button>
          <Button
            variant="outline"
            className="text-xs font-semibold"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
