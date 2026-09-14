/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: "#2c1810",
        nav: "#c45c26",
        accent: "#d4a017",
        cream: "#f6efe3",
        turmeric: "#e0a100",
        chili: "#b42318",
        leaf: "#3f6b3a",
        earth: "#6b4f3a",
        charcoal: "#1f1a17",
        gold: "#d4a017",
        paper: "#fbf6ee",
        beige: "#efe4d2",
      },
      fontFamily: {
        serif: ['"Source Serif 4"', "Georgia", "serif"],
        sans: ['"Source Sans 3"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 10px 28px rgba(44, 24, 16, 0.08)",
      },
      borderRadius: {
        DEFAULT: "0.5rem",
      },
    },
  },
  plugins: [],
};
