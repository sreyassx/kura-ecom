import { defineNitroConfig } from 'nitro/config'
import { resolve } from 'path'

const root = resolve('.')

export default defineNitroConfig({
  preset: 'vercel',
  compatibilityDate: '2024-01-03',
  builder: 'rollup',
  serverDir: 'app',
  hooks: {
    'rollup:before'(nitro, config) {
      config.plugins.unshift({
        name: 'resolve-tanstack-entries',
        async resolveId(id, importer) {
          if (id === '#tanstack-router-entry') {
            return resolve(root, 'src/router.tsx')
          }
          if (id === '#tanstack-start-entry') {
            return resolve(root, 'src/entry-server.tsx')
          }
          if (id === '#tanstack-start-server-fn-resolver') {
            return resolve(root, 'node_modules/@tanstack/start-server-core/dist/esm/server-functions-manifest.js')
          }
          if (id === '#tanstack-start-plugin-adapters') {
            return resolve(root, 'node_modules/@tanstack/start-client-core/dist/esm/empty-plugin-adapters.js')
          }
          if (id.endsWith('.css')) {
            return '\0empty-css'
          }
          if (id.startsWith('@/')) {
            const target = resolve(root, 'src', id.slice(2))
            const resolved = await this.resolve(target, importer, { skipSelf: true })
            return resolved
          }
          return null
        },
        load(id) {
          if (id === '\0empty-css') {
            return 'export default {}'
          }
          return null
        },
      })
    },
  },
})
