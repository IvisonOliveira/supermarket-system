import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#0f2b4c',
          secondary: '#cda03f',
          accent: '#e8b74f',
        },
        primary: {
          50: '#eef1f9',
          100: '#d5dcf0',
          200: '#aab9e1',
          300: '#7f96d2',
          400: '#5473c3',
          500: '#3356b4',
          600: '#1B2A5E',
          700: '#152248',
          800: '#0f1932',
          900: '#0a111f',
        },
        gold: {
          50: '#fdf8ec',
          100: '#faefd0',
          200: '#f5dfa1',
          300: '#efcf72',
          400: '#e9be43',
          500: '#C9A227',
          600: '#a07d1c',
          700: '#785e15',
          800: '#503f0e',
          900: '#281f07',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
