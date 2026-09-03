"use client";

import Link from "next/link";
import { Globe, Menu, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import UserNav from "@/components/layout/UserNav";

interface NavbarProps {
  onMenuClick?: () => void;
  showMobileMenu?: boolean;
}

export default function Navbar({ onMenuClick, showMobileMenu }: NavbarProps) {
  const { theme, setTheme } = useTheme();
  const { locale, dir, setLocale } = useLanguage();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header
      className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-white/95 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-white/80 dark:bg-[#1A2826]/95 dark:supports-[backdrop-filter]:bg-[#1A2826]/80 sm:px-6"
      dir={dir}
    >
      {/* ── Left: Mobile Hamburger + Brand Logo ── */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger */}
        {showMobileMenu && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground md:hidden"
            onClick={onMenuClick}
            aria-label="Open sidebar menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {/* ── Brand Logo ── */}
        <Link href="/vault" className="flex items-center gap-2 transition-opacity hover:opacity-90">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              mounted && theme === "dark"
                ? "/navbar-footer-dark.png"
                : "/navbar-footer-logo.png"
            }
            alt="HealthVault AI"
            className="h-8 sm:h-9 w-auto object-contain"
          />
        </Link>
      </div>

      {/* ── Right Actions Cluster: Language Switcher, Theme Toggle, User Profile ── */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Language Toggle Pill — LTR forced container so EN / اردو pill maintains clean sequence */}
        <div
          className="flex items-center rounded-xl border border-[#DCE8E5] dark:border-white/10 bg-[#F5F8F7] dark:bg-[#223431] p-1 shadow-2xs"
          dir="ltr"
        >
          <Globe className="h-3.5 w-3.5 text-[#0D5C4A] dark:text-[#0A8C6A] mx-1.5 shrink-0" />
          <button
            type="button"
            onClick={() => setLocale("en")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-bold transition-all",
              locale === "en"
                ? "bg-[#0D5C4A] text-white shadow-2xs dark:bg-[#0A8C6A]"
                : "text-[#3D5450] dark:text-[#B2DFD4] hover:text-[#1A2826]"
            )}
            title="Switch to English UI"
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLocale("ur")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-bold transition-all font-arabic",
              locale === "ur"
                ? "bg-[#0D5C4A] text-white shadow-2xs dark:bg-[#0A8C6A]"
                : "text-[#3D5450] dark:text-[#B2DFD4] hover:text-[#1A2826]"
            )}
            title="اردو انٹرفیس منتخب کریں"
          >
            اردو
          </button>
        </div>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle dark/light mode"
        >
          {mounted ? (
            theme === "dark" ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700" />
            )
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>

        {/* Profile / Account Dropdown */}
        <UserNav />
      </div>
    </header>
  );
}
