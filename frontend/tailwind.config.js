/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // TeamACE Brand Colors
        primary: {
          50: '#e8eaf4',
          100: '#c5cbe4',
          200: '#9ea9d2',
          300: '#7787c0',
          400: '#596db3',
          500: '#3b53a5',
          600: '#354c9d',
          700: '#2d4293',
          800: '#263989',
          900: '#0d2865', // Primary Navy
        },
        accent: {
          50: '#e4fbf9',
          100: '#bdf5f1',
          200: '#91eee8',
          300: '#65e7df',
          400: '#44e1d8',
          500: '#41d8d1', // Primary Teal
          600: '#3bc7bc',
          700: '#33b1a5',
          800: '#2c9b8f',
          900: '#1f776c',
        },
        // Semantic colors
        success: {
          50: '#ecfdf5',
          500: '#10b981',
          700: '#047857',
        },
        warning: {
          50: '#fffbeb',
          500: '#f59e0b',
          700: '#b45309',
        },
        danger: {
          50: '#fef2f2',
          500: '#ef4444',
          700: '#b91c1c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
