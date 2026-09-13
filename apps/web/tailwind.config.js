/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: "#2c1810",
        nav: "#c45c26",
        accent: "#d4a017",
        cream: "#f7f1e8",
        turmeric: "#e0a100",
        earth: "#6b4f3a",
        charcoal: "#1f1a17",
        gold: "#d4a017",
      },
      fontFamily: {
        serif: ['"Source Serif 4"', "Georgia", "serif"],
        sans: ['"Source Sans 3"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 8px 30px rgba(44, 24, 16, 0.08)",
      },
    },
  },
  plugins: [],
};
