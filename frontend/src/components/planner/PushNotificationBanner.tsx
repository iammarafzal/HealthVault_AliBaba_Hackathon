"use client";

import { useState } from "react";
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useWebPush } from "@/hooks/useWebPush";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

interface PushNotificationBannerProps {
  className?: string;
}

export default function PushNotificationBanner({
  className,
}: PushNotificationBannerProps) {
  const { isUrdu } = useLanguage();
  const {
    isSupported,
    isSubscribed,
    permission,
    isLoading,
    error,
    subscribe,
    sendTestNotification,
  } = useWebPush();

  const [testSentNotice, setTestSentNotice] = useState<string | null>(null);

  if (!isSupported) {
    return null;
  }

  const handleTestAlert = async () => {
    setTestSentNotice(null);
    const res = await sendTestNotification();
    if (res && res.status === "success") {
      setTestSentNotice(
        isUrdu
          ? "ٹیسٹ نوٹیفکیشن بھیج دیا گیا ہے!"
          : "Test notification dispatched! Check your desktop/browser alerts."
      );
      setTimeout(() => setTestSentNotice(null), 5000);
    }
  };

  // State 1: Permission Granted & Subscribed
  if (permission === "granted" && isSubscribed) {
    return (
      <Card
        className={cn(
          "border border-emerald-200/80 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20 transition-all",
          className
        )}
      >
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-foreground">
                  {isUrdu ? "ادویات کی یاد دہانیاں فعال ہیں" : "Reminders Active"}
                </p>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {isUrdu ? "فعال" : "Live"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isUrdu
                  ? "صبح، دوپہر اور رات کی خوراک کے خودکار الرٹس فعال ہیں۔"
                  : "Automated local alerts scheduled across morning, afternoon, and night dose windows."}
              </p>
              {testSentNotice && (
                <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{testSentNotice}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestAlert}
              disabled={isLoading}
              className="h-8 text-xs font-semibold border-emerald-300 bg-white hover:bg-emerald-100/50 text-emerald-800 dark:border-emerald-800 dark:bg-card dark:text-emerald-300 dark:hover:bg-emerald-950/50"
            >
              {isLoading ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="mr-1.5 h-3.5 w-3.5" />
              )}
              {isUrdu ? "ٹیسٹ الرٹ بھیجیں" : "Send Test Alert"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // State 2: Permission Blocked/Denied
  if (permission === "denied") {
    return (
      <Card
        className={cn(
          "border border-amber-200/80 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/20",
          className
        )}
      >
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
            <AlertCircle className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">
              {isUrdu ? "نوٹیفکیشن بلاک ہیں" : "Notifications Blocked"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {isUrdu
                ? "براؤزر کی ترتیبات میں نوٹیفکیشنز کی اجازت دے کر الرٹس فعال کریں۔"
                : "Browser notifications are blocked. Please allow notifications in your browser site permissions to receive medicine alerts."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // State 3: Permission Default / Not Subscribed
  return (
    <Card
      className={cn(
        "border border-dashed border-[#0A8C6A]/40 bg-vault-surface/60 hover:border-[#0A8C6A] dark:border-[#0A8C6A]/30 dark:bg-card transition-all",
        className
      )}
    >
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0A8C6A]/10 text-[#0A8C6A] dark:bg-[#0A8C6A]/20">
            <Bell className="h-4 w-4 text-[#0A8C6A]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-foreground">
                {isUrdu
                  ? "ادویات کے یاد دہانی نوٹیفکیشن فعال کریں"
                  : "Enable Dose Reminders"}
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#0A8C6A]/10 px-2 py-0.5 text-[10px] font-semibold text-[#0A8C6A] dark:text-teal-300">
                <Sparkles className="h-2.5 w-2.5" />
                {isUrdu ? "مفت اور مقامی" : "Local & Private"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {isUrdu
                ? "صبح، دوپہر اور رات کی ادویات کے خودکار ڈیسک ٹاپ نوٹیفکیشنز حاصل کریں۔"
                : "Receive browser reminders for due medications across your active daily time windows."}
            </p>
            {error && (
              <p className="text-[11px] font-medium text-red-600 dark:text-red-400 mt-1">
                {error}
              </p>
            )}
          </div>
        </div>

        <Button
          size="sm"
          onClick={subscribe}
          disabled={isLoading}
          className="h-8 self-end sm:self-center bg-[#0A8C6A] hover:bg-[#087357] text-white text-xs font-bold shadow-xs cursor-pointer"
        >
          {isLoading ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Bell className="mr-1.5 h-3.5 w-3.5" />
          )}
          {isUrdu ? "الرٹس فعال کریں" : "Enable Alerts"}
        </Button>
      </CardContent>
    </Card>
  );
}
