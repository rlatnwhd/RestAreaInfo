import assert from 'node:assert/strict'
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
import { roadOptions } from '../src/utils/roadRoutes.js'
import { directionGroups, matchesDirection } from '../src/utils/directionGroups.js'
const server = spawn(process.execPath, ['server/index.js', '--production'], { env: { ...process.env, PORT: '5198' }, stdio: 'ignore', windowsHide: true })
let browser
try {
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch('http://localhost:5198/api/status')).ok) break } catch {}
    await new Promise(resolve => setTimeout(resolve, 150))
  }
  const data = await (await fetch('http://localhost:5198/api/rest-areas')).json()
  browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }), errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.route('**/api/status', route => route.fulfill({ json: { sources: { ex: true, places: false }, publicMapKey: '' } }))
  await page.goto('http://localhost:5198/#highways')
  await page.locator('.highway-route-card').first().waitFor({ timeout: 45000 })
  assert.equal(await page.locator('.highway-route-card').count(), roadOptions(data.rows).length)
  const groups = directionGroups(data.rows, '영동선')
  const card = page.locator('.highway-route-card').filter({ has: page.getByRole('heading', { name: '영동고속도로', exact: true }) })
  assert.equal(await card.getByRole('button').count(), groups.length)
  fs.mkdirSync('artifacts', { recursive: true })
  await page.screenshot({ path: 'artifacts/highway-routes-desktop.png' })
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    if (width === 390) await page.screenshot({ path: 'artifacts/highway-routes-mobile.png' })
  }
  const direction = groups.find(group => group.direction === '강릉')
  await card.getByRole('button', { name: new RegExp(`강릉 방향 휴게소 ${direction.count}곳`) }).click()
  await page.waitForURL('**/#directory')
  assert.match(await page.locator('#directory-title').innerText(), /영동선 · 강릉 방향/)
  const expected = data.rows.filter(row => row.routeName === '영동선' && matchesDirection(row, '강릉'))
  assert.match(await page.locator('#directory-title').innerText(), new RegExp(String(expected.length)))
  const select = page.getByRole('combobox', { name: '고속도로 노선 선택' })
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    const parent = await page.locator('.directory-filters').boundingBox(), box = await select.boundingBox()
    assert.ok(box.x + box.width <= parent.x + parent.width + 1)
    await select.click()
    const list = await page.getByRole('listbox', { name: '고속도로 노선 선택' }).boundingBox()
    assert.ok(list.x + list.width <= parent.x + parent.width + 1)
    await select.press('Escape')
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  }
  const preview = await browser.newPage({ viewport: { width: 180, height: 160 } })
  const svg = fs.readFileSync('icons/rest-area-pin.svg', 'utf8')
  assert.ok(svg.includes(fs.readFileSync('icons/food.png').toString('base64')))
  await preview.setContent(`<body style="margin:0;background:#edf2f7;display:grid;place-items:center;height:100vh"><img width="72" height="96" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" /></body>`)
  await preview.locator('img').evaluate(img => img.decode())
  await preview.screenshot({ path: 'artifacts/food-pin-preview.png' })
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ passed: true, routeCards: roadOptions(data.rows).length, directionCount: expected.length, checks: ['food icon pin', 'responsive route cards', 'direction navigation', 'select and popup stay inside filter width at 320/390/768/1024/1440'] }))
} finally { await browser?.close(); server.kill() }
