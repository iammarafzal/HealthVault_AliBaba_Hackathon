import Link from "next/link";
import Image from "next/image";

const PRODUCT_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Emergency Card", href: "#emergency-qr" },
  { label: "Urdu Voice AI", href: "#urdu-section" },
];

const COMPANY_LINKS = [
  { label: "About Us", href: "#about" },
  { label: "Doctor Portal", href: "/login" },
  { label: "Emergency Triage", href: "#emergency-qr" },
  { label: "Contact Support", href: "mailto:support@healthvault.pk" },
];

const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "#" },
  { label: "Terms of Service", href: "#" },
  { label: "Patient Data Security", href: "#" },
];

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h4 className="font-jakarta text-sm font-semibold text-white tracking-wide">{title}</h4>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              className="font-inter text-sm text-vault-mist transition-colors duration-150 hover:text-white"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="bg-vault-slate border-t border-white/10">
      <div className="mx-auto max-w-landing px-4 py-12 sm:px-6 md:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* ── Col 1: Logo + tagline ── */}
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <Image
                src="/navbar-footer-dark.webp"
                alt="HealthVault AI logo"
                width={180}
                height={48}
                className="h-9 sm:h-10 w-auto object-contain"
                quality={90}
              />
            </Link>
            <p className="mt-4 font-inter text-sm leading-relaxed text-vault-mist">
              Pakistan&apos;s first AI-powered health record platform. Your complete medical history, always with you.
            </p>
          </div>

          {/* ── Col 2-4: Link columns ── */}
          <FooterColumn title="Product" links={PRODUCT_LINKS} />
          <FooterColumn title="Company" links={COMPANY_LINKS} />
          <FooterColumn title="Legal & Compliance" links={LEGAL_LINKS} />
        </div>

        {/* ── Bottom bar ── */}
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 sm:flex-row">
          <p className="font-inter text-xs text-vault-mist">
            &copy; {new Date().getFullYear()} HealthVault AI. All rights reserved.
          </p>
          <div className="flex items-center gap-2 font-inter text-xs text-vault-mist">
            <span>Engineered for Pakistan</span>
            <span>·</span>
            <span className="font-urdu text-xs text-emerald-300">پاکستان کا پہلا ہیلتھ او ایس</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
