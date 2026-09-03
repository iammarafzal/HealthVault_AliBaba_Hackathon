"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  Check,
  Pencil,
  Phone,
  PhoneCall,
  Plus,
  ShieldCheck,
  Star,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ContactEditModal from "@/components/emergency/ContactEditModal";
import { useLanguage } from "@/context/LanguageContext";
import type {
  EmergencyContactCreate,
  EmergencyContactResponse,
  EmergencyContactUpdate,
} from "@/types/api";

export interface EmergencyContactsCardProps {
  contacts: EmergencyContactResponse[];
  onAddContact: (payload: EmergencyContactCreate) => Promise<void>;
  onUpdateContact: (id: string, payload: EmergencyContactUpdate) => Promise<void>;
  onDeleteContact: (id: string) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

export default function EmergencyContactsCard({
  contacts = [],
  onAddContact,
  onUpdateContact,
  onDeleteContact,
  isLoading = false,
  className = "",
}: EmergencyContactsCardProps) {
  const { locale, t } = useLanguage();
  const isUrdu = locale === "ur";

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContactResponse | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleOpenAdd = () => {
    setEditingContact(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (contact: EmergencyContactResponse) => {
    setEditingContact(contact);
    setIsModalOpen(true);
  };

  const handleSave = async (payload: EmergencyContactCreate | EmergencyContactUpdate, id?: string) => {
    setActionError(null);
    try {
      if (id) {
        await onUpdateContact(id, payload);
        setActionSuccess(t("emergency.contactSaved", "Emergency contact saved successfully."));
      } else {
        await onAddContact(payload as EmergencyContactCreate);
        setActionSuccess(t("emergency.contactSaved", "Emergency contact saved successfully."));
      }
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : isUrdu ? "خرابی پیش آگئی۔" : "Failed to save contact.");
      throw err;
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    const confirmed = window.confirm(
      t("emergency.confirmDeleteContact", "Are you sure you want to delete this emergency contact?")
    );
    if (!confirmed) return;

    setDeletingId(id);
    setActionError(null);
    try {
      await onDeleteContact(id);
      setActionSuccess(t("emergency.contactDeleted", "Emergency contact removed."));
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : isUrdu ? "حذف کرنے میں خرابی۔" : "Failed to delete contact.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Card className={`border-border bg-card shadow-xs ${className}`} dir={isUrdu ? "rtl" : "ltr"}>
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <PhoneCall className="h-5 w-5 text-vault-teal dark:text-teal-400" />
              <CardTitle className="text-base font-bold">
                {t("emergency.contactsCardTitle", "Emergency Contacts (ICE)")}
              </CardTitle>
            </div>
            <Button
              size="sm"
              onClick={handleOpenAdd}
              disabled={isLoading}
              className="bg-vault-teal hover:bg-vault-teal-dark text-white font-bold text-xs h-8 rounded-lg px-3 gap-1.5 shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t("emergency.addContact", "Add Emergency Contact")}</span>
            </Button>
          </div>
          <CardDescription className="text-xs">
            {t(
              "emergency.contactsCardSub",
              "Primary and secondary contacts notified during an emergency."
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 pt-4">
          {actionSuccess && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <Check className="h-4 w-4 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {actionError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 text-xs text-red-700 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-2 py-1">
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-6 px-4 rounded-xl border border-dashed border-border bg-muted/20 space-y-2">
              <ShieldCheck className="mx-auto h-7 w-7 text-muted-foreground/60" />
              <p className="text-xs font-bold text-foreground">
                {t("emergency.noContacts", "No emergency contacts configured yet")}
              </p>
              <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                {t(
                  "emergency.noContactsSub",
                  "Add at least one ICE contact so paramedics and first responders can reach your family."
                )}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenAdd}
                className="mt-1 text-xs font-semibold h-8 rounded-lg text-vault-teal border-vault-teal/30 hover:bg-vault-teal/10"
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                <span>{t("emergency.addContact", "Add Emergency Contact")}</span>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {contacts.map((contact, index) => {
                const isPrimary = Boolean(contact.is_primary) || index === 0;
                return (
                  <div
                    key={contact.id || index}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                      isPrimary
                        ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/10"
                        : "border-border/70 bg-muted/20 hover:bg-muted/30"
                    }`}
                  >
                    {/* Contact Details */}
                    <div className="space-y-1 min-w-0 flex-1 pe-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-foreground truncate">
                          {contact.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          · {contact.relation}
                        </span>
                        {isPrimary && (
                          <Badge className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md gap-1">
                            <Star className="h-2.5 w-2.5 fill-current" />
                            {t("emergency.primaryBadge", "Primary ICE")}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${contact.phone}`}
                          className="inline-flex items-center gap-1 text-xs font-mono font-medium text-vault-teal hover:underline dark:text-teal-400"
                          dir="ltr"
                        >
                          <Phone className="h-3 w-3 shrink-0" />
                          <span>{contact.phone}</span>
                        </a>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(contact)}
                        className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                        title={t("emergency.editContact", "Edit Contact")}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(contact.id)}
                        disabled={deletingId === contact.id}
                        className="h-8 w-8 p-0 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                        title={t("emergency.deleteContact", "Delete Contact")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inline Add / Edit Modal */}
      <ContactEditModal
        isOpen={isModalOpen}
        contact={editingContact}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
      />
    </>
  );
}
