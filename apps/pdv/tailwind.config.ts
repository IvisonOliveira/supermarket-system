import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#0f2b4c',
          secondary: '#cda03f',
          accent: '#e8b74f',
        },
        // Paleta base do PDV — fundo escuro para uso em ambiente de loja
        pdv: {
          bg: '#111827', // gray-900
          surface: '#1f2937', // gray-800
          border: '#374151', // gray-700
          text: '#f9fafb', // gray-50
          muted: '#9ca3af', // gray-400
          primary: '#3b82f6', // blue-500
          success: '#22c55e', // green-500
          warning: '#f59e0b', // amber-500
          danger: '#ef4444', // red-500
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
