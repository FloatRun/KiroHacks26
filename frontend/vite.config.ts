import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://gdla3hvoc8.execute-api.us-west-2.amazonaws.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
