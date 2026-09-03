"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  AlertTriangle,
  Bot,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Globe,
  HelpCircle,
  Languages,
  LayoutGrid,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  Moon,
  Pill,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  Square,
  Stethoscope,
  Sun,
  SunMedium,
  User,
  Utensils,
  UtensilsCrossed,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PrescriptionMedicineCard } from "@/components/interpreter/PrescriptionMedicineCard";
import { chatPrescription } from "@/services/interpreterService";
import type { ChatMessage, ExtractedMedication, ExtractionResponse } from "@/types/api";

type Lang = "en" | "ur";
type ModalTab = "chat" | "cards";

interface PrescriptionModalProps {
  record: ExtractionResponse | null;
  isOpen: boolean;
  onClose: () => void;
  defaultLang?: Lang;
  initialTab?: ModalTab;
}

/* ─────────────────────────────────────────────────────────────
 * Visual Pill Fraction Graphic (Half Pill vs Full Pill vs Spoon)
 * ───────────────────────────────────────────────────────────── */
function PillFractionVisual({
  fraction,
  isHalf,
  isSyrup,
  isUrdu,
}: {
  fraction?: string;
  isHalf: boolean;
  isSyrup: boolean;
  isUrdu: boolean;
}) {
  if (isSyrup) {
    return (
      <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M19 8h-1V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3H9a2 2 0 0 0-2 2v9a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V10a2 2 0 0 0-2-2zm-7-3h4v3h-4V5zm7 14a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1v-9h10v9z" />
          <path d="M11 14h6v2h-6z" />
        </svg>
        <span>{isUrdu ? "۲ چمچ (شربت)" : "2 Teaspoons (Syrup)"}</span>
      </div>
    );
  }

  if (isHalf) {
    return (
      <div className="flex items-center gap-1.5 rounded-lg border border-teal-500/40 bg-teal-500/10 px-2.5 py-1 text-xs font-bold text-teal-800 dark:text-teal-300">
        <svg className="h-4 w-7" viewBox="0 0 32 16" fill="none">
          <path
            d="M16 2 C10 2 6 6 6 8 C6 10 10 14 16 14 Z"
            className="fill-teal-600 dark:fill-teal-400"
          />
          <line
            x1="16"
            y1="1"
            x2="16"
            y2="15"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="2 1"
          />
          <path
            d="M16 2 C22 2 26 6 26 8 C26 10 22 14 16 14"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="2 2"
            className="text-muted-foreground/60"
          />
        </svg>
        <span className="font-extrabold">{isUrdu ? "آدھی گولی (0.5)" : "Half Tablet (0.5)"}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-bold text-blue-800 dark:text-blue-300">
      <svg className="h-4 w-7" viewBox="0 0 32 16" fill="none">
        <rect
          x="4"
          y="2"
          width="24"
          height="12"
          rx="6"
          className="fill-blue-600 dark:fill-blue-400"
        />
        <line x1="16" y1="2" x2="16" y2="14" stroke="white" strokeWidth="1" strokeOpacity="0.7" />
      </svg>
      <span>{isUrdu ? "1 پوری گولی (1.0)" : "1 Full Tablet (1.0)"}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * Visual Timing Schedule Badges
 * ───────────────────────────────────────────────────────────── */
function TimingScheduleBadges({
  med,
  isUrdu,
}: {
  med: ExtractedMedication;
  isUrdu: boolean;
}) {
  const tb = med.timing_breakdown || {};
  const comb = `${med.timing || ""} ${med.frequency || ""} ${med.instructions_ur || ""} ${med.instructions_en || ""}`.toLowerCase();

  const isOnlyEvening =
    (comb.includes("شام کو") || comb.includes("evening") || comb.includes("once daily in the evening") || comb.includes("روزانہ شام")) &&
    !comb.includes("1+1") &&
    !comb.includes("1+1+1") &&
    !comb.includes("1+0+1") &&
    !comb.includes("صبح") &&
    !comb.includes("bd");

  const morningActive = isOnlyEvening
    ? false
    : (tb.morning ?? (comb.includes("صبح") || comb.includes("morning") || comb.includes("1+1") || comb.includes("1+1+1") || comb.includes("1+0+1") || comb.includes("1-0-1") || comb.includes("bd")));

  const afternoonActive = isOnlyEvening
    ? false
    : (tb.afternoon ?? (comb.includes("دوپہر") || comb.includes("afternoon") || comb.includes("1+1+1") || comb.includes("0+1+0")));

  const nightActive = isOnlyEvening
    ? true
    : (tb.night ?? (comb.includes("شام") || comb.includes("رات") || comb.includes("night") || comb.includes("evening") || comb.includes("1+1") || comb.includes("1+1+1") || comb.includes("1+0+1") || comb.includes("1-0-1") || comb.includes("0+0+1")));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <div
        className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
          morningActive
            ? "border-2 border-amber-500 bg-amber-500/15 text-amber-900 shadow-xs dark:bg-amber-950/60 dark:text-amber-200"
            : "border border-muted/50 bg-muted/20 text-muted-foreground/40 opacity-40"
        }`}
      >
        <Sun className={`h-4 w-4 ${morningActive ? "text-amber-500 animate-pulse" : ""}`} />
        <span>{isUrdu ? "صبح" : "Morning"}</span>
        {morningActive && <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />}
      </div>

      <div
        className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
          afternoonActive
            ? "border-2 border-orange-500 bg-orange-500/15 text-orange-900 shadow-xs dark:bg-orange-950/60 dark:text-orange-200"
            : "border border-muted/50 bg-muted/20 text-muted-foreground/40 opacity-40"
        }`}
      >
        <SunMedium className={`h-4 w-4 ${afternoonActive ? "text-orange-500 animate-pulse" : ""}`} />
        <span>{isUrdu ? "دوپہر" : "Afternoon"}</span>
        {afternoonActive && <CheckCircle2 className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />}
      </div>

      <div
        className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
          nightActive
            ? "border-2 border-indigo-500 bg-indigo-500/15 text-indigo-900 shadow-xs dark:bg-indigo-950/60 dark:text-indigo-200"
            : "border border-muted/50 bg-muted/20 text-muted-foreground/40 opacity-40"
        }`}
      >
        <Moon className={`h-4 w-4 ${nightActive ? "text-indigo-500 animate-pulse" : ""}`} />
        <span>{isUrdu ? "رات / شام" : "Evening / Night"}</span>
        {nightActive && <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * Main Prescription Modal (Sehat Sahulat AI Chat + Visual Cards)
 * ───────────────────────────────────────────────────────────── */
export default function PrescriptionModal({
  record,
  isOpen,
  onClose,
  defaultLang = "ur",
  initialTab = "chat",
}: PrescriptionModalProps) {
  const [lang, setLang] = useState<Lang>(defaultLang);
  const [activeTab, setActiveTab] = useState<ModalTab>(initialTab);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [suggestedFollowups, setSuggestedFollowups] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

  // Audio Playback State
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [speakingMsgIndex, setSpeakingMsgIndex] = useState<number | null>(null);
  const [isPlayingAll, setIsPlayingAll] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const isUrdu = lang === "ur";
  const medications = record?.medications || [];

  // Reset conversation when modal opens or language changes
  useEffect(() => {
    if (!isOpen || !record) return;
    setLang(defaultLang);
    setActiveTab(initialTab);

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
  }, [isOpen, defaultLang, initialTab, record]);

  // Scroll to bottom on new chat messages
  useEffect(() => {
    if (activeTab === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoadingChat, activeTab]);

  // Speech Recognition (Mic voice input)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = lang === "ur" ? "ur-PK" : "en-US";

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputQuery(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
  }, [lang]);

  // Cleanup speech synthesis on modal close
  useEffect(() => {
    if (!isOpen && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setPlayingIndex(null);
      setSpeakingMsgIndex(null);
      setIsPlayingAll(false);
    }
  }, [isOpen]);

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

  /* ── TTS Engine ── */
  const speakText = (
    text: string,
    target: { type: "med" | "chat"; index: number } | null,
    onFinish?: () => void
  ) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert(isUrdu ? "آپ کے براؤزر میں آواز کی سہولت دستیاب نہیں ہے۔" : "Speech synthesis not supported.");
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_`]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);

    const voices = window.speechSynthesis.getVoices();
    const urduVoice =
      voices.find((v) => v.lang.toLowerCase().includes("ur")) ||
      voices.find((v) => v.lang.toLowerCase().includes("ar")) ||
      voices[0];

    if (urduVoice) utterance.voice = urduVoice;
    utterance.lang = lang === "ur" ? "ur-PK" : "en-US";
    utterance.rate = 0.85;

    utterance.onstart = () => {
      if (target?.type === "med") setPlayingIndex(target.index);
      if (target?.type === "chat") setSpeakingMsgIndex(target.index);
    };

    utterance.onend = () => {
      setPlayingIndex(null);
      setSpeakingMsgIndex(null);
      if (onFinish) onFinish();
    };

    utterance.onerror = () => {
      setPlayingIndex(null);
      setSpeakingMsgIndex(null);
      if (onFinish) onFinish();
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopAllAudio = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setPlayingIndex(null);
    setSpeakingMsgIndex(null);
    setIsPlayingAll(false);
  };

  /* ── Chat Send Message ── */
  const handleSendMessage = async (queryText?: string) => {
    const query = (queryText || inputQuery).trim();
    if (!query || isLoadingChat) return;

    stopAllAudio();

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: query },
    ];
    setMessages(newMessages);
    setInputQuery("");
    setIsLoadingChat(true);

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
          ? "معذرت، رابطہ نہیں ہو سکا۔ براہ کرم دوبارہ کوشش کریں یا اپنے ڈاکٹر سے مشورہ لیں۔"
          : "Sorry, I could not connect right now. Please try again or consult your doctor.";
      setMessages((prev) => [...prev, { role: "assistant", content: fallbackMsg }]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  /* ── Play Single Medicine Audio ── */
  const playSingleMedicineAudio = (med: ExtractedMedication, idx: number) => {
    if (playingIndex === idx) {
      stopAllAudio();
      return;
    }
    setIsPlayingAll(false);
    const script =
      med.audio_script_ur ||
      `${med.name}۔ ${med.instructions_ur || med.instructions_en || "ڈاکٹر کے مشورے کے مطابق پانی کے ساتھ لیں۔"}`;
    speakText(script, { type: "med", index: idx });
  };

  /* ── Play All Medicines Sequentially ── */
  const playAllMedicinesAudio = () => {
    if (isPlayingAll || playingIndex !== null) {
      stopAllAudio();
      return;
    }
    if (medications.length === 0) return;

    setIsPlayingAll(true);
    let current = 0;

    const playNext = () => {
      if (current >= medications.length) {
        setIsPlayingAll(false);
        setPlayingIndex(null);
        return;
      }
      const med = medications[current];
      const script =
        med.audio_script_ur ||
        `دوا نمبر ${current + 1}: ${med.name}۔ ${med.instructions_ur || med.instructions_en}`;
      speakText(script, { type: "med", index: current }, () => {
        current += 1;
        setTimeout(playNext, 600);
      });
    };

    playNext();
  };

  /* ── Mic Toggle ── */
  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert(isUrdu ? "مائیکروفون کی سہولت دستیاب نہیں ہے۔" : "Microphone not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognitionRef.current.lang = lang === "ur" ? "ur-PK" : "en-US";
      recognitionRef.current.start();
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Main Modal Card */}
      <div className="relative z-10 flex h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-vault-border bg-background shadow-2xl dark:border-border">
        {/* Header Bar */}
        <div className="shrink-0 border-b border-vault-border bg-background/95 px-4 py-3.5 backdrop-blur-md dark:border-border sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-vault-teal/15 text-vault-teal shadow-xs dark:bg-teal-500/20 dark:text-teal-300">
                <Pill className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black tracking-tight text-foreground sm:text-lg">
                    {isUrdu ? "صحت سہولت — نسخہ گائیڈ و چیٹ بوٹ" : "Sehat Sahulat — Prescription AI Guide"}
                  </h2>
                  <Badge
                    variant="outline"
                    className="border-vault-teal/40 bg-vault-teal/10 text-[10px] font-extrabold text-vault-teal dark:text-teal-300"
                  >
                    {isUrdu ? "محفوظ و تصدیق شدہ" : "Bilingual AI"}
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
              {/* Language Switch */}
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

              {/* Close Button */}
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

          {/* View Mode Toggle Tabs */}
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex rounded-xl border border-vault-border bg-vault-surface p-1 dark:border-border dark:bg-card">
              <button
                onClick={() => {
                  stopAllAudio();
                  setActiveTab("chat");
                }}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-extrabold transition-all ${
                  activeTab === "chat"
                    ? "bg-vault-teal text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Bot className="h-3.5 w-3.5" />
                <span>{isUrdu ? "چیٹ اسسٹنٹ (AI)" : "AI Chat Assistant"}</span>
              </button>

              <button
                onClick={() => {
                  stopAllAudio();
                  setActiveTab("cards");
                }}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-extrabold transition-all ${
                  activeTab === "cards"
                    ? "bg-vault-teal text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>{isUrdu ? "تصویری کارڈز (شیڈول)" : "Visual Schedule Cards"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* TAB 1: Conversational Sehat Sahulat AI Chat */}
        {activeTab === "chat" && (
          <div className="flex flex-1 flex-col overflow-hidden bg-background">
            {/* Collapsible Medicine Quick Bar */}
            <div className="shrink-0 border-b border-vault-border/80 bg-vault-surface/60 px-4 py-2 dark:border-border dark:bg-card/60 sm:px-6">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Pill className="h-3.5 w-3.5 text-vault-teal dark:text-teal-400" />
                  {isUrdu
                    ? `تجویز کردہ ادویات (${medications.length})`
                    : `Active Medications (${medications.length})`}
                </span>
                <button
                  onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                  className="flex items-center gap-1 text-xs font-extrabold text-vault-teal hover:underline dark:text-teal-300"
                >
                  <span>{isSummaryExpanded ? (isUrdu ? "چھپائیں" : "Hide") : (isUrdu ? "فہرست دیکھیں" : "View List")}</span>
                  {isSummaryExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              </div>

              {isSummaryExpanded && (
                <div className="mt-2 flex flex-wrap gap-1.5 pt-1.5 border-t border-vault-border/50">
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

            {/* Chat Stream */}
            <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
              {messages.map((msg, idx) => {
                const isAssistant = msg.role === "assistant";
                const isSpeaking = speakingMsgIndex === idx;

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

                      {isAssistant && (
                        <div className="mt-2.5 flex items-center justify-between pt-1 border-t border-vault-border/50 text-xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {isUrdu ? "صوتی معاون" : "Voice Output"}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-7 gap-1 rounded-lg px-2 text-xs font-bold ${
                              isSpeaking
                                ? "bg-red-500/15 text-red-600 dark:text-red-400"
                                : "text-vault-teal hover:bg-vault-teal/10 dark:text-teal-300"
                            }`}
                            onClick={() => speakText(msg.content, { type: "chat", index: idx })}
                          >
                            {isSpeaking ? (
                              <>
                                <Square className="h-3 w-3 fill-current" />
                                <span>{isUrdu ? "روکیں" : "Stop"}</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="h-3.5 w-3.5" />
                                <span>{isUrdu ? "سنیں" : "Listen"}</span>
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>

                    {!isAssistant && (
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-vault-teal text-white">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                );
              })}

              {isLoadingChat && (
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

            {/* Quick Follow-up Chips */}
            {suggestedFollowups.length > 0 && !isLoadingChat && (
              <div className="shrink-0 border-t border-vault-border/60 bg-vault-surface/40 px-4 py-2.5 dark:border-border dark:bg-card/40 sm:px-6">
                <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-vault-teal dark:text-teal-400" />
                  <span>{isUrdu ? "فوری سوالات (کلک کریں):" : "Suggested Questions (Click to ask):"}</span>
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

            {/* Input Form */}
            <div className="shrink-0 border-t border-vault-border bg-background p-3 sm:p-4 dark:border-border">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <Button
                  type="button"
                  variant={isListening ? "destructive" : "outline"}
                  size="icon"
                  className={`h-10 w-10 shrink-0 rounded-xl transition-all ${
                    isListening
                      ? "animate-pulse bg-red-600 text-white"
                      : "border-vault-border text-vault-teal hover:bg-vault-teal/10 dark:border-border dark:text-teal-300"
                  }`}
                  onClick={toggleVoiceInput}
                  title={isUrdu ? "بول کر سوال پوچھیں" : "Speak your question"}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>

                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder={
                    isListening
                      ? isUrdu
                        ? "سن رہا ہوں، بولیں…"
                        : "Listening, please speak…"
                      : isUrdu
                      ? "نسخے یا دوا کے بارے میں کوئی بھی سوال پوچھیں…"
                      : "Ask any question about your prescription or medicines…"
                  }
                  className="flex-1 rounded-xl border border-vault-border bg-vault-surface px-4 py-2.5 text-sm font-medium text-foreground outline-hidden transition-all focus:border-vault-teal focus:ring-2 focus:ring-vault-teal/20 dark:border-border dark:bg-card"
                  dir={isUrdu ? "rtl" : "ltr"}
                  disabled={isLoadingChat}
                />

                <Button
                  type="submit"
                  disabled={!inputQuery.trim() || isLoadingChat}
                  className="h-10 shrink-0 gap-2 rounded-xl bg-vault-teal px-4 font-extrabold text-white shadow-xs hover:bg-vault-teal/90 disabled:opacity-50"
                >
                  {isLoadingChat ? (
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
                    ? "یہ اسسٹنٹ صرف آپ کے نسخے کے اندر موجود تفصیلات پر رہنمائی فراہم کرتا ہے۔"
                    : "Grounding guardrails active: Advice is strictly limited to your validated prescription."}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMessages([]);
                    setInputQuery("");
                    stopAllAudio();
                  }}
                  className="flex items-center gap-1 font-bold text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>{isUrdu ? "نئی گفتگو" : "Reset Chat"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Visual Medicine Instruction Cards */}
        {activeTab === "cards" && (
          <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
            {/* Diagnoses Chips */}
            {record.diagnoses && record.diagnoses.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-vault-teal dark:text-teal-400" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                    {isUrdu ? "طبی تشخیص اور معائنہ" : "Clinical Diagnoses & Findings"}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {record.diagnoses.map((dx, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="rounded-lg border border-vault-border/80 bg-vault-surface/80 px-3 py-1.5 text-xs font-bold text-foreground shadow-2xs dark:border-border dark:bg-card"
                    >
                      {dx}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* List of Medications */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {medications.map((med, idx) => (
                <PrescriptionMedicineCard
                  key={idx}
                  med={med}
                  index={idx}
                  isUrdu={isUrdu}
                />
              ))}
            </div>

            {/* Allergy Warnings If Any */}
            {record.allergies && record.allergies.length > 0 && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  {isUrdu ? "الرجی اور خطرے کی انتباہ" : "Allergy & Safety Alerts"}
                </h3>
                <div className="space-y-2">
                  {record.allergies.map((a, i) => (
                    <div key={i} className="text-xs font-semibold text-foreground">
                      &bull; {a.allergen} ({a.severity}) {a.reaction_details && `— ${a.reaction_details}`}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="shrink-0 border-t border-vault-border bg-background/95 px-5 py-3 backdrop-blur-md dark:border-border">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-muted-foreground">
              {isUrdu
                ? "ضروری نوٹ: دوا ہمیشہ ڈاکٹر کے مشورے کے مطابق استعمال کریں۔"
                : "Notice: Always adhere strictly to your healthcare provider's instructions."}
            </span>
            <Button
              variant="outline"
              className="rounded-xl border-vault-border px-6 font-bold hover:bg-muted dark:border-border"
              onClick={onClose}
            >
              {isUrdu ? "بند کریں" : "Close"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
