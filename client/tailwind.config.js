/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#c2410c", // Terracotta
          hover: "#9a3412", // Burnt sienna
          accent: "#f59e0b", // Amber
          "accent-hover": "#d97706"
        },
        soc: {
          dark: "#0c0a09", // Warm deep black
          surface: "#171514", // Warm dark card / panel surface
          raised: "#262220", // Hover / selected row surface
          border: "#383431", // Warm dark divider / card border
          "border-light": "#57534e", // Raised borders / active focus
          muted: "#a8a29e", // Secondary text / metadata
          dim: "#78716c" // Placeholders / disabled text
        },
        risk: {
          low: {
            DEFAULT: "#10b981",
            bg: "rgba(16, 185, 129, 0.12)",
            border: "rgba(16, 185, 129, 0.35)",
            text: "#34d399"
          },
          medium: {
            DEFAULT: "#f59e0b",
            bg: "rgba(245, 158, 11, 0.12)",
            border: "rgba(245, 158, 11, 0.35)",
            text: "#fbbf24"
          },
          high: {
            DEFAULT: "#ea580c",
            bg: "rgba(234, 88, 12, 0.12)",
            border: "rgba(234, 88, 12, 0.35)",
            text: "#fb923c"
          },
          critical: {
            DEFAULT: "#e11d48",
            bg: "rgba(225, 29, 72, 0.14)",
            border: "rgba(225, 29, 72, 0.4)",
            text: "#fb7185"
          }
        }
      },
      fontFamily: {
        sans: ['"Source Sans 3"', "system-ui", "-apple-system", "sans-serif"],
        display: ['"Playfair Display"', "Georgia", "serif"],
        mono: ['"Fira Code"', "Consolas", "Courier New", "monospace"]
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "8px",
        md: "8px",
        lg: "12px",
        full: "9999px"
      },
      boxShadow: {
        warm: "0 4px 16px rgba(12, 10, 9, 0.4)",
        "warm-raised": "0 8px 24px rgba(12, 10, 9, 0.6)",
        "warm-glow": "0 0 16px rgba(194, 65, 12, 0.25)"
      }
    }
  },
  plugins: []
};
