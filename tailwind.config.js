/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        playfair: ['"Playfair Display"', 'serif'],
        sans: ['"Noto Sans JP"', 'sans-serif'],
      },
      colors: {
        gold: '#c9a84c',
        'gold-light': '#e8cc80',
        cream: '#fdf6e3',
        felt: '#1a5c38',
        'felt-dark': '#0e3d26',
        dark: '#0a1628',
      },
    },
  },
  plugins: [],
}
