"use client";

import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  Filter,
  ShieldAlert,
  Trash2,
  User,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Notification {
  id: number;
  title: string;
  description: string;
  time: string;
  icon: React.ElementType;
  urgent: boolean;
  read: boolean;
}

const initialNotifications: Notification[] = [
  {
    id: 1,
    title: "Missed Metformin 500mg dose",
    description:
      "You missed your scheduled morning dose of Metformin 500mg. Take it as soon as possible or consult your doctor.",
    time: "2 hours ago",
    icon: Clock,
    urgent: true,
    read: false,
  },
  {
    id: 2,
    title: "Drug interaction flagged in recent upload",
    description:
      "A potential drug-drug interaction was detected between Warfarin and Aspirin in your recently uploaded prescription. Please review.",
    time: "5 hours ago",
    icon: ShieldAlert,
    urgent: true,
    read: false,
  },
  {
    id: 3,
    title: "Emergency QR accessed",
    description:
      "Your emergency QR code was scanned from an unknown device. If this wasn't you, consider revoking access from Privacy Settings.",
    time: "1 day ago",
    icon: User,
    urgent: false,
    read: false,
  },
  {
    id: 4,
    title: "Lab report processed successfully",
    description:
      "Your CBC lab report has been extracted and stored in the Medical Vault. Biomarker values are now available for review.",
    time: "2 days ago",
    icon: Bell,
    urgent: false,
    read: true,
  },
  {
    id: 5,
    title: "Daily medication reminder",
    description:
      "Reminder: Take Atorvastatin 10mg before bed tonight. Consistent timing helps maximize effectiveness.",
    time: "2 days ago",
    icon: Clock,
    urgent: false,
    read: true,
  },
  {
    id: 6,
    title: "Doctor summary generated",
    description:
      "Your 1-page clinical summary has been updated with the latest records. You can view and print it from the Clinical Summary page.",
    time: "3 days ago",
    icon: Check,
    urgent: false,
    read: true,
  },
];

type FilterType = "all" | "unread" | "urgent";

export default function NotificationsPage() {
  const [notifications, setNotifications] =
    useState<Notification[]>(initialNotifications);
  const [filter, setFilter] = useState<FilterType>("all");

  /* ── Derived lists ──────────────────────────────────────── */
  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "urgent") return n.urgent;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;
  const urgentCount = notifications.filter((n) => n.urgent).length;

  /* ── Handlers ───────────────────────────────────────────── */
  const markAsRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAllRead = () => {
    setNotifications((prev) => prev.filter((n) => !n.read));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}.`
              : "You're all caught up."}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              <CheckCheck className="mr-1.5 h-4 w-4" />
              Mark all read
            </Button>
          )}
          {notifications.some((n) => n.read) && (
            <Button variant="outline" size="sm" onClick={clearAllRead}>
              <Trash2 className="mr-1.5 h-4 w-4" />
              Clear read
            </Button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg border p-1">
        {(
          [
            { key: "all" as const, label: "All", count: notifications.length },
            { key: "unread" as const, label: "Unread", count: unreadCount },
            { key: "urgent" as const, label: "Urgent", count: urgentCount },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              filter === tab.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {tab.key === "all" && <Filter className="h-3.5 w-3.5" />}
            {tab.key === "unread" && <Bell className="h-3.5 w-3.5" />}
            {tab.key === "urgent" && <ShieldAlert className="h-3.5 w-3.5" />}
            {tab.label}
            <Badge
              variant="secondary"
              className="ml-1 h-5 min-w-[20px] px-1 text-[11px]"
            >
              {tab.count}
            </Badge>
          </button>
        ))}
      </div>

      {/* Notification list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Bell className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">No notifications</p>
              <p className="text-xs text-muted-foreground">
                {filter === "unread"
                  ? "All notifications have been read."
                  : filter === "urgent"
                    ? "No urgent notifications right now."
                    : "Nothing to show yet."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => {
            const Icon = n.icon;
            return (
              <Card
                key={n.id}
                className={cn(
                  "transition-colors",
                  !n.read && "border-l-4 border-l-primary",
                  n.urgent && !n.read && "border-l-destructive"
                )}
              >
                <CardContent className="flex items-start gap-4 py-4">
                  {/* Icon */}
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                      n.urgent
                        ? "bg-destructive/10"
                        : n.read
                          ? "bg-muted"
                          : "bg-primary/10"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5",
                        n.urgent
                          ? "text-destructive"
                          : n.read
                            ? "text-muted-foreground"
                            : "text-primary"
                      )}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p
                          className={cn(
                            "text-sm",
                            n.read ? "font-medium" : "font-bold"
                          )}
                        >
                          {n.title}
                          {!n.read && (
                            <span className="ml-2 inline-block h-2 w-2 rounded-full bg-primary" />
                          )}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                          {n.description}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {n.time}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="mt-1 flex gap-2">
                      {n.urgent && (
                        <Badge
                          variant="destructive"
                          className="text-[10px]"
                        >
                          Urgent
                        </Badge>
                      )}
                      {!n.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => markAsRead(n.id)}
                        >
                          <Check className="mr-1 h-3 w-3" />
                          Mark read
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground"
                        onClick={() => deleteNotification(n.id)}
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        Dismiss
                      </Button>
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
