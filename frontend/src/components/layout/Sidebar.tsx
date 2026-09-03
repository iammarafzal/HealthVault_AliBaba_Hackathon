"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  ChevronLeft,
  FileText,
  FlaskConical,
  Languages,
  Pill,
  Settings,
  ShieldAlert,
  Stethoscope,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
  isMobileDrawer?: boolean;
}

interface NavItem {
  href: string;
  labelKey: string;
  defaultLabel: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { href: "/vault", labelKey: "nav.vault", defaultLabel: "Medical Vault", icon: FileText },
  { href: "/summary", labelKey: "nav.summary", defaultLabel: "1-Page Doctor Summary", icon: Stethoscope },
  { href: "/interpreter", labelKey: "nav.interpreter", defaultLabel: "Prescription Explainer", icon: Languages },
  { href: "/planner", labelKey: "nav.planner", defaultLabel: "Medicine Planner", icon: Pill },
  { href: "/biomarkers", labelKey: "nav.biomarkers", defaultLabel: "Lab Tests & Trends", icon: Activity },
  { href: "/emergency", labelKey: "nav.emergency", defaultLabel: "Emergency Card & QR", icon: ShieldAlert },
  { href: "/settings", labelKey: "nav.settings", defaultLabel: "Settings", icon: Settings },
];

export default function Sidebar({
  collapsed,
  onToggle,
  onNavigate,
  isMobileDrawer,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { locale, dir, t } = useLanguage();
  const isUrdu = locale === "ur";
  const [mounted, setMounted] = useState(false);

  const fullName = user?.profile?.full_name || user?.full_name || user?.email || t("nav.myAccount", "My Account");
  const userInitials =
    fullName
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase() || "HV";

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLinkClick = () => {
    if (onNavigate) {
      onNavigate();
    }
  };

  return (
    <aside
      className={cn(
        "flex h-screen flex-col shrink-0 border-r border-[#DCE8E5] dark:border-white/10 bg-white dark:bg-[#1A2826] transition-all duration-300 select-none overflow-hidden sticky top-0 left-0",
        isMobileDrawer ? "w-full shadow-2xl" : collapsed ? "w-16" : "w-72"
      )}
      dir={dir}
    >
      {/* ── Header: Section Title + Toggle / Close Button ── */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#DCE8E5] dark:border-white/10 px-4" dir={dir}>
        {(!collapsed || isMobileDrawer) && (
          <span className="text-xs font-black uppercase tracking-wider text-[#0D5C4A] dark:text-[#0A8C6A]">
            {t("nav.patientPortal", "Patient Portal")}
          </span>
        )}

        {isMobileDrawer ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:text-slate-900"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className={cn(
              "h-7 w-7 text-slate-500 hover:text-[#0D5C4A] hover:bg-[#E8F7F4] dark:hover:bg-zinc-800",
              collapsed && "mx-auto"
            )}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 transition-transform",
                isUrdu
                  ? (!collapsed ? "rotate-180" : "rotate-0")
                  : (collapsed ? "rotate-180" : "rotate-0")
              )}
            />
          </Button>
        )}
      </div>

      {/* ── Patient Profile Badge ── */}
      {(!collapsed || isMobileDrawer) && (
        <div className="m-3 shrink-0 rounded-xl border border-[#DCE8E5] dark:border-white/10 bg-[#F5F8F7] dark:bg-[#223431] p-3 shadow-2xs" dir={dir}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0D5C4A] text-xs font-bold text-white shadow-2xs">
              {userInitials}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-xs font-bold text-[#1A2826] dark:text-white">
                {fullName}
              </p>
              <p className="truncate text-[11px] font-medium text-[#3D5450] dark:text-[#B2DFD4]">
                {user?.health_id || (isUrdu ? "طبی آئی ڈی فعال ہے" : "Health ID Active")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Navigation Links ── */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto p-3 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" dir={dir}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const label = t(item.labelKey, item.defaultLabel);
          const isActive =
            pathname === item.href ||
            (item.href === "/emergency" && pathname?.startsWith("/emergency"));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleLinkClick}
              className={cn(
                "group flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm transition-all duration-150",
                isActive
                  ? "bg-[#0D5C4A] text-white font-semibold shadow-sm"
                  : "text-[#3D5450] dark:text-zinc-300 font-medium hover:bg-[#E8F7F4] hover:text-[#0D5C4A] dark:hover:bg-zinc-800 dark:hover:text-teal-300",
                collapsed && !isMobileDrawer && "justify-center px-2 py-3",
                isUrdu && "font-arabic"
              )}
              title={collapsed && !isMobileDrawer ? label : undefined}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  isActive
                    ? "text-white"
                    : "text-[#3D5450] dark:text-zinc-400 group-hover:text-[#0D5C4A] dark:group-hover:text-teal-300"
                )}
              />
              {(!collapsed || isMobileDrawer) && (
                <span className="whitespace-nowrap leading-none">
                  {label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>


      {/* ── Footer Status ── */}
      {(!collapsed || isMobileDrawer) && (
        <div className="border-t border-[#DCE8E5] dark:border-white/10 px-4 py-3 bg-[#F5F8F7]/60 dark:bg-[#223431]" dir={dir}>
          <div className="flex items-center justify-between text-[11px] text-[#3D5450] dark:text-[#B2DFD4]">
            <div className="flex items-center gap-1.5">
              <FlaskConical className="h-3.5 w-3.5 text-[#0D5C4A] dark:text-[#0A8C6A]" />
              <span className="font-semibold text-[#1A2826] dark:text-white">HealthVault AI</span>
            </div>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {isUrdu ? "آن لائن اور محفوظ" : "Online & Secure"}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}
