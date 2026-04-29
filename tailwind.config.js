/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Montserrat', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        studio: {
          black: '#0b0b0b',
          panel: '#141414',
          panelSoft: '#191919',
          line: '#2a2a2a',
          orange: '#ff8800',
          gold: '#c89b3c',
          ink: '#f5efe6',
          muted: '#a8a29a',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(255, 136, 0, 0.16), 0 22px 70px rgba(0, 0, 0, 0.42)',
        studio: '0 18px 60px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.035)',
        studioSoft: '0 12px 34px rgba(0, 0, 0, 0.24)',
      },
    },
  },
  plugins: [],
};
