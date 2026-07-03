import { defineNitroConfig } from 'nitro/config'
export default defineNitroConfig({
  preset: 'vercel',
  compatibilityDate: '2024-01-03',
  builder: 'rollup',
  serverDir: 'app',
})
