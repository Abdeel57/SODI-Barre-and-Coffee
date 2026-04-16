import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['LOGOSODI.png', 'icons/*.png'],
      manifest: {
        name: 'SODI Barre & Coffee',
        short_name: 'SODI Barre',
        description: 'SODI Barre & Coffee – Reserva tus clases en línea',
        theme_color: '#0D0D0D',
        background_color: '#FAFAF8',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'icons/icon-72.png',             sizes: '72x72',   type: 'image/png' },
          { src: 'icons/icon-96.png',             sizes: '96x96',   type: 'image/png' },
          { src: 'icons/icon-128.png',            sizes: '128x128', type: 'image/png' },
          { src: 'icons/icon-144.png',            sizes: '144x144', type: 'image/png' },
          { src: 'icons/icon-152.png',            sizes: '152x152', type: 'image/png' },
          { src: 'icons/icon-192.png',            sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-384.png',            sizes: '384x384', type: 'image/png' },
          { src: 'icons/icon-512.png',            sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png',   sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],

  build: {
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor':    ['lucide-react', 'clsx'],
          'date-vendor':  ['date-fns'],
          'store-vendor': ['zustand'],
          'http-vendor':  ['axios'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },

  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
