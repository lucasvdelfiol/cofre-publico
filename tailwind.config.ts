import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          50: "#fbfaf8",
          100: "#f6f3ee",
          200: "#ede7dd",
          300: "#ded4c3",
          400: "#c7b79e",
        },
        civic: {
          ink: "#0c1829",
          slate: "#1f2937",
          muted: "#64748b",
          border: "#e2e8f0",
          card: "#ffffff",
        },
        ledger: {
          forest: "#1c5a38",
          forestLight: "#e9f5ee",
          navy: "#1e3a5f",
          navyLight: "#edf3f9",
          amber: "#92400e",
          amberLight: "#fef3c7",
          crimson: "#991b1b",
          crimsonLight: "#fee2e2",
        },
      },
      fontFamily: {
        serif: [
          "Charter",
          "Bitstream Charter",
          "Sitka Text",
          "Cambria",
          "Georgia",
          "serif",
        ],
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
