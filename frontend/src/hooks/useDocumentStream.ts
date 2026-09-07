/**
 * HealthVault AI — Real-Time Document Extraction SSE Hook
 * Consumes /api/v1/vault/upload-stream via Server-Sent Events (fetch + ReadableStream).
 * Provides live bilingual progress notifications, percent progression, and structured record parsing.
 */

import { useCallback, useRef, useState } from "react";
import type { VaultDocumentType } from "@/types/api";
import { getApiBaseUrl } from "@/services/apiClient";

export type StreamStep =
  | "idle"
  | "reading"
  | "identifying"
  | "verifying"
  | "complete"
  | "error";

export interface StreamProgressEvent {
  step: StreamStep;
  percent: number;
  message_en: string;
  message_ur: string;
  record?: any;
  temp_file_url?: string;
  rejection_reason?: string;
}

export interface UseDocumentStreamOptions {
  onProgress?: (event: StreamProgressEvent) => void;
  onComplete?: (record: any, tempFileUrl?: string) => void;
  onError?: (messageEn: string, messageUr: string) => void;
}

export function useDocumentStream(options?: UseDocumentStreamOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [step, setStep] = useState<StreamStep>("idle");
  const [percent, setPercent] = useState(0);
  const [messageEn, setMessageEn] = useState("");
  const [messageUr, setMessageUr] = useState("");
  const [record, setRecord] = useState<any | null>(null);
  const [tempFileUrl, setTempFileUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<{ en: string; ur: string } | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const resetStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setStep("idle");
    setPercent(0);
    setMessageEn("");
    setMessageUr("");
    setRecord(null);
    setTempFileUrl(null);
    setErrorMessage(null);
  }, []);

  const startStream = useCallback(
    async (
      file: File,
      documentType: VaultDocumentType = "prescription",
      userId?: string
    ) => {
      resetStream();
      setIsStreaming(true);
      setStep("reading");
      setPercent(15);
      setMessageEn("Reading your document...");
      setMessageUr("آپ کی فائل پڑھی جا رہی ہے...");

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("document_type", documentType);
      if (userId) {
        formData.append("user_id", userId);
      }

      const headers: Record<string, string> = {};
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("token");
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
      }

      try {
        const response = await fetch(`${getApiBaseUrl()}/vault/upload-stream`, {
          method: "POST",
          headers,
          body: formData,
          signal: controller.signal,
        });

        if (!response.ok) {
          const fallbackEn = "Please upload a clear medical slip or prescription.";
          const fallbackUr = "براہ کرم واضح نسخہ یا میڈیکل رپورٹ اپلوڈ کریں۔";
          setStep("error");
          setErrorMessage({ en: fallbackEn, ur: fallbackUr });
          options?.onError?.(fallbackEn, fallbackUr);
          setIsStreaming(false);
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("ReadableStream not supported by browser.");
        }

        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";

          for (const rawEvent of parts) {
            if (!rawEvent.trim()) continue;

            const lines = rawEvent.split("\n");
            let eventType = "message";
            let dataStr = "";

            for (const line of lines) {
              if (line.startsWith("event:")) {
                eventType = line.replace("event:", "").trim();
              } else if (line.startsWith("data:")) {
                dataStr = line.replace("data:", "").trim();
              }
            }

            if (!dataStr) continue;

            try {
              const payload: StreamProgressEvent = JSON.parse(dataStr);

              if (eventType === "progress") {
                setStep(payload.step);
                setPercent(payload.percent || 50);
                setMessageEn(payload.message_en || "Processing document...");
                setMessageUr(payload.message_ur || "دستاویز پر کام جاری ہے...");
                options?.onProgress?.(payload);
              } else if (eventType === "complete") {
                setStep("complete");
                setPercent(100);
                setMessageEn(payload.message_en || "Document successfully processed.");
                setMessageUr(payload.message_ur || "دستاویز کی تصدیق مکمل ہو گئی۔");
                setRecord(payload.record || null);
                setTempFileUrl(payload.temp_file_url || null);
                options?.onComplete?.(payload.record, payload.temp_file_url);
                setIsStreaming(false);
              } else if (eventType === "error") {
                setStep("error");
                const errEn = payload.message_en || "Please upload a clear medical slip or prescription.";
                const errUr = payload.message_ur || "براہ کرم واضح نسخہ یا میڈیکل رپورٹ اپلوڈ کریں۔";
                setErrorMessage({ en: errEn, ur: errUr });
                options?.onError?.(errEn, errUr);
                setIsStreaming(false);
              }
            } catch (jsonErr) {
              console.warn("Failed to parse SSE JSON chunk:", dataStr, jsonErr);
            }
          }
        }
      } catch (err: any) {
        if (err.name === "AbortError") {
          return;
        }
        const errEn = "Please upload a clear medical slip or prescription.";
        const errUr = "براہ کرم واضح نسخہ یا میڈیکل رپورٹ اپلوڈ کریں۔";
        setStep("error");
        setErrorMessage({ en: errEn, ur: errUr });
        options?.onError?.(errEn, errUr);
      } finally {
        setIsStreaming(false);
      }
    },
    [options, resetStream]
  );

  return {
    isStreaming,
    step,
    percent,
    messageEn,
    messageUr,
    record,
    tempFileUrl,
    errorMessage,
    startStream,
    resetStream,
  };
}
