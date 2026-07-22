import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Surfaces (60% - Fond principal)
        surface: {
          bg: "#04040A",
          primary: "#0A0A1A",
          secondary: "#12122A",
          tertiary: "#1A1A3A",
          elevated: "#22224A",
          hover: "#2A2A5A",
        },
        // Light mode surfaces
        "surface-light": {
          bg: "#FFFFFF",
          primary: "#F8F9FA",
          secondary: "#E9ECEF",
          tertiary: "#DEE2E6",
          elevated: "#CED4DA",
          hover: "#ADB5BD",
        },
        // Slate surfaces (60% - Alternative)
        slate: {
          950: "#020617",
          900: "#0f172a",
          800: "#1e293b",
          700: "#334155",
          600: "#475569",
          500: "#64748b",
          400: "#94a3b8",
          300: "#cbd5e1",
          200: "#e2e8f0",
          100: "#f1f5f9",
          50: "#f8fafc",
        },
        // Accent Violet (30% - Actions principales)
        violet: {
          primary: "#6D28D9",
          secondary: "#7C3AED",
          tertiary: "#8B5CF6",
          quaternary: "#A855F7",
          muted: "#C084FC",
          glow: "rgba(124, 58, 237, 0.5)",
          "glow-subtle": "rgba(124, 58, 237, 0.2)",
        },
        // Accent Gold/Amber (10% - Premium accents)
        gold: {
          primary: "#D4AF37",
          secondary: "#F4C430",
          tertiary: "#FFD166",
          muted: "#FDE68A",
          glow: "rgba(212, 175, 55, 0.5)",
          "glow-subtle": "rgba(212, 175, 55, 0.2)",
        },
        // Couleurs sémantiques
        success: {
          primary: "#10B981",
          bg: "rgba(16, 185, 129, 0.1)",
          border: "rgba(16, 185, 129, 0.2)",
        },
        warning: {
          primary: "#F59E0B",
          bg: "rgba(245, 158, 11, 0.1)",
          border: "rgba(245, 158, 11, 0.2)",
        },
        error: {
          primary: "#EF4444",
          bg: "rgba(239, 68, 68, 0.1)",
          border: "rgba(239, 68, 68, 0.2)",
        },
        info: {
          primary: "#3B82F6",
          bg: "rgba(59, 130, 246, 0.1)",
          border: "rgba(59, 130, 246, 0.2)",
        },
        // Texte
        text: {
          primary: "#FFFFFF",
          secondary: "rgba(255, 255, 255, 0.85)",
          tertiary: "rgba(255, 255, 255, 0.65)",
          muted: "rgba(255, 255, 255, 0.45)",
          disabled: "rgba(255, 255, 255, 0.25)",
        },
        // Light mode texte
        "text-light": {
          primary: "#1A1A2E",
          secondary: "rgba(26, 26, 46, 0.75)",
          tertiary: "rgba(26, 26, 46, 0.55)",
          muted: "rgba(26, 26, 46, 0.35)",
          disabled: "rgba(26, 26, 46, 0.2)",
        },
        // Bordures
        border: {
          subtle: "rgba(255, 255, 255, 0.08)",
          default: "rgba(255, 255, 255, 0.12)",
          strong: "rgba(255, 255, 255, 0.18)",
          violet: "rgba(124, 58, 237, 0.3)",
          "violet-strong": "rgba(124, 58, 237, 0.5)",
        },
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      fontSize: {
        "display-xs": ["32px", { lineHeight: "40px" }],
        "display-sm": ["40px", { lineHeight: "48px" }],
        "display-md": ["48px", { lineHeight: "56px" }],
        "display-lg": ["56px", { lineHeight: "64px" }],
        "display-xl": ["64px", { lineHeight: "72px" }],
      },
      spacing: {
        "1": "4px",
        "2": "8px",
        "3": "12px",
        "5": "20px",
        "10": "40px",
        "12": "48px",
        "16": "64px",
        "20": "80px",
        "24": "96px",
        "32": "128px",
        "40": "160px",
        "48": "192px",
        "56": "224px",
        "64": "256px",
      },
      borderRadius: {
        "2xl": "24px",
        "3xl": "32px",
      },
      boxShadow: {
        violet: "0 8px 24px rgba(124, 58, 237, 0.25)",
        "violet-lg": "0 16px 48px rgba(124, 58, 237, 0.35)",
        gold: "0 8px 24px rgba(212, 175, 55, 0.25)",
        "gold-lg": "0 16px 48px rgba(212, 175, 55, 0.35)",
      },
      animation: {
        "fade-in": "fadeIn 300ms ease-out",
        "fade-in-up": "fadeInUp 300ms ease-out",
        "fade-in-down": "fadeInDown 300ms ease-out",
        "scale-in": "scaleIn 300ms ease-out",
        "slide-in-right": "slideInRight 300ms ease-out",
        "pulse": "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "pulse-glow": "pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin": "spin 1s linear infinite",
        "bounce": "bounce 1s infinite",
        "gradient-x": "gradientX 3s ease infinite",
        "float": "float 6s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeInDown: {
          "0%": { opacity: "0", transform: "translateY(-20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        spin: {
          "from": { transform: "rotate(0deg)" },
          "to": { transform: "rotate(360deg)" },
        },
        bounce: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        pulseGlow: {
          "0%, 100%": { 
            boxShadow: "0 0 20px rgba(124, 58, 237, 0.4)",
            transform: "scale(1)",
          },
          "50%": { 
            boxShadow: "0 0 40px rgba(124, 58, 237, 0.8)",
            transform: "scale(1.05)",
          },
        },
        gradientX: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: {
        instant: "100ms",
        fast: "200ms",
        normal: "300ms",
        slow: "500ms",
        slower: "700ms",
      },
    },
  },
  plugins: [],
};

export default config;
