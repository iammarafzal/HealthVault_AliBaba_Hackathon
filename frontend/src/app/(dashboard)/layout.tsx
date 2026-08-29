"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import VoiceAssistantWidget from "@/components/voice/VoiceAssistantWidget";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  /* ── Detect mobile viewport ────────────────────────────── */
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarCollapsed(true);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  /* ── Close mobile sidebar on route change ─────────────── */
  useEffect(() => {
    setMobileOpen(false);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Mobile overlay backdrop ─────────────────────── */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────── */}
      {isMobile ? (
        /* Mobile: slide-over sheet */
        <div
          className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Sidebar
            collapsed={false}
            onToggle={() => setMobileOpen(false)}
          />
        </div>
      ) : (
        /* Desktop: persistent sidebar */
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((prev) => !prev)}
        />
      )}

      {/* ── Main content area ───────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar
          onMenuClick={() => setMobileOpen((prev) => !prev)}
          showMobileMenu={isMobile}
        />
        <main className="flex-1 overflow-y-auto p-3 pb-24 sm:p-4 md:p-6">
          {children}
        </main>
      </div>

      {/* ── Floating Voice Assistant ────────────────────── */}
      <VoiceAssistantWidget />
    </div>
  );
}
