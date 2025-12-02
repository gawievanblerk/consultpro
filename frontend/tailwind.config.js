/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // TeamACE Brand Colors - Maroon & Orange
        primary: {
          50: '#fdf2f2',
          100: '#fce4e4',
          200: '#f5b3b3',
          300: '#e67373',
          400: '#cc4040',
          500: '#a32020',
          600: '#8b0000',
          700: '#800000', // Maroon
          800: '#660000',
          900: '#4d0000', // Dark Maroon
        },
        accent: {
          50: '#fff8eb',
          100: '#ffecc7',
          200: '#ffd98a',
          300: '#ffc94d',
          400: '#ffb820',
          500: '#ffa500', // Orange
          600: '#e69500',
          700: '#cc8400',
          800: '#a36a00',
          900: '#7a4f00',
        },
        teal: {
          50: '#e6f2f2',
          100: '#b3d9d9',
          200: '#80bfbf',
          300: '#4da6a6',
          400: '#268c8c',
          500: '#006666',
          600: '#005555',
          700: '#003333', // Dark Teal
          800: '#002626',
          900: '#001a1a',
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
