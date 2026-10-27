import assert from 'node:assert/strict'
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
const server = spawn(process.execPath, ['server/index.js', '--production'], { env: { ...process.env, PORT: '5194' }, stdio: 'ignore', windowsHide: true })
let browser
try {
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch('http://localhost:5194/api/status')).ok) break } catch {}
    await new Promise(resolve => setTimeout(resolve, 150))
  }
  const data = await (await fetch('http://localhost:5194/api/rest-areas')).json()
  const area = data.rows.find(row => row.code === '000003')
  assert.equal(area.direction, '서울')
  const detail = await (await fetch(`http://localhost:5194/api/rest-area?id=${encodeURIComponent(area.id)}`)).json()
  assert.ok(detail.oilFacilities.length > 0)
  assert.equal(detail.sources.oilFacilities.matchedCode, '000004')
  assert.equal(detail.visitorStats.name, '죽전(서울)')
  assert.equal(detail.visitorStats.visitorYear, 2017)
  assert.equal(detail.visitorStats.trafficYear, 2024)
  const items = detail.facilityGroups.flatMap(group => group.items)
  assert.equal(items.find(item => item.id === 'nursing').status, 'present')
  assert.equal(items.find(item => item.id === 'maintenance').status, 'absent')
  assert.equal(items.find(item => item.id === 'ev').status, 'unknown')
  browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }), errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('http://localhost:5194/#directory')
  await page.getByLabel('휴게소명 검색').fill('죽전')
  await page.locator('.area-open').first().click({ timeout: 45000 })
  await page.locator('.basic-grid').waitFor({ timeout: 60000 })
  assert.match(await page.locator('.basic-grid').innerText(), /서울 방향/)
  assert.ok(!(await page.locator('.basic-grid').innerText()).includes('미검증'))
  await page.getByRole('tab', { name: '휴게소 시설', exact: true }).click()
  await page.locator('.facility-status-grid').waitFor()
  fs.mkdirSync('artifacts', { recursive: true })
  await page.locator('.detail-dialog').screenshot({ path: 'artifacts/facilities-desktop.png' })
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    assert.ok(await page.locator('.detail-dialog').evaluate(el => el.scrollWidth <= el.clientWidth + 1))
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('.detail-dialog').screenshot({ path: 'artifacts/facilities-mobile.png' })
  await page.locator('.linked-oil > summary').click()
  assert.match(await page.locator('.linked-oil').innerText(), /죽전\(서울\)주유소/)
  await page.getByRole('tab', { name: '과거 통계', exact: true }).click()
  assert.match(await page.locator('.area-stat-values').innerText(), /2017년/)
  assert.match(await page.locator('.area-stat-values').innerText(), /2024년/)
  await page.locator('.detail-dialog').screenshot({ path: 'artifacts/area-statistics-mobile.png' })
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ passed: true, direction: area.direction, oilCode: detail.sources.oilFacilities.matchedCode, historicalStats: detail.visitorStats.name, responsiveWidths: [320, 390, 768, 1440] }))
} finally { await browser?.close(); server.kill() }
