import { defineNitroConfig } from 'nitro/config'

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
            return '/root/src/router.tsx'
          }
          if (id === '#tanstack-start-entry') {
            return '/root/src/entry-server.tsx'
          }
          if (id === '#tanstack-start-server-fn-resolver') {
            return '/root/node_modules/@tanstack/start-server-core/dist/esm/fake-start-server-fn-resolver.js'
          }
          if (id === '#tanstack-start-plugin-adapters') {
            return '/root/node_modules/@tanstack/start-client-core/dist/esm/empty-plugin-adapters.js'
          }
          if (id === 'tslib' || id.startsWith('tslib/')) {
            return '/root/node_modules/tslib/tslib.es6.mjs'
          }
          if (id.endsWith('.css')) {
            return '\0empty-css'
          }
          if (id.startsWith('@/')) {
            const target = '/root/src/' + id.slice(2)
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
        }
      })
    }
  }
})
