/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#2b2b2b',
          surface: '#1a1a1a',
          surface2: '#333333',
          accent: '#fcc636',
          accentHover: '#e6b535',
          danger: '#f87171',
          success: '#4ade80',
        },
      },
    },
  },
  plugins: [],
};
