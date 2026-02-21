/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'bleepx-bg': '#F5F7FA', // Light Gray-Blue (background)
        'bleepx-white': '#FFFFFF', // White (cards/sections)
        'bleepx-blue': '#2563EB', // Blue 600 (primary accent)
        'bleepx-blue-hover': '#3B82F6', // Blue 500 (hover accent)
        'bleepx-text': '#111827', // Gray 900 (primary text)
        'bleepx-text-secondary': '#6B7280', // Gray 500 (secondary text)
        'bleepx-border': '#E5E7EB', // Gray 200 (borders/shadows)
      },
      animation: {
        'bleepx-logo': 'bleepxLogo 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-in',
        'slide-in': 'slideIn 0.5s ease-out',
        'bleepx-pulse': 'bleepxPulse 1s ease-out',
      },
      keyframes: {
        bleepxLogo: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bleepxPulse: {
          '0%': {
            transform: 'scale(1)',
            opacity: '0.8',
            boxShadow: '0 0 0 0 rgba(37, 99, 235, 0.7)', // Matches bleepx-blue
          },
          '70%': {
            transform: 'scale(2)',
            opacity: '0.2',
            boxShadow: '0 0 0 20px rgba(37, 99, 235, 0)',
          },
          '100%': {
            transform: 'scale(2.5)',
            opacity: '0',
            boxShadow: '0 0 0 0 rgba(37, 99, 235, 0)',
          },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};