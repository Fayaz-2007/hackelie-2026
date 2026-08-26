import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // host: true binds to 0.0.0.0 so the dashboard is reachable from other
  // devices on the same WiFi, matching how the backend URL is derived
  // from window.location.hostname in src/api.js.
  server: {
    host: true,
  },
})
