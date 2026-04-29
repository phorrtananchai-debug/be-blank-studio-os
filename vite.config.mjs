import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const isWebDeployment = process.env.VERCEL === '1' || process.env.VITE_WEB_BUILD === 'true';

export default defineConfig({
  base: isWebDeployment ? '/' : './',
  plugins: [react()],
});
