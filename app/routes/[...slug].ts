import { getRouter } from '../../src/router'
import { renderToStream } from '@tanstack/react-start/server'

export default defineEventHandler(async (event) => {
  const url = `${getHeader(event, 'x-forwarded-proto') || 'http'}://${getHeader(event, 'host')}${event.node.req.url}`
  try {
    const router = getRouter()
    const markup = await renderToStream({ url, router })
    return markup
  } catch (err) {
    console.error('SSR Error:', err)
    setResponseStatus(event, 500)
    return 'Internal Server Error'
  }
})
