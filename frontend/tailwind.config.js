// frontend/tailwind.config.js

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  // --- ADD THIS SAFELIST BLOCK ---
  safelist: [
    'bg-energy-pink',
    'bg-energy-blue',
    'bg-energy-green',
    'bg-energy-amber',
    'group-hover:text-energy-pink',
    'group-hover:text-energy-blue',
    'group-hover:text-energy-green',
    'group-hover:text-energy-amber',
  ],
  // -----------------------------
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'teal-primary': '#008080',
        'orange-accent': '#F97316',
        'soft-bg-light': '#F7F8FC',
        'background': '#0A090F',
        'surface': '#191720',
        'surface-sunken': '#0F0E17',
        'primary': '#6D28D9',
        'border-subtle': 'rgba(255, 255, 255, 0.1)',
        'text-main': '#F9FAFB',
        'text-secondary': '#9CA3AF',
        'energy-pink': '#EC4899',
        'energy-blue': '#3B82F6',
        'energy-green': '#10B981',
        'energy-amber': '#F59E0B',
        'success': '#22C55E',
        'danger': '#EF4444',
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
      },
      keyframes: {
        'aurora-pan': {
          'from': { backgroundPosition: '0% 50%' },
          'to': { backgroundPosition: '100% 50%' },
        },
        'glow': {
          '0%, 100%': { opacity: '0.7', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        }
      },
      animation: {
        'aurora-pan': 'aurora-pan 20s linear infinite alternate',
        'glow': 'glow 4s ease-in-out infinite',
      },
      boxShadow: {
        soft: '0 2px 8px rgba(0, 0, 0, 0.05)',
        'glow-sm': '0 0 8px 0px var(--glow-color)',
        'glow-md': '0 0 16px 0px var(--glow-color)',
      },
    },
  },
  plugins: [],
};