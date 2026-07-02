import { createServerFn } from '@tanstack/react-start'
import { getRouterManifest } from '@tanstack/react-start/router-manifest'
import { createRouter } from '@tanstack/react-router'
import { renderToStream } from '@tanstack/react-start/server'

const routerManifest = getRouterManifest()

export default defineEventHandler(async (event) => {
  const url = `${getHeader(event, 'x-forwarded-proto') || 'http'}://${getHeader(event, 'host')}${event.node.req.url}`
  const router = createRouter({ routeTree: routerManifest, context: {} })
  const stream = await renderToStream(url, router)
  setHeader(event, 'content-type', 'text/html')
  return stream
})
