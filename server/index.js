import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { api, ApiError, settings } from './api.js'

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(workspace)
const production = process.argv.includes('--production')
const port = Number(settings().PORT || 5173)
let vite = null
const windows = new Map()
const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || '/', 'http://localhost')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  if (url.pathname.startsWith('/api/')) {
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
    response.setHeader('Cache-Control', 'no-store')
    if (request.method !== 'GET') { response.writeHead(405); response.end(JSON.stringify({ error: 'GET 요청만 지원합니다.' })); return }
    const client = request.socket.remoteAddress, now = Date.now()
    if (windows.size > 100) windows.clear()
    const window = windows.get(client)
    if (!window || now - window.start > 60000) windows.set(client, { start: now, count: 1 })
    else if (++window.count > 120) { response.writeHead(429); response.end(JSON.stringify({ error: '요청이 많습니다. 잠시 후 다시 시도해 주세요.' })); return }
    try { response.end(JSON.stringify(await api(url.pathname, url.searchParams))) }
    catch (error) { response.writeHead(error instanceof ApiError ? error.status : 500); response.end(JSON.stringify({ error: error instanceof ApiError ? error.message : '서버에서 데이터를 처리하지 못했습니다.', code: error instanceof ApiError ? error.code : 'SERVER_ERROR' })) }
    return
  }
  if (vite) { vite.middlewares(request, response); return }
  try {
    const root = path.join(workspace, 'dist')
    let target = path.resolve(root, '.' + decodeURIComponent(url.pathname))
    if (!target.startsWith(root + path.sep) && target !== root) { response.writeHead(403); response.end(); return }
    if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) target = path.join(root, 'index.html')
    const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }
    response.setHeader('Content-Type', types[path.extname(target)] || 'application/octet-stream')
    fs.createReadStream(target).pipe(response)
  } catch { response.writeHead(404); response.end('Not found') }
})
if (!production) vite = await (await import('vite')).createServer({ server: { middlewareMode: true, hmr: { server } }, appType: 'spa' })
server.listen(port, '127.0.0.1', () => console.log(`휴게길 로컬 서버: http://localhost:${port}`))
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `${port} 포트를 사용 중입니다. .env의 PORT를 변경해 주세요.` : '서버 시작에 실패했습니다.'); process.exitCode = 1; vite?.close() })
async function close() { await vite?.close(); server.close(); }
process.on('SIGINT', close)
process.on('SIGTERM', close)
