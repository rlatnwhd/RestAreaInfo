import assert from 'node:assert/strict'
import { settings } from '../server/api.js'
const root=process.env.CHECK_URL||'http://localhost:5173'
const env=settings(),secrets=[env.EX_API_KEY,env.ODCLOUD_API_KEY,env.ROUTE_API_KEY,env.KAKAO_REST_API_KEY].filter(Boolean)
for(const path of ['/','/api/status','/api/rest-areas','/api/statistics','/api/menus','/api/oil-facilities']) {
  const response=await fetch(root+path)
  assert.ok(response.ok,`${path}: HTTP ${response.status}`)
  const content=await response.text()
  for(const key of secrets) assert.ok(!content.includes(key),`${path}: private credential exposed`)
  console.log(`${path}: HTTP ${response.status}`)
}
