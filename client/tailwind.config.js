/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#0b0f19",
          surface: "#111827",
          border: "#1f2937",
          accent: "#0284c7"
        }
      }
    }
  },
  plugins: []
};
