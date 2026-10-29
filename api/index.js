import { api, ApiError } from '../server/api.js'

export default async function handler(request, response) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    response.statusCode = 405
    response.end(JSON.stringify({ error: 'GET 요청만 지원합니다.' }))
    return
  }
  const url = new URL(request.url, 'http://localhost')
  // Preserve the original API path across Vercel's rewrite.
  const route = url.searchParams.get('__api_path')
  url.searchParams.delete('__api_path')
  const pathname = route ? `/api/${route}` : url.pathname
  try {
    response.end(JSON.stringify(await api(pathname, url.searchParams)))
  } catch (error) {
    response.statusCode = error instanceof ApiError ? error.status : 500
    response.end(JSON.stringify({
      error: error instanceof ApiError ? error.message : '서버에서 데이터를 처리하지 못했습니다.',
      code: error instanceof ApiError ? error.code : 'SERVER_ERROR',
    }))
  }
}
