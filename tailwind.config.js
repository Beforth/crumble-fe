/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "#ffffff",
        surface: "#f8fafc",
        "surface-2": "#f1f5f9",
        border: "#e2e8f0",
        primary: {
          DEFAULT: "#f97316",
          hover: "#ea6c0a",
          muted: "rgba(249,115,22,0.12)",
        },
        "text-primary": "#0f172a",
        "text-secondary": "#475569",
        "text-muted": "#64748b",
        success: "#22c55e",
        warning: "#eab308",
        danger: "#ef4444",
        info: "#3b82f6",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)"],
        mono: ["var(--font-geist-mono)"],
      },
    },
  },
  plugins: [],
};
