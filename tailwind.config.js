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
          canvas: '#e9e8e4',
          bone: '#f5f5f2',
          stone: '#e5e5e0',
          panel: '#f3f2ee',
          panelSoft: '#efeee9',
          line: 'rgba(0,0,0,0.04)',
          orange: '#9b6f32',
          gold: '#8f7a55',
          ink: '#121212',
          inkLight: '#1a1a1a',
          muted: '#8c8c88',
        },
      },
      boxShadow: {
        glow: '0 20px 50px rgba(0, 0, 0, 0.04)',
        studio: '0 12px 30px rgba(0, 0, 0, 0.04)',
        studioSoft: '0 8px 24px rgba(0, 0, 0, 0.02)',
        premium: '0 30px 60px -12px rgba(0, 0, 0, 0.08)',
      },
      letterSpacing: {
        tightest: '-.03em',
        editorial: '0.12em',
        cinema: '0.25em',
      },
    },
  },
  plugins: [],
};
