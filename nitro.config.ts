import { defineNitroConfig } from 'nitro/config'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

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
  noExternals: ['tslib', 'tanstack-start-manifest:v'],

  hooks: {
    'rollup:before'(nitro, config) {
      const originalExternal = config.external
      config.external = function (id, importer, isResolved) {
        if (id === 'tslib' || id.startsWith('tslib/')) {
          return false
        }
        if (id === 'tanstack-start-manifest:v') {
          return false
        }
        if (typeof originalExternal === 'function') {
          return originalExternal(id, importer, isResolved)
        }
        if (Array.isArray(originalExternal)) {
          return originalExternal.includes(id)
        }
        return !!originalExternal
      }

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
          if (id === 'tslib' || id.startsWith('tslib/')) {
            return resolve(root, 'node_modules/tslib/tslib.es6.mjs')
          }
          if (id === 'tanstack-start-manifest:v') {
            const dir = resolve(root, 'node_modules/.nitro/vite/services/ssr/assets')
            if (fs.existsSync(dir)) {
              const files = fs.readdirSync(dir)
              const manifestFile = files.find(f => f.startsWith('_tanstack-start-manifest_v-') && f.endsWith('.js'))
              if (manifestFile) {
                return resolve(dir, manifestFile)
              }
            }
            return '\0empty-manifest'
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
          if (id === '\0empty-manifest') {
            return `export const tsrStartManifest = () => ({ routes: { __root__: { preloads: [], scripts: [] } } })`
          }
          return null
        },
      })
    },
  },
})
