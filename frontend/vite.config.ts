import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

export default defineConfig({
  plugins: [
    // Dev-only plugin: POST /dev-frames/save → escribe tierFrameConfig.ts
    {
      name: 'dev-frames-save',
      configureServer(server) {
        server.middlewares.use('/dev-frames/save', (req, res) => {
          if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
          let body = ''
          req.on('data', (chunk: Buffer) => { body += chunk.toString() })
          req.on('end', () => {
            try {
              const configs = JSON.parse(body) as Record<string, { scale: number; offsetX: number; offsetY: number }>
              const lines = Object.entries(configs).map(([id, c]) =>
                `  ${id}: {\n    scale:   ${c.scale.toFixed(2)},\n    offsetX: ${Math.round(c.offsetX)},\n    offsetY: ${Math.round(c.offsetY)},\n  },`
              ).join('\n')
              const content =
`/**
 * ─── CONFIGURACIÓN DE MARCOS DE TIER ─────────────────────────────────────────
 * Edita en /dev-frames: arrastra el marco, ajusta los sliders y pulsa Guardar.
 *
 * scale   → tamaño del PNG vs la foto  (1.0 = igual, 1.3 = 30% más grande)
 * offsetX → posición horizontal en px  (+ derecha / - izquierda)
 * offsetY → posición vertical en px    (+ abajo   / - arriba)
 */

export interface TierFrameConfig {
  scale:   number
  offsetX: number
  offsetY: number
}

export const TIER_FRAME_CONFIG: Record<string, TierFrameConfig> = {
${lines}
}
`
              const outPath = path.resolve(__dirname, 'src/components/tierFrameConfig.ts')
              fs.writeFileSync(outPath, content, 'utf-8')
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: true }))
            } catch (e) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: String(e) }))
            }
          })
        })

        // POST /dev-frames/publish → git commit + push
        server.middlewares.use('/dev-frames/publish', (req, res) => {
          if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
          req.on('data', () => {})
          req.on('end', () => {
            try {
              const root = path.resolve(__dirname, '..')
              const configFile = 'frontend/src/components/tierFrameConfig.ts'
              execSync(`git -C "${root}" add "${configFile}"`, { stdio: 'pipe' })
              execSync(
                `git -C "${root}" commit -m "chore: actualizar configuración de marcos de tier"`,
                { stdio: 'pipe' }
              )
              execSync(`git -C "${root}" push origin main`, { stdio: 'pipe' })
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: true }))
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : String(e)
              // Si no hay cambios que commitear, git devuelve exit 1 — no es un error real
              if (msg.includes('nothing to commit') || msg.includes('nothing added')) {
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ ok: true, skipped: true }))
              } else {
                res.statusCode = 500
                res.end(JSON.stringify({ error: msg }))
              }
            }
          })
        })
      },
    },
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
