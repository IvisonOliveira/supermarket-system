import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/renderer/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        pdv: {
          bg: '#0a111f',
          surface: '#0f1932',
          border: '#1B2A5E',
          text: '#f9fafb',
          muted: '#9ca3af',
          primary: '#1B2A5E',
          'primary-light': '#3356b4',
          gold: '#C9A227',
          'gold-light': '#e9be43',
          success: '#22c55e',
          warning: '#f59e0b',
          danger: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
