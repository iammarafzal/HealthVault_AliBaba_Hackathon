"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  Bot,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Languages,
  Loader2,
  Mic,
  MicOff,
  Pill,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  Square,
  Stethoscope,
  User,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { chatPrescription } from "@/services/interpreterService";
import type { ChatMessage, ExtractedMedication, ExtractionResponse } from "@/types/api";
import { useLanguage } from "@/context/LanguageContext";

type Lang = "en" | "ur";

interface PrescriptionChatModalProps {
  record: ExtractionResponse | null;
  isOpen: boolean;
  onClose: () => void;
  defaultLang?: Lang;
}

export default function PrescriptionChatModal({
  record,
  isOpen,
  onClose,
}: PrescriptionChatModalProps) {
  const { locale, setLocale, t } = useLanguage();
  const lang = locale;
  const setLang = setLocale;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedFollowups, setSuggestedFollowups] = useState<string[]>([]);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "cards">("chat");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isUrdu = lang === "ur";
  const medications = record?.medications || [];

  // Reset or initialize conversation on open / lang change
  useEffect(() => {
    if (!isOpen || !record) return;

    const doctorName = record.doctor_name || (lang === "ur" ? "طبی معالج" : "Doctor");
    const initialGreeting =
      lang === "ur"
        ? `السلام علیکم! میں آپ کا ڈیجیٹل نسخہ معاون ہوں۔ میں نے ${doctorName} کا نسخہ پڑھ لیا ہے جس میں کل ${medications.length} دوائیں تجویز کی گئی ہیں۔ آپ مجھ سے کسی بھی دوا کے طریقے، وقت، کھانے کی ترتیب یا احتیاط کے بارے میں بلا جھجھک پوچھ سکتے ہیں۔`
        : `Hello! I am your AI Prescription Assistant. I have reviewed your prescription from ${doctorName} containing ${medications.length} prescribed medications. Feel free to ask how, when, or why to take any of your medicines.`;

    const initialFollowups =
      lang === "ur"
        ? [
            "کھانے سے پہلے کونسی دوا لینی ہے؟",
            "درد اور اینٹھن کی دوا کونسی ہے؟",
            "سولف (Solif) گولی کا طریقہ کیا ہے؟",
            "تمام دوائیں کتنے دن لینی ہیں؟",
          ]
        : [
            "What should I take before meals?",
            "Which medicine is for pain?",
            "How to take Tab Solif (5mg)?",
            "How many days for each medicine?",
          ];

    setMessages([{ role: "assistant", content: initialGreeting }]);
    setSuggestedFollowups(initialFollowups);
  }, [isOpen, lang, record]);

  // Scroll to bottom on new message

  // Escape key handler
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

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isOpen || !record) return null;

  /* ── Send Message to Sehat Sahulat AI ── */
  const handleSendMessage = async (queryText?: string) => {
    const query = (queryText || inputQuery).trim();
    if (!query || isLoading) return;

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: query },
    ];
    setMessages(newMessages);
    setInputQuery("");
    setIsLoading(true);

    try {
      const response = await chatPrescription({
        record_id: record.record_id,
        language: lang,
        messages: newMessages,
        prescription_context: record,
      });

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.reply },
      ]);

      if (response.suggested_followups && response.suggested_followups.length > 0) {
        setSuggestedFollowups(response.suggested_followups);
      }
    } catch (err: unknown) {
      console.error("Prescription Chat error:", err);
      const fallbackMsg =
        lang === "ur"
          ? "معذرت، رابطہ منقطع ہو گیا ہے۔ براہ کرم دوبارہ کوشش کریں یا اپنے ڈاکٹر سے مشورہ لیں۔"
          : "Sorry, I could not connect right now. Please try again or consult your doctor.";
      setMessages((prev) => [...prev, { role: "assistant", content: fallbackMsg }]);
    } finally {
      setIsLoading(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Window */}
      <div className="relative z-10 flex h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-vault-border bg-background shadow-2xl dark:border-border">
        {/* Header Bar */}
        <div className="flex shrink-0 items-center justify-between border-b border-vault-border bg-background/95 px-4 py-3 backdrop-blur-md dark:border-border sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-vault-teal/15 text-vault-teal shadow-xs dark:bg-teal-500/20 dark:text-teal-300">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight text-foreground sm:text-lg">
                  {isUrdu ? "صحت سہولت — نسخہ چیٹ بوٹ" : "Sehat Sahulat AI Prescription Assistant"}
                </h2>
                <Badge
                  variant="outline"
                  className="border-emerald-500/40 bg-emerald-500/10 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300"
                >
                  {isUrdu ? "محفوظ طبی رہنمائی" : "Guardrails Active"}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Stethoscope className="h-3.5 w-3.5 text-vault-teal dark:text-teal-400" />
                <span>
                  {record.doctor_name || (isUrdu ? "طبی معالج" : "Doctor Specialist")} &bull;{" "}
                  {record.hospital_name || (isUrdu ? "طبی مرکز" : "Health Center")}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Bilingual Toggle */}
            <div className="flex rounded-xl border border-vault-border bg-muted/40 p-1 dark:border-border">
              <button
                onClick={() => setLang("en")}
                className={`rounded-lg px-3 py-1 text-xs font-extrabold transition-colors ${
                  lang === "en"
                    ? "bg-vault-teal text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                English
              </button>
              <button
                onClick={() => setLang("ur")}
                className={`rounded-lg px-3 py-1 text-xs font-extrabold font-urdu transition-colors ${
                  lang === "ur"
                    ? "bg-vault-teal text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                dir="rtl"
              >
                اردو
              </button>
            </div>

            {/* Close */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl hover:bg-muted"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Pinned Quick Summary Pill Accordion */}
        <div className="shrink-0 border-b border-vault-border/80 bg-vault-surface/60 px-4 py-2.5 dark:border-border dark:bg-card/60 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Pill className="h-4 w-4 text-vault-teal dark:text-teal-400" />
              <span>
                {isUrdu
                  ? `تجویز کردہ ادویات (${medications.length})`
                  : `Active Prescription Medications (${medications.length})`}
              </span>
            </div>
            <button
              onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
              className="flex items-center gap-1 text-xs font-extrabold text-vault-teal hover:underline dark:text-teal-300"
            >
              <span>{isSummaryExpanded ? (isUrdu ? "چھپائیں" : "Hide") : (isUrdu ? "فہرست دیکھیں" : "View List")}</span>
              {isSummaryExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>

          {/* Collapsible Pills */}
          {isSummaryExpanded && (
            <div className="mt-2.5 flex flex-wrap gap-1.5 pt-2 border-t border-vault-border/50">
              {medications.map((m, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 rounded-lg border border-vault-teal/30 bg-background px-2.5 py-1 text-xs font-bold shadow-2xs dark:bg-card"
                >
                  <span className="text-vault-teal dark:text-teal-400">{m.name}</span>
                  {m.fraction_label_ur && (
                    <span className="text-[10px] text-muted-foreground">
                      ({isUrdu ? m.fraction_label_ur : m.fraction_label_en || m.fraction_label_ur})
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Interactive Chat Canvas Body */}
        <div className="flex flex-1 flex-col overflow-hidden bg-background">
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
            {messages.map((msg, idx) => {
              const isAssistant = msg.role === "assistant";

              return (
                <div
                  key={idx}
                  className={`flex items-start gap-3 ${
                    isAssistant ? "justify-start" : "justify-end"
                  }`}
                >
                  {isAssistant && (
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-vault-teal/15 text-vault-teal dark:bg-teal-500/20 dark:text-teal-300">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}

                  <div
                    className={`group relative max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-xs transition-all sm:max-w-[75%] ${
                      isAssistant
                        ? "border border-vault-border bg-[#F5F8F7] text-foreground dark:border-border dark:bg-card"
                        : "bg-vault-teal text-white shadow-sm"
                    } ${isUrdu && isAssistant ? "text-right" : ""}`}
                    dir={isUrdu && isAssistant ? "rtl" : "ltr"}
                  >
                    <p
                      className={
                        isUrdu && isAssistant
                          ? "font-urdu text-base font-semibold leading-relaxed whitespace-pre-line"
                          : "font-medium whitespace-pre-line"
                      }
                    >
                      {msg.content}
                    </p>
                  </div>

                  {!isAssistant && (
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-vault-teal text-white">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-vault-teal/15 text-vault-teal dark:bg-teal-500/20 dark:text-teal-300">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-vault-border bg-[#F5F8F7] px-4 py-3 text-xs font-bold text-muted-foreground dark:border-border dark:bg-card">
                  <Loader2 className="h-4 w-4 animate-spin text-vault-teal dark:text-teal-400" />
                  <span>{isUrdu ? "ڈاکٹر کے نسخے کی تشریح کی جا رہی ہے…" : "Reviewing prescription details…"}</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Suggestion Chips */}
          {suggestedFollowups.length > 0 && !isLoading && (
            <div className="shrink-0 border-t border-vault-border/60 bg-vault-surface/40 px-4 py-2.5 dark:border-border dark:bg-card/40 sm:px-6">
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                <Sparkles className="h-3 w-3 text-vault-teal dark:text-teal-400" />
                <span>{isUrdu ? "فوری سوالات (کلک کریں):" : "Suggested Follow-ups (Click to ask):"}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestedFollowups.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(chip)}
                    className="flex items-center gap-1 rounded-full border border-vault-teal/40 bg-background px-3 py-1 text-xs font-bold text-vault-teal shadow-2xs transition-all hover:bg-vault-teal hover:text-white dark:bg-card dark:text-teal-300 dark:hover:bg-teal-700"
                    dir={isUrdu ? "rtl" : "ltr"}
                  >
                    <span>{chip}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Action Bar */}
          <div className="shrink-0 border-t border-vault-border bg-background p-3 sm:p-4 dark:border-border">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              {/* Text Input */}
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder={
                  isUrdu
                    ? "نسخے یا دوا کے بارے میں کوئی بھی سوال پوچھیں…"
                    : "Ask any question about your prescription or medicines…"
                }
                className="flex-1 rounded-xl border border-vault-border bg-vault-surface px-4 py-2.5 text-sm font-medium text-foreground outline-hidden transition-all focus:border-vault-teal focus:ring-2 focus:ring-vault-teal/20 dark:border-border dark:bg-card"
                dir={isUrdu ? "rtl" : "ltr"}
                disabled={isLoading}
              />

              {/* Send Button */}
              <Button
                type="submit"
                disabled={!inputQuery.trim() || isLoading}
                className="h-10 shrink-0 gap-2 rounded-xl bg-vault-teal px-4 font-extrabold text-white shadow-xs hover:bg-vault-teal/90 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span className="hidden sm:inline">{isUrdu ? "بھیجیں" : "Send"}</span>
                  </>
                )}
              </Button>
            </form>

            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-vault-teal" />
                {isUrdu
                  ? "یہ اے آئی اسسٹنٹ صرف آپ کے نسخے کے اندر موجود تفصیلات پر رہنمائی فراہم کرتا ہے۔"
                  : "Grounding guardrails active: Advice is strictly limited to your validated prescription."}
              </span>
              <button
                type="button"
                onClick={() => {
                  setMessages([]);
                  setInputQuery("");
                }}
                className="flex items-center gap-1 font-bold text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3" />
                <span>{isUrdu ? "نئی گفتگو" : "Reset Chat"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
