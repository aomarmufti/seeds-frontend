// SCRUM-32: the frontend's first real build step.
//
// The app is still plain DOM/JS — Vite is here for module resolution, bundling
// and code splitting, not for a framework. `dist/` is what Vercel serves.
import { defineConfig } from 'vite';

export default defineConfig({
  // Vercel serves the built output from the repo root's dist/.
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // The portal bundles are lazy-loaded, so a marketing visit no longer pays
    // for admin and tutor code. Keeping the warning limit low enough that the
    // eager chunk growing back gets noticed rather than silently accepted.
    chunkSizeWarningLimit: 400,
    rollupOptions: {
      output: {
        // Stable, readable chunk names — the point of the split is that you
        // can look at a network tab and see which portal loaded.
        chunkFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
  server: { port: 5173 },
  preview: { port: 4173 },
});
