import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // The Firestore SDK is ~520KB minified and there is no smaller build of
    // it; every other chunk is comfortably under. Raised so the warning means
    // "something regressed" again rather than firing on every single build,
    // which is how warnings get ignored.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        /**
         * Split the big third-party dependencies into their own chunks.
         *
         * Route-level lazy loading already moved the app's own screens out of
         * the entry chunk, but that barely moved the number — the weight was
         * never our pages, it was Firebase. Firestore alone is larger than
         * every page component put together.
         *
         * Splitting buys two things a single bundle can't:
         *   - parallel download, instead of one serial file blocking paint
         *   - real cache hits, because shipping a copy change no longer
         *     invalidates half a megabyte of unrelated vendor code
         *
         * Firestore and Auth are separated on purpose even though both load on
         * the landing page today: Auth is only there because the nav shows a
         * sign-in link, and if that ever becomes deferred, Auth drops out of
         * the initial load without touching this config again.
         */
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase-firestore': ['firebase/firestore'],
          'vendor-firebase-auth': ['firebase/auth', 'firebase/app'],
          'vendor-motion': ['framer-motion'],
        },
      },
    },
  },
})
