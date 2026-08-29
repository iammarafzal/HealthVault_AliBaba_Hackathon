"use client";

import { useState } from "react";
import {
  Globe,
  Languages,
  Sparkles,
  UploadCloud,
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
import PrescriptionModal from "@/components/interpreter/PrescriptionModal";
import { mockExtractionResponse } from "@/lib/mockData";
import { uploadDocument } from "@/services/apiService";
import type { ExtractionResponse } from "@/types/api";

type Lang = "en" | "ur";

export default function InterpreterPage() {
  const [lang, setLang] = useState<Lang>("en");
  const [currentRecord, setCurrentRecord] =
    useState<ExtractionResponse>(mockExtractionResponse);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const medications = currentRecord.medications;
  const isUrdu = lang === "ur";

  /* ── Upload & interpret ──────────────────────────────────── */
  const handleFileUpload = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.png,.jpg,.jpeg";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setIsUploading(true);
      try {
        const result = await uploadDocument(file);
        setCurrentRecord(result);
        setIsModalOpen(true);
      } catch {
        setCurrentRecord(mockExtractionResponse);
        setIsModalOpen(true);
      } finally {
        setIsUploading(false);
      }
    };
    input.click();
  };

  /* ── Open modal for current record ───────────────────────── */
  const openModal = () => setIsModalOpen(true);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Bilingual Prescription Interpreter
          </h1>
          <p className="text-muted-foreground">
            Translates doctor notation into English &amp; Urdu guidance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Language toggle */}
          <div className="flex rounded-lg border p-1">
            <button
              onClick={() => setLang("en")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                lang === "en"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLang("ur")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                lang === "ur"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              dir="rtl"
            >
              اردو
            </button>
          </div>
        </div>
      </div>

      {/* Upload trigger */}
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-10">
          <UploadCloud className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium">
            {isUrdu
              ? "تشریح کے لیے نسخہ اپ لوڈ کریں"
              : "Upload a prescription to interpret"}
          </p>
          <p className="text-xs text-muted-foreground">
            PDF, PNG, JPEG — max 10 MB
          </p>
          <Button
            variant="outline"
            className="mt-2"
            onClick={handleFileUpload}
            disabled={isUploading}
          >
            <UploadCloud className="mr-2 h-4 w-4" />
            {isUploading
              ? isUrdu
                ? "اپ لوڈ ہو رہا ہے…"
                : "Uploading…"
              : isUrdu
              ? "فائل منتخب کریں"
              : "Choose File"}
          </Button>
          <Button
            variant="ghost"
            className="mt-1 text-xs"
            onClick={openModal}
          >
            <Sparkles className="mr-1 h-3 w-3" />
            {isUrdu ? "نمونہ دیکھیں" : "View Sample Interpretation"}
          </Button>
        </CardContent>
      </Card>

      {/* Translated instructions preview */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Languages className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-semibold">
            {isUrdu ? "ترجمہ شدہ ہدایات" : "Translated Instructions"}
          </h2>
          <Badge variant="outline" className="text-[11px]">
            {isUrdu ? "پیش نظارہ" : "Preview"}
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {medications.map((med) => (
            <Card
              key={med.name}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={openModal}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{med.name}</CardTitle>
                <CardDescription>
                  {med.dosage} — {med.frequency} ({med.timing})
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={`rounded-lg border p-3 text-sm leading-relaxed ${
                    isUrdu ? "text-right" : "text-left"
                  }`}
                  dir={isUrdu ? "rtl" : "ltr"}
                  lang={isUrdu ? "ur" : "en"}
                >
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    {isUrdu ? "ہدایات" : "Instructions"}
                  </p>
                  {isUrdu
                    ? med.instructions_ur
                    : med.instructions_en}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Raw OCR source */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4 text-muted-foreground" />
            {isUrdu ? "اصل OCR ماخذ" : "Raw OCR Source"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-40 overflow-auto rounded-lg bg-muted p-4 text-xs leading-relaxed">
            {currentRecord.raw_ocr_text}
          </pre>
        </CardContent>
      </Card>

      {/* Prescription Interpreter Modal */}
      <PrescriptionModal
        record={currentRecord}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
