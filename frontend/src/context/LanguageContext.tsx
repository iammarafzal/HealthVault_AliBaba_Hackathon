"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import enTranslations from "@/locales/en.json";
import urTranslations from "@/locales/ur.json";

export type Locale = "en" | "ur";
export type Direction = "ltr" | "rtl";

interface LanguageContextType {
  locale: Locale;
  setLocale: (lang: Locale) => void;
  dir: Direction;
  isUrdu: boolean;
  t: (key: string, fallback?: string) => string;
}


const translations: Record<Locale, Record<string, any>> = {
  en: enTranslations,
  ur: urTranslations,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = "healthvault_locale";

/** Helper to extract nested key paths like "nav.vault" from translation objects */
function getNestedValue(obj: any, path: string): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const keys = path.split(".");
  let current: any = obj;
  for (const k of keys) {
    if (current && typeof current === "object" && k in current) {
      current = current[k];
    } else {
      return undefined;
    }
  }
  return typeof current === "string" ? current : undefined;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY) as Locale | null;
    if (saved === "en" || saved === "ur") {
      setLocaleState(saved);
    }
  }, []);

  const dir: Direction = locale === "ur" ? "rtl" : "ltr";

  // Sync html dir and lang attributes
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.dir = dir;
    document.documentElement.lang = locale;

    if (locale === "ur") {
      document.documentElement.classList.add("font-arabic");
    } else {
      document.documentElement.classList.remove("font-arabic");
    }
  }, [locale, dir, mounted]);

  const setLocale = (newLang: Locale) => {
    setLocaleState(newLang);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_KEY, newLang);
    }
  };

  const t = (key: string, fallback?: string): string => {
    const val = getNestedValue(translations[locale], key);
    if (val) return val;

    // Fallback to English if not present in active locale
    const enVal = getNestedValue(translations.en, key);
    if (enVal) return enVal;

    return fallback ?? key;
  };

  const isUrdu = locale === "ur";

  return (
    <LanguageContext.Provider value={{ locale, setLocale, dir, isUrdu, t }}>
      {children}
    </LanguageContext.Provider>
  );

}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
