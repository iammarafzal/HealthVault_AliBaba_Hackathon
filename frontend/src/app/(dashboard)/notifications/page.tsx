"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  ExternalLink,
  Filter,
  Loader2,
  Pill,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/context/LanguageContext";
import {
  deleteNotification,
  getInAppNotifications,
  markAllNotificationsRead,
  markNotificationRead,
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

type FilterType = "all" | "unread" | "urgent";

export default function NotificationsPage() {
  const { isUrdu, dir } = useLanguage();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await getInAppNotifications(50);
      if (res && Array.isArray(res.items)) {
        setNotifications(res.items);
      }
    } catch {
      // Ignore background errors
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const urgentCount = notifications.filter(
    (n) => n.type === "EMERGENCY_SCAN" || n.type === "INTERACTION_ALERT"
  ).length;

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.is_read;
    if (filter === "urgent") return n.type === "EMERGENCY_SCAN" || n.type === "INTERACTION_ALERT";
    return true;
  });

  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    try {
      await markNotificationRead(id);
    } catch {
      // Safe ignore
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await markAllNotificationsRead();
    } catch {
      // Safe ignore
    }
  };

  const handleDelete = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await deleteNotification(id);
    } catch {
      // Safe ignore
    }
  };

  const getCategoryMeta = (type: string, isRead: boolean) => {
    switch (type) {
      case "EMERGENCY_SCAN":
        return {
          icon: ShieldAlert,
          iconBg: "bg-rose-500/10 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-500/20",
          cardBg: !isRead
            ? "bg-rose-500/[0.03] dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40"
            : "bg-card border-border/80",
          badge: isUrdu ? "ہنگامی اسکین الرٹ" : "Emergency Scan Alert",
          badgeVariant: "destructive" as const,
        };
      case "DOSE_REMINDER":
        return {
          icon: Pill,
          iconBg: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-500/20",
          cardBg: !isRead
            ? "bg-emerald-500/[0.03] dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40"
            : "bg-card border-border/80",
          badge: isUrdu ? "ادویات کی یاد دہانی" : "Medicine Reminder",
          badgeVariant: "default" as const,
        };
      case "INTERACTION_ALERT":
        return {
          icon: AlertTriangle,
          iconBg: "bg-amber-500/10 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-500/20",
          cardBg: !isRead
            ? "bg-amber-500/[0.03] dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40"
            : "bg-card border-border/80",
          badge: isUrdu ? "دوائیوں کا باہمی اثر" : "Interaction Warning",
          badgeVariant: "secondary" as const,
        };
      default:
        return {
          icon: Bell,
          iconBg: "bg-teal-500/10 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400 border border-teal-500/20",
          cardBg: !isRead
            ? "bg-teal-500/[0.03] dark:bg-teal-950/20 border-teal-200 dark:border-teal-900/40"
            : "bg-card border-border/80",
          badge: isUrdu ? "سسٹم الرٹ" : "System Alert",
          badgeVariant: "outline" as const,
        };
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12" dir={dir}>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-vault-teal/10 text-vault-teal dark:bg-teal-500/20 dark:text-teal-300">
              <Bell className="h-7 w-7" />
            </div>
            {isUrdu ? "اطلاعات و الرٹس" : "Notifications & Alerts"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {unreadCount > 0
              ? isUrdu
                ? `آپ کے پاس ${unreadCount} غیر پڑھا الرٹ${unreadCount > 1 ? "s" : ""} موجود ہیں۔`
                : `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}.`
              : isUrdu
                ? "تمام اطلاعات پڑھ لی گئی ہیں۔"
                : "You're all caught up with your notifications."}
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            className="text-xs font-bold gap-2 rounded-2xl border-vault-teal/30 text-vault-teal hover:bg-vault-teal/10 dark:text-teal-300 shrink-0 cursor-pointer shadow-2xs"
          >
            <CheckCheck className="h-4 w-4" />
            <span>{isUrdu ? "سب پڑھیں" : "Mark all as read"}</span>
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 rounded-2xl border border-border/80 bg-muted/40 p-1.5 shadow-2xs">
        {(
          [
            { key: "all" as const, label: isUrdu ? "تمام" : "All", count: notifications.length, icon: Filter },
            { key: "unread" as const, label: isUrdu ? "غیر پڑھا" : "Unread", count: unreadCount, icon: Bell },
            { key: "urgent" as const, label: isUrdu ? "فوری" : "Urgent", count: urgentCount, icon: ShieldAlert },
          ] as const
        ).map((tab) => {
          const TabIcon = tab.icon;
          const isActive = filter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer",
                isActive
                  ? "bg-slate-900 text-white dark:bg-vault-teal dark:text-white shadow-xs"
                  : "text-muted-foreground hover:bg-background hover:text-foreground"
              )}
            >
              <TabIcon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 text-[10px] font-extrabold",
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Notification List */}
      {isLoading ? (
        <Card className="border-border bg-card rounded-3xl">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-vault-teal" />
            <p className="text-xs text-muted-foreground">
              {isUrdu ? "اطلاعات لوڈ ہو رہی ہیں…" : "Loading notifications…"}
            </p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-border bg-card rounded-3xl shadow-2xs">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-500/20">
              <BellOff className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-foreground">
                {isUrdu ? "کوئی نئی اطلاع نہیں ہے" : "All Clear!"}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
                {filter === "unread"
                  ? isUrdu
                    ? "آپ نے تمام اطلاعات دیکھ لی ہیں۔"
                    : "All notifications have been marked as read."
                  : filter === "urgent"
                  ? isUrdu
                    ? "اس وقت کوئی ہنگامی الرٹ نہیں ہے۔"
                    : "No urgent alerts requiring immediate action."
                  : isUrdu
                  ? "آپ کی ادویات کی یاد دہانیاں اور الرٹس اپ ڈیٹ ہیں۔"
                  : "No notifications registered yet."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((notif) => {
            const title = isUrdu ? notif.title_ur || notif.title_en : notif.title_en;
            const message = isUrdu ? notif.message_ur || notif.message_en : notif.message_en;
            const relTime = formatRelativeTime(notif.created_at, isUrdu);
            const meta = getCategoryMeta(notif.type, notif.is_read);
            const Icon = meta.icon;

            return (
              <Card
                key={notif.id}
                className={cn(
                  "transition-all duration-200 shadow-2xs hover:shadow-md rounded-3xl overflow-hidden group",
                  meta.cardBg
                )}
              >
                <CardContent className="flex items-start gap-4 p-4.5">
                  {/* Category Icon Box */}
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-xs", meta.iconBg)}>
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Content & Actions */}
                  <div className="flex flex-1 flex-col gap-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={meta.badgeVariant} className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg">
                            {meta.badge}
                          </Badge>
                          <h3 className={cn("text-xs sm:text-sm text-foreground", !notif.is_read ? "font-black" : "font-semibold")}>
                            {title}
                          </h3>
                        </div>
                        <p className="text-xs leading-relaxed text-slate-600 dark:text-muted-foreground mt-1">
                          {message}
                        </p>
                      </div>

                      <span className="shrink-0 text-[11px] font-mono text-muted-foreground">
                        {relTime}
                      </span>
                    </div>

                    {/* Footer bar inside card */}
                    <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between gap-2">
                      {notif.action_url ? (
                        <a
                          href={
                            notif.type === "EMERGENCY_SCAN" && (notif.action_url === "/emergency" || notif.action_url === "/")
                              ? "/emergency/activity"
                              : notif.action_url
                          }
                          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-vault-teal hover:underline dark:text-teal-400 group-hover:translate-x-0.5 transition-transform"
                        >
                          <span>
                            {notif.type === "EMERGENCY_SCAN"
                              ? isUrdu
                                ? "ٹائم لائن دیکھیں"
                                : "View Scan Timeline"
                              : isUrdu
                              ? "تفصیلات دیکھیں"
                              : "View Details"}
                          </span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <span />
                      )}

                      <div className="flex items-center gap-2">
                        {!notif.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50 rounded-xl"
                            onClick={() => handleMarkAsRead(notif.id)}
                          >
                            <Check className="mr-1.5 h-3.5 w-3.5" />
                            {isUrdu ? "پڑھ لیا گیا" : "Mark as read"}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs font-bold text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl"
                          onClick={() => handleDelete(notif.id)}
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          {isUrdu ? "حذف کریں" : "Dismiss"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
