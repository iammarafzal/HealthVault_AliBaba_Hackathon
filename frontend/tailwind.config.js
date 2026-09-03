/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        /* Stitch Custom Design Palette */
        vault: {
          teal: "#0D5C4A",
          active: "#0A8C6A",
          dark: "#004335",
          light: "#E8F7F4",
          border: "#DCE8E5",
          surface: "#F5F8F7",
          slate: "#1A2826",
          red: "#C0392B",
          warning: "#C47C1A",
          warningBg: "#FEF5E4",
          mist: "#B2DFD4",
          amber: "#C47C1A",
          amberLight: "#F4A52A",
          amberTint: "#FEF5E4",
          mutedTeal: "#3D5450",
          stoneWhite: "#F5F8F7",
          tealBorder: "#DCE8E5",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        jakarta: ["var(--font-jakarta)", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        inter: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        urdu: ["var(--font-urdu)", "Noto Nastaliq Urdu", "Urdu Typesetting", "Jameel Noori Nastaleeq", "serif"],
        arabic: ["var(--font-arabic)", "Noto Sans Arabic", "Segoe UI", "Tahoma", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      fontSize: {
        "hero-heading": ["clamp(2.5rem, 5vw, 4rem)", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "600" }],
        "section-h2": ["clamp(1.75rem, 3vw, 2.5rem)", { lineHeight: "1.2", fontWeight: "600" }],
        "body-lg": ["1.125rem", { lineHeight: "1.7" }],
        "body-sm": ["0.875rem", { lineHeight: "1.5" }],
        "label": ["0.75rem", { fontWeight: "500", letterSpacing: "0.04em" }],
      },
      maxWidth: {
        "landing": "1200px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "collapsible-down": {
          from: { height: "0" },
          to: { height: "var(--radix-collapsible-content-height)" },
        },
        "collapsible-up": {
          from: { height: "var(--radix-collapsible-content-height)" },
          to: { height: "0" },
        },
        "dialog-in": {
          from: { opacity: "0", transform: "scale(0.95) translateY(10px)" },
          to: { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "dialog-out": {
          from: { opacity: "1", transform: "scale(1) translateY(0)" },
          to: { opacity: "0", transform: "scale(0.95) translateY(10px)" },
        },
        "toast-slide-in": {
          from: { transform: "translateX(calc(100% + 1rem))" },
          to: { transform: "translateX(0)" },
        },
        "toast-slide-out": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(calc(100% + 1rem))" },
        },
        "toast-swipe-out": {
          from: { transform: "translateX(var(--radix-toast-swipe-end-x))" },
          to: { transform: "translateX(calc(100% + 1rem))" },
        },
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "collapsible-down": "collapsible-down 0.2s ease-out",
        "collapsible-up": "collapsible-up 0.2s ease-out",
        "dialog-in": "dialog-in 0.2s ease-out",
        "dialog-out": "dialog-out 0.15s ease-in",
        "toast-slide-in": "toast-slide-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "toast-slide-out": "toast-slide-out 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        "toast-swipe-out": "toast-swipe-out 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        marquee: "marquee 40s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

module.exports = config;
