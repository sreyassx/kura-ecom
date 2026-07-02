import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

if (typeof process !== 'undefined') {
  process.on('uncaughtException', (err) => {
    if (err && err.message && err.message.includes('Stream lifetime exceeded')) {
      console.warn('🔔 [Vite Config] Caught and ignored stream timeout (lifetime exceeded).');
      return;
    }
    console.error('🔥 [Vite Config] Uncaught Exception:', err);
    process.exit(1);
  });
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Wrapper to prevent "Cannot read properties of undefined (reading 'meta')" in Vite 6 config hooks
function safeNitro(options?: any) {
  const plugins = nitro(options)
  return plugins.map((p: any) => {
    if (p && p.config) {
      const originalConfig = p.config
      p.config = function (this: any, ...args: any[]) {
        return originalConfig.apply(this || { meta: {} }, args)
      }
    }
    return p
  })
}

export default defineConfig({
  plugins: [
    tanstackStart(),
    safeNitro(),
    react()
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
})
