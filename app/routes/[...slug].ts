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

export default defineEventHandler(async (event) => {
  const request = toWebRequest(event)
  const response = await handler(request)
  return sendWebResponse(event, response)
})

