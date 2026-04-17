/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1890FF',
          light: '#E6F7FF',
          dark: '#096DD9',
        },
        danger: '#FF4D4F',
        safe: '#52C41A',
      },
      fontFamily: {
        sans: ['Microsoft YaHei', 'PingFang SC', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
