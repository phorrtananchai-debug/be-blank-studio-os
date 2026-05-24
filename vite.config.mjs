import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const isWebDeployment = process.env.VERCEL === '1' || process.env.VITE_WEB_BUILD === 'true';

export default defineConfig({
  base: isWebDeployment ? '/' : './',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('firebase')) return 'vendor-firebase';
          if (id.includes('html2canvas') || id.includes('jspdf')) return 'vendor-export';
          return undefined;
        },
      },
    },
  },
  define: {
    'import.meta.env.VERCEL': JSON.stringify(isWebDeployment),
  },
  plugins: [react()],
});
