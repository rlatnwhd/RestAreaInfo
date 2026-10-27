import assert from 'node:assert/strict'
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
const server = spawn(process.execPath, ['server/index.js', '--production'], { env: { ...process.env, PORT: '5197' }, stdio: 'ignore', windowsHide: true })
let browser
try {
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch('http://localhost:5197/api/status')).ok) break } catch {}
    await new Promise(resolve => setTimeout(resolve, 150))
  }
  const data = await (await fetch('http://localhost:5197/api/rest-areas')).json()
  const shared = data.rows.filter(row => row.bidirectional)
  assert.equal(shared.length, 14)
  for (const row of shared) { assert.equal(row.direction, '양방향'); assert.equal(row.bidirectionalEvidence.asOf, '2026-09-17') }
  browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } }), errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.route('**/api/status', route => route.fulfill({ json: { sources: { ex: true, places: false }, publicMapKey: '' } }))
  await page.goto('http://localhost:5197/#directory')
  await page.getByLabel('휴게소명 검색').fill('덕평')
  const select = page.getByRole('combobox', { name: '고속도로 노선 선택' })
  await select.click()
  await page.getByRole('option', { name: /고속국도 50호선 영동선/ }).click({ timeout: 45000 })
  for (const direction of ['인천', '강릉', '양방향']) {
    await page.getByRole('button', { name: new RegExp(`^${direction}( 방향)? `) }).click()
    assert.equal(await page.locator('.area-open').count(), 1)
    assert.equal(await page.locator('.both-direction-badge').innerText(), '양방향')
  }
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 900 })
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  }
  await page.locator('.area-open').click()
  await page.locator('.basic-grid').waitFor({ timeout: 45000 })
  assert.match(await page.locator('.basic-grid').innerText(), /공식 양방향 · 2026-09-17 기준/)
  assert.deepEqual(errors, [])
  fs.writeFileSync('docs/bidirectional-verification.json', JSON.stringify({ checkedAt: new Date().toISOString(), total: data.count, count: shared.length, rows: shared.map(row => ({ code: row.code, name: row.name, routeName: row.routeName, evidence: row.bidirectionalEvidence })) }, null, 2)+'\n')
  console.log(JSON.stringify({ passed: true, count: shared.length, names: shared.map(row => row.name), checks: ['both-direction badge', 'included in both direction filters', 'shared-only filter', 'source date in details', '320/390/768 layout'] }))
} finally { await browser?.close(); server.kill() }
