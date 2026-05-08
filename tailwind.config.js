/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Montserrat', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Cormorant Garamond', 'serif'],
        urbanist: ['Urbanist', 'sans-serif'],
      },
      colors: {
        studio: {
          black: '#e9e8e4',
          panel: '#f3f2ee',
          panelSoft: '#efeee9',
          line: 'rgba(0,0,0,0.08)',
          orange: '#9b6f32',
          gold: '#8f7a55',
          ink: '#111111',
          muted: '#777777',
        },
      },
      boxShadow: {
        glow: '0 12px 30px rgba(0, 0, 0, 0.06)',
        studio: '0 12px 30px rgba(0, 0, 0, 0.06)',
        studioSoft: '0 12px 30px rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
};
