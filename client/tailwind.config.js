/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{ts,tsx}"],
    theme: {
      extend: {
        colors: {
          smx: {
            red: "#e1111a",
            red2: "#b30b12",
            bg: "#0b0b0c",
            panel: "#151517",
            panel2: "#1b1b1e",
            line: "#2a2a2f",
            text: "#e9e9ee",
            muted: "#a0a0aa"
          }
        }
      }
    },
    plugins: []
  };
  