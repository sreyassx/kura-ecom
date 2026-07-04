import { defineNitroConfig } from 'nitro/config'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve('.')

const serverCoreMain = fileURLToPath(import.meta.resolve('@tanstack/start-server-core'))
const serverCoreDir = dirname(serverCoreMain)
const fakeResolver = resolve(serverCoreDir, 'fake-start-server-fn-resolver.js')

const clientCoreMain = fileURLToPath(import.meta.resolve('@tanstack/start-client-core'))
const clientCoreDir = dirname(clientCoreMain)
const emptyAdapters = resolve(clientCoreDir, 'empty-plugin-adapters.js')

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
            return fakeResolver
          }
          if (id === '#tanstack-start-plugin-adapters') {
            return emptyAdapters
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
