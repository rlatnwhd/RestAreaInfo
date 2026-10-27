import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
const server = spawn(process.execPath, ['server/index.js', '--production'], { env: { ...process.env, PORT: '5193' }, stdio: 'ignore', windowsHide: true })
let browser
try {
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch('http://localhost:5193/api/status')).ok) break } catch {}
    await new Promise(resolve => setTimeout(resolve, 150))
  }
  const data = await (await fetch('http://localhost:5193/api/rest-areas')).json()
  assert.equal(data.baseCount, 203)
  assert.ok(data.rows.length >= data.baseCount)
  assert.equal(data.rows.filter(row => row.operation?.status === 'verified').length, 172)
  const area = data.rows.find(row => row.code === '000292')
  const detail = await (await fetch(`http://localhost:5193/api/rest-area?id=${encodeURIComponent(area.id)}`)).json()
  assert.equal(detail.foodHours[0].hours, '24시간')
  browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto('http://localhost:5193/#directory')
  await page.getByLabel('휴게소명 검색').fill('덕평')
  await page.locator('.area-open').first().click({ timeout: 45000 })
  await page.locator('.basic-grid').waitFor({ timeout: 45000 })
  assert.match(await page.locator('.basic-grid').innerText(), /운영형태/)
  await page.getByRole('tab', { name: '음식 메뉴' }).click()
  await page.locator('.food-hours').waitFor()
  assert.match(await page.locator('.food-hours').innerText(), /일부 품목 제외/)
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    assert.ok(await page.locator('.detail-dialog').evaluate(el => el.scrollWidth <= el.clientWidth + 1))
  }
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ passed: true, total: data.rows.length, verified: 172, responsiveWidths: [320, 390, 768, 1440] }))
} finally { await browser?.close(); server.kill() }
