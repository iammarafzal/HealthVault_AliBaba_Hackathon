"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

export default function UserNav() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { dir, t } = useLanguage();

  const fullName = user?.profile?.full_name || user?.full_name || t("nav.myAccount", "My Account");
  const healthId = user?.health_id || "";
  const userInitials =
    fullName
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase() || "HV";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex h-9 items-center gap-2 rounded-xl border border-border bg-background px-2.5 transition-all hover:border-vault-teal hover:bg-vault-light hover:text-vault-teal dark:hover:bg-muted"
          aria-label="User Account Menu"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-vault-teal text-[10px] font-bold text-white">
            {userInitials}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 rounded-2xl p-0 shadow-xl overflow-hidden">
        {/* ── Header: Avatar + Name + Health ID ── */}
        <div className="border-b border-[#DCE8E5] dark:border-white/10 bg-[#F5F8F7] dark:bg-[#223431] p-4" dir={dir}>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-vault-teal text-sm font-bold text-white shadow-xs">
              {userInitials}
            </div>
            <div className="flex flex-col overflow-hidden">
              <p className="truncate text-sm font-bold text-[#1A2826] dark:text-white">
                {fullName}
              </p>
              <p className="truncate text-[11px] text-[#3D5450] dark:text-[#B2DFD4]">
                {user?.email || ""}
              </p>
              {healthId && (
                <Badge
                  variant="outline"
                  className="mt-1 w-fit border-vault-teal/30 bg-[#E8F7F4] px-1.5 py-0 text-[10px] font-bold text-vault-teal dark:border-teal-800 dark:bg-teal-950 dark:text-teal-300"
                >
                  {healthId}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* ── Nav Links ── */}
        <div className="p-1.5" dir={dir}>
          <DropdownMenuItem
            className="cursor-pointer gap-2.5 rounded-lg px-3 py-2.5 text-xs font-medium"
            onClick={() => router.push("/settings")}
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span>{t("nav.settings", "Profile Settings")}</span>
          </DropdownMenuItem>
        </div>

        {/* ── Sign Out ── */}
        <div className="border-t border-[#DCE8E5] dark:border-white/10 p-1.5" dir={dir}>
          <DropdownMenuItem
            className="cursor-pointer gap-2.5 rounded-lg px-3 py-2.5 text-xs font-bold text-[#C0392B] focus:bg-[#FDF2F2] focus:text-[#C0392B] dark:focus:bg-red-950/30"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            <span>{t("nav.signOut", "Sign Out")}</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
