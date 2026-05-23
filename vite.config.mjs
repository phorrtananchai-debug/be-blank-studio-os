import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const isWebDeployment = process.env.VERCEL === '1' || process.env.VITE_WEB_BUILD === 'true';

export default defineConfig({
  base: isWebDeployment ? '/' : './',
  define: {
    'import.meta.env.VERCEL': JSON.stringify(isWebDeployment),
  },
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-ui': ['lucide-react'],
          'vendor-export': ['html-to-image', 'jspdf']
        }
      }
    }
  }
});
