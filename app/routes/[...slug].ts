import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server'

const handler = createStartHandler(defaultStreamHandler)

export default defineEventHandler(async (event) => {
  const request = toWebRequest(event)
  const response = await handler(request)
  return sendWebResponse(event, response)
})
