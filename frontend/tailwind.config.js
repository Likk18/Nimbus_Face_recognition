/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#080C14",
        surface: {
          DEFAULT: "#0F172A",
          elevated: "#15203B",
          subtle: "#0B1120",
          card: "#111C33",
        },
        border: "rgba(255, 255, 255, 0.09)",
        accent: {
          DEFAULT: "#0EA5E9",
          hover: "#38BDF8",
          subtle: "rgba(14, 165, 233, 0.15)",
        },
        brand: {
          cyan: "#06B6D4",
          sky: "#38BDF8",
          indigo: "#6366F1",
          violet: "#8B5CF6",
          purple: "#A855F7",
          emerald: "#10B981",
          teal: "#14B8A6",
          amber: "#F59E0B",
          rose: "#F43F5E",
          crimson: "#E11D48",
        },
        match: {
          DEFAULT: "#10B981",
          subtle: "rgba(16, 185, 129, 0.15)",
        },
        reject: {
          DEFAULT: "#F43F5E",
          subtle: "rgba(244, 63, 94, 0.15)",
        },
        warning: "#F59E0B",
      },
      boxShadow: {
        "glow-cyan": "0 0 25px -4px rgba(6, 182, 212, 0.25)",
        "glow-indigo": "0 0 25px -4px rgba(99, 102, 241, 0.25)",
        "glow-emerald": "0 0 25px -4px rgba(16, 185, 129, 0.25)",
        "glow-rose": "0 0 25px -4px rgba(244, 63, 94, 0.25)",
        "glow-amber": "0 0 25px -4px rgba(245, 158, 11, 0.25)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
