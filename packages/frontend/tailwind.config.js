/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'bleepx-bg': 'var(--bleepx-bg)',
        'bleepx-white': 'var(--bleepx-white)',
        'bleepx-blue': 'var(--bleepx-blue)',
        'bleepx-blue-hover': 'var(--bleepx-blue-hover)',
        'bleepx-text': 'var(--bleepx-text)',
        'bleepx-text-secondary': 'var(--bleepx-text-secondary)',
        'bleepx-border': 'var(--bleepx-border)',
        'bleepx-gray': 'var(--bleepx-gray)',
        'bleepx-pink': 'var(--bleepx-pink)',
      },
      animation: {
        'bleepx-logo': 'bleepxLogo 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-in',
        'slide-in': 'slideIn 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
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
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
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