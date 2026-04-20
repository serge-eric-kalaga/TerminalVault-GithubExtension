/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}', './context/**/*.{js,jsx}', './lib/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        'primary-hover': '#1D4ED8',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444'
      },
      animation: {
        shake: 'shake 0.4s ease-in-out',
        'gradient-shift': 'gradient-shift 12s ease infinite'
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' }
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' }
        }
      }
    }
  },
  plugins: []
};
