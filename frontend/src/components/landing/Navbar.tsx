"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Emergency QR", href: "#emergency-qr" },
  { label: "About", href: "#about" },
];

export default function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b border-vault-tealBorder bg-white transition-shadow duration-150 ${scrolled ? "shadow-sm backdrop-blur-md" : ""
        }`}
    >
      <div className="mx-auto flex h-16 max-w-landing items-center justify-between px-4 sm:px-6">
        {/* ── Left: Logo ── */}
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/navbar-footer-light.webp"
            alt="HealthVault AI logo"
            width={180}
            height={48}
            className="h-9 sm:h-10 w-auto object-contain"
            priority
            quality={90}
          />
        </Link>

        {/* ── Center: Nav Links (desktop) ── */}
        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-inter text-sm font-medium text-vault-mutedTeal transition-colors duration-150 hover:text-vault-teal"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* ── Right: Auth Buttons (desktop) ── */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="font-inter rounded-lg border border-vault-tealBorder px-4 py-2 text-sm font-medium text-vault-mutedTeal transition-colors duration-150 hover:border-vault-teal hover:text-vault-teal"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="font-inter rounded-lg bg-vault-teal px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-vault-active"
          >
            Get Started Free
          </Link>
        </div>

        {/* ── Mobile: Hamburger ── */}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg text-vault-mutedTeal md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* ── Mobile Drawer ── */}
      {mobileOpen && (
        <div className="border-t border-vault-tealBorder bg-white px-4 pb-4 pt-2 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 font-inter text-sm font-medium text-vault-mutedTeal transition-colors hover:bg-vault-light hover:text-vault-teal"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2 border-t border-vault-tealBorder pt-3">
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg border border-vault-tealBorder px-4 py-2.5 text-center text-sm font-medium text-vault-mutedTeal"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg bg-vault-teal px-4 py-2.5 text-center text-sm font-semibold text-white"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
