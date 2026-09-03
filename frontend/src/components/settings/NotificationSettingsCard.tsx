"use client";

import { useState } from "react";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock,
  Loader2,
  Send,
  ShieldCheck,
  Sunrise,
  Sun,
  Moon,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useWebPush } from "@/hooks/useWebPush";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export default function NotificationSettingsCard() {
  const { t, isUrdu } = useLanguage();
  const { toast } = useToast();
  const {
    isSupported,
    isSubscribed,
    permission,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    sendTestNotification,
  } = useWebPush();

  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSentNotice, setTestSentNotice] = useState<string | null>(null);

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      const ok = await subscribe();
      if (ok) {
        toast({
          title: isUrdu
            ? "ادویات کی یاد دہانیاں فعال کر دی گئیں۔"
            : "Medicine reminders enabled.",
          description: isUrdu
            ? "آپ کو مقررہ وقت پر ڈیسک ٹاپ الرٹس ملیں گے۔"
            : "You will receive timely desktop and browser reminders for scheduled doses.",
          variant: "success",
        });
      } else if (Notification.permission === "denied") {
        toast({
          title: isUrdu
            ? "براؤزر میں نوٹیفکیشن بلاک ہیں"
            : "Browser notifications blocked",
          description: isUrdu
            ? "براہ کرم براؤزر کی سیٹنگز میں جا کر نوٹیفکیشن کی اجازت دیں۔"
            : "Please allow notifications in your browser site permissions to enable reminders.",
          variant: "error",
        });
      }
    } else {
      const ok = await unsubscribe();
      if (ok) {
        toast({
          title: isUrdu
            ? "ادویات کی یاد دہانیاں غیر فعال کر دی گئیں۔"
            : "Medicine reminders disabled.",
          variant: "info",
        });
      }
    }
  };

  const handleSendTestAlert = async () => {
    setIsSendingTest(true);
    setTestSentNotice(null);
    try {
      const res = await sendTestNotification();
      if (res && res.status === "success") {
        setTestSentNotice(
          isUrdu
            ? "ٹیسٹ الرٹ بھیج دیا گیا ہے! اپنے سسٹم کے نوٹیفکیشنز چیک کریں۔"
            : "Test notification dispatched! Check your desktop/browser notification center."
        );
        toast({
          title: isUrdu ? "ٹیسٹ الرٹ موصول ہو گیا" : "Test alert dispatched",
          description: isUrdu
            ? "ڈیسک ٹاپ یا براؤزر نوٹیفکیشن سینٹر چیک کریں۔"
            : "Notification sent to your active device(s).",
          variant: "success",
        });
        setTimeout(() => setTestSentNotice(null), 6000);
      } else {
        toast({
          title: isUrdu ? "ٹیسٹ الرٹ نہیں بھیجا جا سکا" : "Failed to send test alert",
          description:
            res?.message ||
            (isUrdu
              ? "براہ کرم پہلے نوٹیفکیشن ٹوگل آف کر کے دوبارہ آن کریں۔"
              : "Please toggle notifications off and on again to refresh subscription."),
          variant: "error",
        });
      }
    } catch {
      toast({
        title: isUrdu ? "ٹیسٹ الرٹ میں خرابی" : "Error sending test alert",
        variant: "error",
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
        <div className="flex items-center gap-2 font-semibold mb-1">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            {isUrdu
              ? "اس براؤزر میں ویب پش سپورٹ دستیاب نہیں ہے"
              : "Web Push not supported in this browser"}
          </span>
        </div>
        <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
          {isUrdu
            ? "یہ براؤزر ویب پش سروس ورکر کو سپورٹ نہیں کرتا۔ برائے مہربانی Chrome, Edge, یا Firefox کا جدید ورژن استعمال کریں۔"
            : "Push notifications require a modern browser supporting Service Workers and the Web Push API (such as Chrome, Edge, or Firefox)."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Permission Blocked Alert */}
      {permission === "denied" && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/70 p-4 dark:border-red-900/50 dark:bg-red-950/20">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-bold text-red-900 dark:text-red-200">
              {isUrdu
                ? "براؤزر کی ترتیبات میں نوٹیفکیشن بند ہیں"
                : "Browser Notifications Blocked"}
            </p>
            <p className="text-[11px] text-red-700 dark:text-red-300 leading-relaxed">
              {isUrdu
                ? "آپ نے براؤزر میں اس سائٹ کے نوٹیفکیشن بلاک کر رکھے ہیں۔ ایڈریس بار میں تالے کے نشان پر کلک کریں اور نوٹیفکیشن کی اجازت دیں۔"
                : "Notifications are blocked by your browser. To receive medicine reminders, click the site permissions lock icon in your address bar and change Notifications to 'Allow'."}
            </p>
          </div>
        </div>
      )}

      {/* Main Notification Toggle Box */}
      <div className="flex flex-col gap-4 rounded-xl border border-vault-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between dark:border-border">
        <div className="flex items-start gap-3.5">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
              isSubscribed
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            )}
          >
            <Bell className="h-5 w-5" />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-foreground">
                {isUrdu
                  ? "خودکار ادویات یاد دہانی الرٹس"
                  : "Daily Medicine Push Reminders"}
              </span>

              {isSubscribed ? (
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse mr-1" />
                  {isUrdu ? "فعال" : "Enabled"}
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] font-medium">
                  {isUrdu ? "غیر فعال" : "Disabled"}
                </Badge>
              )}
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed max-w-lg">
              {isUrdu
                ? "صبح، دوپہر اور رات کی خوراک کے وقت ڈیسک ٹاپ اور براؤزر الرٹس موصول کریں تاکہ کوئی خوراک نہ چھوٹے (مقامی طور پر محفوظ)۔"
                : "Receive timely browser alerts for your scheduled Morning, Afternoon, and Night medications on this device."}
            </p>
          </div>
        </div>

        {/* The ON/OFF Switch */}
        <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-vault-teal" />}
          <Switch
            checked={isSubscribed}
            onCheckedChange={handleToggle}
            disabled={isLoading || permission === "denied"}
            className="data-[state=checked]:bg-vault-teal"
            title={isSubscribed ? "Click to disable notifications" : "Click to enable notifications"}
          />
        </div>
      </div>

      {/* Subscribed Details & Test Alert Button */}
      {isSubscribed && (
        <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/40 p-4 space-y-3 dark:border-emerald-900/40 dark:bg-emerald-950/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>
                  {isUrdu
                    ? "ڈیسک ٹاپ پر پش الرٹس کا شیڈول فعال ہے"
                    : "Automated Push Schedule Active"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {isUrdu
                  ? "یاد دہانیاں آپ کے یومیہ کھانے اور روٹین کے اوقات کے مطابق خودکار طریقے سے بھیجی جائیں گی۔"
                  : "Alerts trigger according to your configured routine timings (Breakfast, Lunch, Dinner)."}
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSendTestAlert}
              disabled={isSendingTest}
              className="h-8 text-xs font-semibold shrink-0 border-emerald-300 bg-white hover:bg-emerald-100/60 text-emerald-800 dark:border-emerald-800 dark:bg-card dark:text-emerald-300"
            >
              {isSendingTest ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  <span>{isUrdu ? "بھیجا جا رہا ہے..." : "Sending..."}</span>
                </>
              ) : (
                <>
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  <span>{isUrdu ? "ٹیسٹ الرٹ بھیجیں" : "Send Test Notification"}</span>
                </>
              )}
            </Button>
          </div>

          {testSentNotice && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 pt-1 animate-in fade-in duration-150">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span>{testSentNotice}</span>
            </div>
          )}

          {/* Time slot hint icons */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-emerald-200/50 dark:border-emerald-900/40">
            <span className="text-[10px] font-bold text-muted-foreground">
              {isUrdu ? "کور شدہ اوقات:" : "Active Windows:"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-white/80 dark:bg-card px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
              <Sunrise className="h-3 w-3 text-amber-500" />
              <span>{isUrdu ? "صبح (ناشتہ)" : "Morning"}</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-white/80 dark:bg-card px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
              <Sun className="h-3 w-3 text-orange-500" />
              <span>{isUrdu ? "دوپہر (کھانا)" : "Afternoon"}</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-white/80 dark:bg-card px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
              <Moon className="h-3 w-3 text-indigo-500" />
              <span>{isUrdu ? "رات (کھانا)" : "Night"}</span>
            </span>

            <Link
              href="/planner"
              className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-vault-teal hover:underline dark:text-teal-400"
            >
              <Clock className="h-3 w-3" />
              <span>{isUrdu ? "اوقات کی ترتیب بدلیں" : "Manage Routine Timings"}</span>
            </Link>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
