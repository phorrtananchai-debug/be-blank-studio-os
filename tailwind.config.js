/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
        system: ['system-ui', 'sans-serif'],
      },
      colors: {
        studio: {
          canvas: '#f8f9fa',
          bone: '#ffffff',
          stone: '#f1f3f5',
          panel: '#ffffff',
          panelSoft: '#f8f9fa',
          line: 'rgba(0,0,0,0.06)',
          accent: '#212529',
          accentMuted: '#495057',
          orange: '#212529',
          gold: '#495057',
          ink: '#212529',
          inkLight: '#343a40',
          muted: '#868e96',
          mobile: {
            canvas: '#F5F5FA',
            ink: '#212121',
            muted: '#777777',
            line: 'rgba(33,33,33,0.08)',
            active: '#FFF0A3',
            progress: '#DBDFE9',
            success: '#CFDECA',
          },
        },
      },
      boxShadow: {
        glow: '0 1px 2px rgba(0, 0, 0, 0.05)',
        studio: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        studioSoft: '0 1px 3px rgba(0, 0, 0, 0.1)',
        premium: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        deep: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
      transitionTimingFunction: {
        'studio-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'studio-in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
      letterSpacing: {
        tightest: '-.01em',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
      },
    },
  },
  plugins: [],
};
