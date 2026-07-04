import { 
  defineEventHandler, 
  sendWebResponse, 
  getRequestProtocol, 
  getRequestHost, 
  getRequestPath, 
  getMethod, 
  getRequestHeaders, 
  getRequestWebStream 
} from 'h3'
import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server'

const handler = createStartHandler(defaultStreamHandler)

function toWebRequest(event: any) {
  const method = getMethod(event);
  const url = `${getRequestProtocol(event)}://${getRequestHost(event)}${getRequestPath(event)}`;
  
  const headers = new Headers();
  const rawHeaders = getRequestHeaders(event);
  for (const [key, value] of Object.entries(rawHeaders)) {
    if (Array.isArray(value)) {
      for (const val of value) {
        headers.append(key, val);
      }
    } else if (value) {
      headers.set(key, value);
    }
  }

  const body = (method === 'GET' || method === 'HEAD') 
    ? undefined 
    : getRequestWebStream(event);

  return new Request(url, {
    method,
    headers,
    body,
    duplex: 'half'
  });
}

import { createError } from 'h3'

export default defineEventHandler(async (event) => {
  const request = toWebRequest(event)
  try {
    const response = await handler(request)
    return response
  } catch (err: any) {
    console.error("🔥 Error in TanStack Start handler:", err)
    console.error("🔥 Error stack:", err?.stack)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error in Handler',
      message: err?.message || String(err),
      data: {
        stack: err?.stack
      }
    })
  }
})



