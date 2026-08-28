"use client";

import { useState } from "react";
import {
  Globe,
  Languages,
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
import { mockExtractionResponse } from "@/lib/mockData";

type Lang = "en" | "ur";

export default function InterpreterPage() {
  const [lang, setLang] = useState<Lang>("en");

  const medications = mockExtractionResponse.medications;

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
            Upload a prescription to interpret
          </p>
          <p className="text-xs text-muted-foreground">
            PDF, PNG, JPEG — max 10 MB
          </p>
          <Button variant="outline" className="mt-2">
            <UploadCloud className="mr-2 h-4 w-4" />
            Choose File
          </Button>
        </CardContent>
      </Card>

      {/* Translated instructions preview */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Languages className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-semibold">Translated Instructions</h2>
          <Badge variant="outline" className="text-[11px]">
            Preview
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {medications.map((med) => (
            <Card key={med.name}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{med.name}</CardTitle>
                <CardDescription>
                  {med.dosage} — {med.frequency} ({med.timing})
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={`rounded-lg border p-3 text-sm leading-relaxed ${
                    lang === "ur" ? "text-right" : "text-left"
                  }`}
                  dir={lang === "ur" ? "rtl" : "ltr"}
                >
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    {lang === "en" ? "Instructions" : "ہدایات"}
                  </p>
                  {lang === "en"
                    ? med.instructions_en
                    : med.instructions_ur}
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
            Raw OCR Source
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-40 overflow-auto rounded-lg bg-muted p-4 text-xs leading-relaxed">
            {mockExtractionResponse.raw_ocr_text}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
