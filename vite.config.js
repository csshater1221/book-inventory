import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Personal weekend-project PWA: book inventory scanner.
// The service worker only precaches the app shell — book data lives in
// Firestore, and we deliberately do NOT cache Google Books / Open Library
// API responses, since stale lookup data is worse than a failed lookup.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Book Inventory',
        short_name: 'Books',
        description: 'Scan ISBNs to track the books you already own.',
        theme_color: '#2F5D50',
        background_color: '#EFEAE0',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        // App shell only. Runtime API calls (Firestore, Google Books,
        // Open Library) are left alone — they have their own retry/offline
        // handling in code, not the service worker.
        globPatterns: ['**/*.{js,css,html,svg,png}']
      }
    })
  ],
  server: {
    // html5-qrcode needs camera access, which browsers only grant on
    // https or localhost. Vite's dev server on localhost is fine as-is.
    host: true
  }
})
