import { defineConfig } from 'vite';
import webExtension from 'vite-plugin-web-extension';
import path from 'path';

export default defineConfig({
  // Set root to src/ so that manifest.json paths like "popup/index.html",
  // "background.js", and "content.js" resolve correctly relative to src/.
  root: path.resolve(__dirname, 'src'),
  // Output to dist/ at the project root (one level above src/)
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  define: {
    __API_URL__: JSON.stringify(
      process.env.TRUSTGUARD_API_URL || 'http://localhost:5000/api'
    ),
  },
  plugins: [
    webExtension({
      // Explicit path to manifest.json at project root
      manifest: path.resolve(__dirname, 'manifest.json'),
    }),
  ],
});
