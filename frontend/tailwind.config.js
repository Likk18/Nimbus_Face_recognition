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
        background: "#090D16",
        surface: {
          DEFAULT: "#111827",
          elevated: "#161F30",
          subtle: "#0F1623",
        },
        border: "rgba(255, 255, 255, 0.08)",
        accent: {
          DEFAULT: "#0EA5E9",
          hover: "#38BDF8",
          subtle: "rgba(14, 165, 233, 0.12)",
        },
        match: {
          DEFAULT: "#10B981",
          subtle: "rgba(16, 185, 129, 0.12)",
        },
        reject: {
          DEFAULT: "#EF4444",
          subtle: "rgba(239, 68, 68, 0.12)",
        },
        warning: "#F59E0B",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
