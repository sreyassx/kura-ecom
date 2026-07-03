import { defineEventHandler, sendWebResponse } from 'h3'
import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server'

const handler = createStartHandler(defaultStreamHandler)

export default defineEventHandler(async (event) => {
  const response = await handler(event.req)
  return sendWebResponse(event, response)
})
