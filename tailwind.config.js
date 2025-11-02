/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './public/**/*.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        radiant: {
          DEFAULT: '#92A525',
          dark: '#6B7B1C',
        },
        dire: {
          DEFAULT: '#C23C2A',
          dark: '#8B2C1F',
        },
      },
    },
  },
  plugins: [],
};

