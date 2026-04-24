import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const isProduction = mode === 'production';

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      // Otimizações para produção
      minify: isProduction ? 'esbuild' : false,
      sourcemap: !isProduction,
      rollupOptions: {
        output: {
          manualChunks: {
            // Separar vendor chunks para melhor cache
            vendor: ['react', 'react-dom', 'react/jsx-runtime'],
            ui: ['lucide-react', 'framer-motion', 'motion', 'recharts'],
            utils: ['date-fns', 'clsx', 'papaparse', 'xlsx', 'tailwind-merge'],
            ai: ['@google/genai'],
          },
        },
      },
      // Otimizar chunks
      chunkSizeWarningLimit: 1000,
      cssCodeSplit: true,
      // Compressão
      reportCompressedSize: false, // Desabilitar para builds mais rápidos
    },
  };
});
