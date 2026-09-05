/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe6fe',
          200: '#bccffc',
          300: '#8faef9',
          400: '#5b83f3',
          500: '#375dea',
          600: '#2544d6',
          700: '#2038ae',
          800: '#1f338a',
          900: '#1e2f6d',
        },
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(16 24 40 / 0.04), 0 1px 3px 0 rgb(16 24 40 / 0.06)',
      },
    },
  },
  plugins: [],
};
