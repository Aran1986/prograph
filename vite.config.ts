import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Crucial for Electron: uses relative paths for assets
  server: {
    port: 5173,
  },
  define: {
    // Determine API Key strategy: 
    // In a real Electron app, this should be injected securely or entered by user.
    // For this prototype, we pass the build-time env var.
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
});