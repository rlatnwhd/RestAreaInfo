import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  // Avoid Node's directory cleanup crash in this Windows OneDrive workspace.
  // index.html always points to the newly generated, hashed assets.
  build: { emptyOutDir: false },
})
