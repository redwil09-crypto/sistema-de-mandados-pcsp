import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['novo_brasao_tatical.png', 'brasao_pcsp_colorido.png', 'brasao_pcsp_nova.png'],
        manifest: {
          name: 'Sistema de Mandados PCSP',
          short_name: 'Mandados',
          description: 'Sistema de Gestão de Mandados da Polícia Civil',
          theme_color: '#ffffff',
          start_url: '/',
          icons: [
            {
              src: 'novo_brasao_tatical.png',
              sizes: '192x192',
              type: 'image/png'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    }
  };
});
