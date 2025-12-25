/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        number: ['Roboto Mono', 'ui-sans-serif', 'system-ui', '-apple-system'],
      },

      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-1.6deg)' },
          '50%': { transform: 'rotate(1.6deg)' },
        },
        blink: {
          '0%, 100%': { opacity: '0', boxShadow: '0 0 0 rgba(var(--font-rgb), 0)' },
          '50%': { opacity: '1', boxShadow: '0 0 12px rgba(var(--font-rgb), 0.8)' },
        }
      },
      animation: {
        wiggle: 'wiggle 0.36s ease-in-out infinite',
        'blink-gold': 'blink 1.2s infinite ease-in-out',
      }
    },
  },
  plugins: [],
}

