"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  ChevronRight,
  ExternalLink,
  Loader2,
  Pill,
  ShieldAlert,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  getInAppNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "@/services/notificationService";
import type { InAppNotification } from "@/types/api";
import { cn } from "@/lib/utils";

function formatRelativeTime(dateString: string, isUrdu: boolean): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return isUrdu ? "ابھی" : "Just now";
    if (diffMins < 60) return isUrdu ? `${diffMins}m ago` : `${diffMins}m ago`;
    if (diffHours < 24) return isUrdu ? `${diffHours}h ago` : `${diffHours}h ago`;
    if (diffDays < 7) return isUrdu ? `${diffDays}d ago` : `${diffDays}d ago`;
    return date.toLocaleDateString(isUrdu ? "ur-PK" : "en-US", { month: "short", day: "numeric" });
  } catch {
    return dateString;
  }
}

type NotificationFilter = "all" | "unread" | "urgent";

export default function NotificationBell() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { dir, isUrdu } = useLanguage();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [activeTab, setActiveTab] = useState<NotificationFilter>("all");

  const fetchAlerts = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await getInAppNotifications(30);
      if (res && Array.isArray(res.items)) {
        setNotifications(res.items);
        setUnreadCount(res.unread_count ?? 0);
      }
    } catch {
      // Ignore background network errors
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchAlerts();

    const handleNewNotif = () => fetchAlerts();
    window.addEventListener("healthvault:new-notification", handleNewNotif);
    window.addEventListener("healthvault:notification-refresh", handleNewNotif);

    const interval = setInterval(fetchAlerts, 30000);

    return () => {
      window.removeEventListener("healthvault:new-notification", handleNewNotif);
      window.removeEventListener("healthvault:notification-refresh", handleNewNotif);
      clearInterval(interval);
    };
  }, [isAuthenticated, fetchAlerts]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setIsLoading(true);
      fetchAlerts().finally(() => setIsLoading(false));
    }
  };

  const handleItemClick = async (notif: InAppNotification) => {
    if (!notif.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      try {
        await markNotificationRead(notif.id);
      } catch {
        // Safe ignore
      }
    }

    setIsOpen(false);
    let targetUrl = notif.action_url || "/notifications";
    if (notif.type === "EMERGENCY_SCAN" && (targetUrl === "/emergency" || targetUrl === "/")) {
      targetUrl = "/emergency/activity";
    }
    router.push(targetUrl);
  };

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMarkingAll(true);
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.warn("Failed to mark all as read:", err);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const target = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (target && !target.is_read) {
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    try {
      await deleteNotification(id);
    } catch {
      // Safe ignore
    }
  };

  const filteredNotifications = notifications.filter((notif) => {
    if (activeTab === "unread") return !notif.is_read;
    if (activeTab === "urgent")
      return notif.type === "EMERGENCY_SCAN" || notif.type === "INTERACTION_ALERT";
    return true;
  });

  const getCategoryMeta = (type: string, isRead: boolean) => {
    switch (type) {
      case "EMERGENCY_SCAN":
        return {
          icon: (
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-500/20 shadow-xs">
              <ShieldAlert className="h-4.5 w-4.5" />
              {!isRead && (
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 border border-white dark:border-slate-900" />
                </span>
              )}
            </div>
          ),
          badgeClass:
            "bg-rose-500/10 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200 dark:border-rose-800/60",
          cardBg: !isRead
            ? "bg-rose-500/[0.03] dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-900/40"
            : "bg-white dark:bg-slate-900/60 border-slate-100 dark:border-slate-800/60",
          label: isUrdu ? "ہنگامی اسکین" : "Emergency Scan",
        };
      case "DOSE_REMINDER":
        return {
          icon: (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
              <Pill className="h-4.5 w-4.5" />
            </div>
          ),
          badgeClass:
            "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60",
          cardBg: !isRead
            ? "bg-emerald-500/[0.03] dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40"
            : "bg-white dark:bg-slate-900/60 border-slate-100 dark:border-slate-800/60",
          label: isUrdu ? "ادویات کی یاد دہانی" : "Medicine Reminder",
        };
      case "INTERACTION_ALERT":
        return {
          icon: (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-500/20 shadow-xs">
              <AlertTriangle className="h-4.5 w-4.5" />
            </div>
          ),
          badgeClass:
            "bg-amber-500/10 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800/60",
          cardBg: !isRead
            ? "bg-amber-500/[0.03] dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/40"
            : "bg-white dark:bg-slate-900/60 border-slate-100 dark:border-slate-800/60",
          label: isUrdu ? "دوائیوں کا باہمی اثر" : "Interaction Warning",
        };
      default:
        return {
          icon: (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400 border border-teal-500/20 shadow-xs">
              <Bell className="h-4.5 w-4.5" />
            </div>
          ),
          badgeClass:
            "bg-teal-500/10 text-teal-700 dark:bg-teal-950/80 dark:text-teal-300 border-teal-200 dark:border-teal-800/60",
          cardBg: !isRead
            ? "bg-teal-500/[0.03] dark:bg-teal-950/20 border-teal-200/60 dark:border-teal-900/40"
            : "bg-white dark:bg-slate-900/60 border-slate-100 dark:border-slate-800/60",
          label: isUrdu ? "سسٹم الرٹ" : "System Alert",
        };
    }
  };

  if (!isAuthenticated) return null;

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-[#15212E]/90 text-slate-700 dark:text-slate-200 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-[#1E2D3D] hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none cursor-pointer"
          aria-label={isUrdu ? "اطلاعات" : "Notifications"}
          title={isUrdu ? "اطلاعات" : "Notifications"}
        >
          <Bell className="h-4.5 w-4.5 text-slate-700 dark:text-slate-200" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-red-600 px-1.5 text-[10px] font-black text-white shadow-md shadow-rose-500/40 animate-pulse border border-white dark:border-slate-900">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[380px] sm:w-[420px] rounded-3xl p-0 shadow-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
      >
        {/* Header */}
        <div
          className="border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/90 dark:bg-slate-900/80 px-4 pt-4 pb-3"
          dir={dir}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-xl bg-vault-teal/10 text-vault-teal dark:bg-teal-500/20 dark:text-teal-300">
                <Bell className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-black tracking-tight text-slate-900 dark:text-white">
                {isUrdu ? "اطلاعات و الرٹس" : "Notifications & Alerts"}
              </h2>
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5 text-[10px] font-black">
                  {unreadCount} {isUrdu ? "نئی" : "new"}
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={isMarkingAll}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-vault-teal hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>{isUrdu ? "سب پڑھیں" : "Mark all read"}</span>
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/60">
            {[
              { key: "all" as const, label: isUrdu ? "تمام" : "All", count: notifications.length },
              { key: "unread" as const, label: isUrdu ? "غیر پڑھا" : "Unread", count: unreadCount },
              {
                key: "urgent" as const,
                label: isUrdu ? "فوری" : "Urgent",
                count: notifications.filter(
                  (n) => (n.type === "EMERGENCY_SCAN" || n.type === "INTERACTION_ALERT") && !n.is_read
                ).length,
              },
            ].map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                    isActive
                      ? "bg-slate-900 text-white dark:bg-vault-teal dark:text-white shadow-xs"
                      : "bg-white/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.2 text-[10px] font-extrabold",
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400"
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notification List */}
        <div className="max-h-[390px] overflow-y-auto p-2 space-y-1.5 scrollbar-thin" dir={dir}>
          {isLoading && notifications.length === 0 ? (
            <div className="flex h-36 items-center justify-center gap-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin text-vault-teal" />
              <span>{isUrdu ? "اطلاعات لوڈ ہو رہی ہیں…" : "Loading notifications…"}</span>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center my-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 mb-2 border border-emerald-500/20">
                <BellOff className="h-6 w-6" />
              </div>
              <p className="text-xs font-extrabold text-slate-900 dark:text-white">
                {isUrdu ? "کوئی نئی اطلاع نہیں ہے" : "All Caught Up!"}
              </p>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 max-w-[250px] leading-relaxed">
                {isUrdu
                  ? "آپ کے پاس تمام ادویات کی یاد دہانیاں اور ہنگامی الرٹس اپ ڈیٹ ہیں۔"
                  : "You have no pending medication reminders or emergency scan alerts."}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const title = isUrdu ? notif.title_ur || notif.title_en : notif.title_en;
              const message = isUrdu ? notif.message_ur || notif.message_en : notif.message_en;
              const relTime = formatRelativeTime(notif.created_at, isUrdu);
              const meta = getCategoryMeta(notif.type, notif.is_read);

              return (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={cn(
                    "group relative flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer select-none",
                    meta.cardBg,
                    "hover:shadow-xs hover:border-slate-300 dark:hover:border-slate-700"
                  )}
                >
                  {/* Category Icon */}
                  {meta.icon}

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md px-2 py-0.5 text-[9.5px] font-extrabold border shrink-0",
                            meta.badgeClass
                          )}
                        >
                          {meta.label}
                        </span>
                        <h3
                          className={cn(
                            "text-xs truncate",
                            notif.is_read
                              ? "font-bold text-slate-800 dark:text-slate-200"
                              : "font-black text-slate-900 dark:text-white"
                          )}
                        >
                          {title}
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
                        {relTime}
                      </span>
                    </div>

                    <p className="mt-1 text-[11.5px] text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                      {message}
                    </p>

                    {/* Action Link & Item Controls */}
                    <div className="mt-2.5 flex items-center justify-between pt-1">
                      {notif.action_url ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-vault-teal dark:text-teal-400 group-hover:translate-x-0.5 transition-transform">
                          <span>
                            {notif.type === "EMERGENCY_SCAN"
                              ? isUrdu
                                ? "ٹائم لائن دیکھیں"
                                : "View Scan Timeline"
                              : isUrdu
                              ? "تفصیلات دیکھیں"
                              : "View Details"}
                          </span>
                          <ExternalLink className="h-3 w-3" />
                        </span>
                      ) : (
                        <span />
                      )}

                      {/* Item Quick Action Hover Buttons */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notif.is_read && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleItemClick(notif);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
                            title={isUrdu ? "پڑھ لیا گیا" : "Mark as read"}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, notif.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                          title={isUrdu ? "حذف کریں" : "Dismiss alert"}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Link */}
        <div className="border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-3 text-center">
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              router.push("/notifications");
            }}
            className="inline-flex items-center justify-center gap-1.5 text-xs font-black text-vault-teal hover:underline dark:text-teal-400 cursor-pointer"
          >
            <span>{isUrdu ? "تمام اطلاعات کی تفصیلات دیکھیں" : "View All Notifications"}</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
