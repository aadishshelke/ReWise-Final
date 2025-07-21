// frontend/tailwind.config.js

/** @type {import('tailwindcss').Config} */
// --- THIS IS THE FIX ---
export default {
  // -----------------------
    darkMode: 'class',
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
      extend: {
        colors: {
          primary: '#008080',  // Teal
          accent: '#F97316',   // Orange
          softbg: '#F7F8FC',   // Soft White
        },
        fontFamily: {
          poppins: ['Poppins', 'sans-serif'],
        },
        boxShadow: {
          soft: '0 2px 8px rgba(0, 0, 0, 0.05)',
        },
      },
    },
    plugins: [],
  };