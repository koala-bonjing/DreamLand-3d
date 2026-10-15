import { defineConfig } from 'vite';
import { resolve } from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Dreamland 3D',
        short_name: 'Dreamland',
        description: 'Cozy 3D pastel flying adventure for two',
        theme_color: '#ffd9ec',
        background_color: '#ffd9ec',
        display: 'standalone',
        orientation: 'landscape',
        icons: [
          {
            src: '/icon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}']
      }
    })
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        bench: resolve(__dirname, 'bench/index.html')
      }
    }
  }
});
