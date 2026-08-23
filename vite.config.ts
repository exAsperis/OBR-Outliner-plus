import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { cpSync } from 'node:fs'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), {
    name: 'copy-website-assets',
    closeBundle() {
      cpSync(resolve(__dirname, 'website-assets'), resolve(__dirname, 'dist'), { recursive: true })
    },
  }],
  server: {
    cors: {
      origin: "https://www.owlbear.rodeo",
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        background: resolve(__dirname, 'background.html'),
        sendMenu: resolve(__dirname, 'send-menu.html'),
      },
    },
  },
})
