/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#d4ff00",
          fg: "#0a0a0a",
          muted: "#b8e600",
          dim: "#8fa300",
        },
        surface: {
          DEFAULT: "#111111",
          deep: "#0a0a0a",
          raised: "#1a1a1a",
          hover: "#222222",
        },
      },
      fontFamily: {
        sans: [
          "Manrope",
          "Inter",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
