"use client";

import React, { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { chatPrescription } from "@/services/interpreterService";
import type { ChatMessage, ExtractionResponse } from "@/types/api";

interface PrescriptionAIChatProps {
  currentRecord: ExtractionResponse | null;
  locale: "en" | "ur";
}

/* ── Rich Markdown & Line Break Text Renderer ── */
function FormattedMarkdownText({
  content,
  isUrdu,
}: {
  content: string;
  isUrdu: boolean;
}) {
  if (!content) return null;

  const lines = content.split("\n").filter((l) => l.trim().length > 0);

  return (
    <div className={`space-y-1 ${isUrdu ? "font-urdu text-right" : "text-left"}`}>
      {lines.map((line, lineIdx) => {
        const parts = line.split(/(\*\*.*?\*\*)/g);

        const renderedParts = parts.map((part, partIdx) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <span key={partIdx} className="font-extrabold text-[#0D5C4A] dark:text-teal-300">
                {part.slice(2, -2)}
              </span>
            );
          }
          return <span key={partIdx}>{part}</span>;
        });

        const isBullet = line.trim().startsWith("•") || line.trim().startsWith("-");

        if (isBullet) {
          return (
            <div key={lineIdx} className="flex items-start gap-1.5 pl-1 text-xs">
              <span className="font-black text-[#0D5C4A] dark:text-teal-400">•</span>
              <div className="flex-1">{renderedParts}</div>
            </div>
          );
        }

        return (
          <p key={lineIdx} className="text-xs leading-relaxed">
            {renderedParts}
          </p>
        );
      })}
    </div>
  );
}

export function PrescriptionAIChat({
  currentRecord,
  locale,
}: PrescriptionAIChatProps) {
  const isUrdu = locale === "ur";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedFollowups, setSuggestedFollowups] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize or reset conversation when record or locale changes
  useEffect(() => {
    if (!currentRecord) return;
    const docName = currentRecord.doctor_name || (isUrdu ? "طبی معالج" : "Doctor");
    const initialGreeting = isUrdu
      ? `السلام علیکم! میں آپ کا نسخہ اے آئی اسسٹنٹ ہوں۔ میں نے **${docName}** کا نسخہ دیکھ لیا ہے۔ آپ مجھ سے کسی بھی دوا کے طریقے یا اوقات کے بارے میں سوال پوچھ سکتے ہیں۔`
      : `Hello! I am your Prescription AI Assistant. I have reviewed your prescription context. Feel free to ask how, when, or why to take any of your medicines.`;

    const defaultFollowups = isUrdu
      ? [
          "Syp Ulsanic کس وقت لینی ہے؟",
          "درد کی دوا کونسی ہے؟",
          "کیا کوئی دوا خالی پیٹ لینی ہے؟",
        ]
      : [
          "When should I take Syp Ulsanic?",
          "Which medicine is for pain?",
          "Should I take any medicine before food?",
        ];

    setMessages([{ role: "assistant", content: initialGreeting }]);
    setSuggestedFollowups(defaultFollowups);
  }, [currentRecord, locale, isUrdu]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (queryText?: string) => {
    const query = (queryText || inputQuery).trim();
    if (!query || isLoading || !currentRecord) return;

    const newMsgs: ChatMessage[] = [
      ...messages,
      { role: "user", content: query },
    ];
    setMessages(newMsgs);
    setInputQuery("");
    setIsLoading(true);

    try {
      const res = await chatPrescription({
        record_id: currentRecord.record_id,
        language: locale,
        messages: newMsgs,
        prescription_context: currentRecord,
      });

      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
      if (res.suggested_followups && res.suggested_followups.length > 0) {
        setSuggestedFollowups(res.suggested_followups);
      }
    } catch (err) {
      console.error("Prescription Chat error:", err);
      const fallback = isUrdu
        ? "یہ دوا یا معلومات آپ کے اپلوڈ کردہ نسخے میں شامل نہیں ہیں۔ براہ کرم ڈاکٹر سے مشورہ کریں۔"
        : "This is not listed in your uploaded prescription. Please consult your doctor before taking any medication.";
      setMessages((prev) => [...prev, { role: "assistant", content: fallback }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentRecord) return null;

  return (
    <Card className="overflow-hidden border border-[#DCE8E5] bg-white dark:border-border dark:bg-card shadow-xs">
      <CardHeader className="border-b border-[#DCE8E5] bg-[#0D5C4A]/5 py-3 px-4 dark:border-border dark:bg-teal-950/20">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0D5C4A] text-white shadow-2xs">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-black text-foreground">
              {isUrdu ? "نسخہ اے آئی اسسٹنٹ" : "Prescription AI Assistant"}
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">
              {isUrdu
                ? "اپنے نسخے کے بارے میں کوئی بھی سوال پوچھیں"
                : "Ask follow-up questions grounded strictly in your prescription"}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 p-3 sm:p-4">
        {/* Stream Messages */}
        <div className="max-h-72 space-y-3 overflow-y-auto rounded-xl bg-slate-50/70 p-3 dark:bg-card/40">
          {messages.map((m, i) => {
            const isAssistant = m.role === "assistant";
            return (
              <div
                key={i}
                className={`flex items-start gap-2 ${isAssistant ? "justify-start" : "justify-end"}`}
              >
                {isAssistant && (
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#0D5C4A]/10 text-[#0D5C4A] dark:bg-teal-500/20 dark:text-teal-300">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                )}
                <div
                  className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-xs shadow-2xs ${
                    isAssistant
                      ? "border border-slate-200 bg-white text-slate-800 dark:border-border dark:bg-card dark:text-slate-200"
                      : "bg-[#0D5C4A] text-white font-medium"
                  }`}
                >
                  <FormattedMarkdownText content={m.content} isUrdu={isUrdu && isAssistant} />
                </div>
                {!isAssistant && (
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#0D5C4A] text-white">
                    <User className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-2 rounded-lg bg-white p-2 text-xs font-bold text-muted-foreground dark:bg-card">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0D5C4A]" />
              <span>{isUrdu ? "جواب تیار ہو رہا ہے…" : "Reviewing prescription details…"}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Chips */}
        {suggestedFollowups.length > 0 && !isLoading && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {suggestedFollowups.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(chip)}
                className="flex items-center gap-1 rounded-full border border-[#0D5C4A]/30 bg-white px-2.5 py-1 text-[11px] font-bold text-[#0D5C4A] shadow-2xs transition-colors hover:bg-[#0D5C4A] hover:text-white dark:bg-card dark:text-teal-300"
              >
                <Sparkles className="h-3 w-3" />
                <span>{chip}</span>
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2 pt-1"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder={
              isUrdu
                ? "مثال: Syp Ulsanic کس وقت لینی ہے؟ یا درد کی دوا کونسی ہے؟"
                : "e.g. When should I take Syp Ulsanic or which medicine is for pain?"
            }
            className="flex-1 rounded-xl border border-[#DCE8E5] bg-slate-50/50 px-3 py-2 text-xs font-medium text-foreground outline-hidden focus:border-[#0D5C4A] dark:border-border dark:bg-card"
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
            className="h-8 shrink-0 gap-1 rounded-xl bg-[#0D5C4A] px-3 text-xs font-bold text-white shadow-xs hover:bg-[#0D5C4A]/90"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>{isUrdu ? "بھیجیں" : "Send"}</span>
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
