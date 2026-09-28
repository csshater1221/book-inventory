import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Personal weekend-project PWA: shelfQ, a book inventory scanner.
// The service worker precaches the app shell so the app opens with no
// connection, and caches cover thumbnails and fonts as they're viewed.
// Book data itself is NOT handled here — Firestore keeps its own offline
// copy (see src/firebase.js) — and Google Books / Open Library API
// responses are deliberately never cached: a stale lookup is worse than
// a failed one, and lookups already fail fast when offline.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'shelfQ',
        short_name: 'shelfQ',
        description: 'Scan ISBNs to track the books you already own.',
        theme_color: '#B7B0D9',
        background_color: '#F6F3FC',
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
        globPatterns: ['**/*.{js,css,html,svg,png}'],

        // Any in-app URL opened while offline gets the cached app shell,
        // which then routes client-side. Firebase Auth's sign-in popup
        // lives under /__/ though — that has to always hit the network, or
        // Google sign-in would get handed index.html instead.
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/__\//],

        runtimeCaching: [
          {
            // Book cover thumbnails from Google Books / Open Library.
            // Cache-first: a cover never changes, and this is what lets
            // the library grid keep showing covers with no signal.
            // Cross-origin <img> responses are "opaque" (status 0), hence
            // allowing 0 alongside 200. The entry cap keeps it bounded.
            urlPattern: ({ request, url }) =>
              request.destination === 'image' && url.origin !== self.location.origin,
            handler: 'CacheFirst',
            options: {
              cacheName: 'book-cover-images',
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ],
  server: {
    // html5-qrcode needs camera access, which browsers only grant on
    // https or localhost. Vite's dev server on localhost is fine as-is.
    host: true
  }
})
