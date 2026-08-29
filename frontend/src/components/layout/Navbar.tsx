"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  Bell,
  Check,
  Clock,
  LogOut,
  Moon,
  Settings,
  ShieldAlert,
  Sun,
  User,
  UserCircle,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mockEmergencyProfile } from "@/lib/mockData";

const notifications = [
  {
    id: 1,
    title: "Missed Metformin 500mg dose",
    time: "2 hours ago",
    icon: Clock,
    urgent: true,
  },
  {
    id: 2,
    title: "Drug interaction flagged in recent upload",
    time: "5 hours ago",
    icon: ShieldAlert,
    urgent: true,
  },
  {
    id: 3,
    title: "Emergency QR accessed",
    time: "1 day ago",
    icon: User,
    urgent: false,
  },
];

export default function Navbar() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — only render theme icon after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
      {/* Branding */}
      <Link href="/" className="flex items-center gap-2">
        <Activity className="h-6 w-6 text-primary" />
        <span className="hidden text-lg font-semibold sm:inline-block">
          HealthVault AI
        </span>
      </Link>

      <div className="flex flex-1 items-center justify-end gap-2">
        {/* ── Emergency Quick-Access Badge ── */}
        <Badge
          variant="destructive"
          className="hidden cursor-pointer items-center gap-1 px-3 py-1 sm:flex"
          onClick={() =>
            router.push(`/emergency/${mockEmergencyProfile.health_id}`)
          }
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          Emergency
        </Badge>

        {/* ── Notifications Bell ── */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                {notifications.length}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <DropdownMenuLabel className="flex items-center justify-between border-b px-4 py-3">
              <span>Notifications</span>
              <Badge variant="secondary" className="text-xs">
                {notifications.length} new
              </Badge>
            </DropdownMenuLabel>
            {notifications.map((n) => (
              <DropdownMenuItem
                key={n.id}
                className="cursor-pointer items-start gap-3 whitespace-normal p-4"
              >
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    n.urgent ? "bg-destructive/10" : "bg-muted"
                  }`}
                >
                  <n.icon
                    className={`h-4 w-4 ${
                      n.urgent ? "text-destructive" : "text-muted-foreground"
                    }`}
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium leading-snug">
                    {n.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {n.time}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer justify-center text-center text-sm text-primary"
              onClick={() => router.push("/notifications")}
            >
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* ── Theme Toggle ── */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {mounted ? (
            theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        {/* ── Profile / Account Menu ── */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">Saeed Asif</p>
                <p className="text-xs text-muted-foreground">
                  Health ID: {mockEmergencyProfile.health_id}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() => router.push("/settings")}
            >
              <Settings className="h-4 w-4" />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() =>
                router.push(`/emergency/${mockEmergencyProfile.health_id}`)
              }
            >
              <UserCircle className="h-4 w-4" />
              View Health ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer gap-2 text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
