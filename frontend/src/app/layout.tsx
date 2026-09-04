import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono, Noto_Nastaliq_Urdu, Noto_Sans_Arabic } from "next/font/google";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const urdu = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  variable: "--font-urdu",
  weight: ["400", "700"],
  display: "swap",
  fallback: ["Urdu Typesetting", "Jameel Noori Nastaleeq", "Noto Nastaliq Urdu", "serif"],
});

const arabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-arabic",
  weight: ["400", "600", "700"],
  display: "swap",
  fallback: ["Segoe UI", "Tahoma", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  title: "HealthVault AI — Your Complete Medical History",
  description:
    "One secure place for your complete medical history, intelligent healthcare assistance, and emergency access.",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jakarta.variable} ${jetbrainsMono.variable} ${urdu.variable} ${arabic.variable} font-inter antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider>
            <AuthProvider>
              <ToastProvider>{children}</ToastProvider>
              <Toaster position="top-right" richColors />
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
