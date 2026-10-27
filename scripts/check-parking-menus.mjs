import assert from 'node:assert/strict'
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
const server = spawn(process.execPath, ['server/index.js', '--production'], { env: { ...process.env, PORT: '5199' }, stdio: 'ignore', windowsHide: true })
let browser
try {
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch('http://localhost:5199/api/status')).ok) break } catch {}
    await new Promise(resolve => setTimeout(resolve, 150))
  }
  const data = await (await fetch('http://localhost:5199/api/rest-areas')).json()
  const area = data.rows.find(row => row.code === '000003')
  const detail = await (await fetch(`http://localhost:5199/api/rest-area?id=${encodeURIComponent(area.id)}`)).json()
  assert.equal(detail.parking.total, 223)
  assert.equal(detail.parking.asOf, '2026-07-31')
  assert.equal(detail.parking.mode, 'api')
  browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } }), errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/api/status', route => route.fulfill({ json: { sources: { ex: true, places: false }, publicMapKey: '' } }))
  // Exercise the global filter with the same live menu schema, without making
  // this UI check depend on collecting every upstream national menu page.
  await page.route('**/api/menus', route => route.fulfill({ json: { rows: detail.menus, count: detail.menus.length, fetchedAt: new Date().toISOString() } }))
  await page.goto('http://localhost:5199/#directory')
  await page.getByLabel('휴게소명 검색').fill('죽전')
  await page.locator('.area-open').first().click({ timeout: 45000 })
  await page.locator('.parking-info').waitFor({ timeout: 45000 })
  assert.match(await page.locator('.parking-info').innerText(), /223면/)
  assert.ok(!(await page.locator('.basic-grid dt').allTextContents()).includes('위치'))
  await page.getByRole('tab', { name: '음식 메뉴', exact: true }).click()
  assert.equal(await page.getByText(/입점 매장 운영시간/).count(), 0)
  assert.ok(await page.locator('.detail-items article').count() > 0)
  fs.mkdirSync('artifacts', { recursive: true })
  await page.locator('.detail-dialog').screenshot({ path: 'artifacts/menu-categories-mobile.png' })
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    assert.ok(await page.locator('.detail-dialog').evaluate(el => el.scrollWidth <= el.clientWidth + 1))
  }
  await page.getByRole('button', { name: '상세정보 닫기' }).click()
  await page.getByLabel('휴게소명 검색').fill('')
  await page.locator('.compare-check input').nth(0).check()
  await page.locator('.compare-check input').nth(1).check()
  await page.getByRole('button', { name: /선택한 휴게소 비교/ }).click()
  const menuRow = page.locator('.comparison-table tr').filter({ has: page.getByRole('rowheader', { name: '메뉴·가격', exact: true }) })
  await menuRow.locator('.comparison-items').first().waitFor({ timeout: 45000 })
  for (const cell of await menuRow.locator('td').all()) {
    const prices = await cell.locator('.comparison-items:not(.common-menu-items) strong').allTextContents()
    let previous = Infinity, unknown = false
    for (const price of prices) {
      if (price === '가격 정보 없음') { unknown = true; continue }
      assert.equal(unknown, false)
      const value = Number(price.replace(/[^\d]/g, ''))
      assert.ok(value <= previous); previous = value
    }
  }
  await page.getByRole('button', { name: '비교 화면 닫기' }).click()
  await page.goto('http://localhost:5199/#menus')
  try { await page.locator('.responsive-table tbody tr').first().waitFor({ timeout: 15000 }) }
  catch (error) { console.log(JSON.stringify({ errors, url: page.url(), content: (await page.locator('main').innerText()).slice(0,3000) })); throw error }
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ passed: true, parking: detail.parking.total, checks: ['parking source and date', 'coordinates removed', 'duplicate store hours removed', 'unclassified original menu list', 'comparison descending prices', '320/390/768/1440 layout'] }))
} finally { await browser?.close(); server.kill() }
