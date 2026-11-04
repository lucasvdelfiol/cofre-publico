import type { Config } from "tailwindcss";

/**
 * Visual identity: "arquivo noturno".
 *
 * High-contrast editorial look built from a near-black warm base, bone text,
 * acid-lime highlights, hairline rules and monospaced numerals. The palette is
 * intentionally far from the light blue-white civic-tech template used by
 * other budget portals.
 */
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#080a08",
          900: "#0b0d0b",
          850: "#0f120f",
          800: "#131713",
          750: "#171c17",
          700: "#1c211b",
          600: "#252b23",
          500: "#333a2e",
          400: "#4b5342",
        },
        bone: {
          50: "#faf8ef",
          100: "#f3f0e5",
          200: "#dfdccb",
          300: "#c3c1af",
          400: "#a5a794",
          500: "#858878",
          600: "#6b6e60",
        },
        acid: {
          DEFAULT: "#d8f45c",
          dim: "#b9d147",
          soft: "#ecfaac",
        },
        ember: {
          DEFAULT: "#ff7a4d",
          soft: "#ffb49b",
        },
        mint: "#8ce99a",
        gold: "#f5c451",
        lilac: "#b9a7ff",
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
      borderRadius: {
        none: "0px",
        sm: "2px",
        DEFAULT: "2px",
        md: "2px",
        lg: "2px",
        xl: "2px",
        "2xl": "3px",
        "3xl": "4px",
      },
      boxShadow: {
        "2xs": "0 0 0 1px rgba(216, 244, 92, 0.04)",
        xs: "0 0 0 1px rgba(216, 244, 92, 0.05)",
        sm: "0 12px 30px -24px rgba(0, 0, 0, 0.95)",
        DEFAULT: "0 18px 40px -30px rgba(0, 0, 0, 1)",
        md: "0 18px 40px -30px rgba(0, 0, 0, 1)",
        lg: "0 28px 60px -40px rgba(0, 0, 0, 1)",
        xl: "0 36px 80px -48px rgba(0, 0, 0, 1)",
        "2xl": "0 44px 90px -50px rgba(0, 0, 0, 1)",
      },
      letterSpacing: {
        label: "0.18em",
        masthead: "0.24em",
      },
    },
  },
  plugins: [],
};

export default config;
