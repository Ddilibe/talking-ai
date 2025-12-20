import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
  tailwindcss(),
  viteStaticCopy({
    targets: [
      {
        src: "public/manifest.json",
        dest: "."
      },
      {
        src: "src/assets/icons",
        dest: "."
      },
      {
        src: "src/cmd",
        dest: "."
      }
    ],
  }),
  ],
  build: {
    outDir: 'build',
    rollupOptions: {
      input: {
        main: './index.html',
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name.endsWith('.png') ? 'assets/images/[name][extname]' : 'assets/js/[name]-[hash].js';
        }
      }
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
