import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    extensions: ['.ts', '.mts', '.tsx', '.mjs', '.js', '.jsx', '.json'],
  },
  server: {
    fs: {
      allow: ['../..'],
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        entryFileNames: 'bundle.js',
      },
    },
  },
})
