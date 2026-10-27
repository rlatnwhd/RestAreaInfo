import assert from 'node:assert/strict'
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
import { roadOptions } from '../src/utils/roadRoutes.js'
const server = spawn(process.execPath, ['server/index.js', '--production'], { env: { ...process.env, PORT: '5196' }, stdio: 'ignore', windowsHide: true })
let browser
try {
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch('http://localhost:5196/api/status')).ok) break } catch {}
    await new Promise(resolve => setTimeout(resolve, 150))
  }
  const data = await (await fetch('http://localhost:5196/api/rest-areas')).json()
  assert.equal(data.rows.length, data.count)
  assert.equal(new Set(data.rows.map(row => row.code)).size, data.count)
  const roads = roadOptions(data.rows)
  for (const name of ['광주대구선', '밀양울산선', '세종포천선', '부산외곽순환선']) assert.ok(roads.some(road => road.name === name))
  const area = data.rows.find(row => row.code === '000605')
  const detail = await (await fetch(`http://localhost:5196/api/rest-area?id=${encodeURIComponent(area.id)}`)).json()
  assert.equal(detail.area.name, '처인휴게소')
  assert.ok(detail.menus.length || detail.brands.length || detail.facilities.length)
  browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await page.route('**/api/status', route => route.fulfill({ json: { sources: { ex: true, places: false }, publicMapKey: '' } }))
  await page.goto('http://localhost:5196/#directory')
  const select = page.getByRole('combobox', { name: '고속도로 노선 선택' })
  await select.click()
  await page.getByRole('option', { name: /고속국도 29호선 세종포천선/ }).click({ timeout: 45000 })
  await page.locator('.area-open').first().click()
  await page.locator('.basic-grid').waitFor({ timeout: 45000 })
  assert.match(await page.locator('.basic-grid').innerText(), /세종포천선/)
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  const report = { checkedAt: new Date().toISOString(), baseCount: data.baseCount, count: data.count, roadCount: roads.length, roads, testedSupplement: detail.area.name, sources: data.catalogSources }
  fs.writeFileSync('docs/catalog-verification.json', JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify({ passed: true, baseCount: data.baseCount, count: data.count, roadCount: roads.length, detail: detail.area.name }))
} finally { await browser?.close(); server.kill() }
