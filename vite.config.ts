import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
})

// separate vitest config (if running vitest via Vite, use vitest.config.ts)
