/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tldzRed: "#EF2828",
        tldzPurple: "#473198",
        tldzGray: "#BDB4BF",
        tldzBlue: "#3185FC",
      },
    },
  },
  plugins: [],
}
