/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#FFD400',
        'primary-hover': '#E6BE00',
        bg: '#0B0B0B',
        panel: '#171717',
        table: '#1F1F1F',
        text: '#F5F5F5',
        muted: '#A3A3A3',
        border: '#333333'
      }
    }
  },
  plugins: []
};

