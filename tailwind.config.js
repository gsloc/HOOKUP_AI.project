/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          950: '#02060f',
          900: '#030d1e',
          850: '#050f24',
          800: '#071428',
          750: '#091830',
          700: '#0d1f3c',
          600: '#122848',
          500: '#1a3a6b',
          400: '#2452a0',
          300: '#3b72cc',
          200: '#5e9ae8',
          100: '#93c5fd',
          50:  '#dbeafe',
        },
        wave: {
          500: '#06b6d4',
          400: '#22d3ee',
          300: '#67e8f9',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'fade-up': 'fadeUp 0.3s ease-out forwards',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'wave-bob': 'waveBob 3s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        waveBob: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
      boxShadow: {
        'ocean-glow': '0 0 40px rgba(37, 99, 235, 0.15), 0 0 80px rgba(6, 182, 212, 0.05)',
        'message-bot': '0 2px 12px rgba(0, 0, 0, 0.4)',
        'message-user': '0 2px 12px rgba(37, 99, 235, 0.25)',
        'input-focus': '0 0 0 2px rgba(56, 189, 248, 0.3)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
