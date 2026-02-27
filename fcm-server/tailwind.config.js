/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}'
  ],
  theme: {
    extend: {
      boxShadow: {
        soft: '0 10px 40px rgba(2, 8, 20, 0.08)'
      }
    }
  },
  plugins: []
};
