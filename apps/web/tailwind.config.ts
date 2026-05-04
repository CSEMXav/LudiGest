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
        bred: {
          red: "#C8102E",
          dark: "#8B0000",
        },
        p: {
          bg:      "#fef9f0",
          alt:     "#1e1610",
          card:    "#ffffff",
          ink:     "#1e1610",
          ink2:    "#5b4d40",
          ink3:    "#9a8b7c",
          rule:    "#ece1cd",
          primary: "#d24a1f",
          soft:    "#fde2d2",
          ocre:    "#e8a82f",
          vert:    "#6a8f3c",
          bleu:    "#286b7a",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body:    ["var(--font-inter)",   "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
