/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        chalk: "#F2F4EF",
        ink: "#17231C",
        moss: { DEFAULT: "#2F5D3A", dark: "#234729", light: "#E1EDE2" },
        sprout: { DEFAULT: "#BFE05A", dark: "#A9CB43" },
        mist: "#DDE8EA",
        rust: "#B3402F",
        sun: "#C98A1B",
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["Figtree", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
