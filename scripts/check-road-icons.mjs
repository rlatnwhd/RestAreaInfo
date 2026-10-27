import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
const server = spawn(process.execPath, ['server/index.js', '--production'], { env: { ...process.env, PORT: '5195' }, stdio: 'ignore', windowsHide: true })
let browser
try {
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch('http://localhost:5195/api/status')).ok) break } catch {}
    await new Promise(resolve => setTimeout(resolve, 150))
  }
  browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }), errors = []
  page.on('pageerror', e => errors.push(e.message))
  // A controlled SDK adapter verifies MarkerImage configuration and click
  // callbacks without relying on a production key's allowed localhost port.
  await page.addInitScript(() => {
    window.testMapMarkers = []
    class Size { constructor(width, height) { this.width = width; this.height = height } }
    class Point { constructor(x, y) { this.x = x; this.y = y } }
    class MarkerImage { constructor(src, size, options) { Object.assign(this, { src, size, options }) } }
    class Marker { constructor(options) { Object.assign(this, options); window.testMapMarkers.push(this) } setMap(map) { this.map = map } }
    window.kakao = { maps: { Map: class { relayout() {} setBounds() {} panTo() {} }, LatLng: Point, LatLngBounds: class { extend() {} }, Size, Point, MarkerImage, Marker, CustomOverlay: class { constructor(options) { Object.assign(this, options) } setMap(map) { this.map = map } }, Polyline: class { setMap() {} }, event: { addListener: (target, name, callback) => { target[name] = callback } } } }
  })
  await page.goto('http://localhost:5195/#route')
  const picker = page.locator('.highway-picker'), select = picker.getByRole('combobox')
  await picker.getByRole('radio').first().waitFor({ timeout: 60000 })
  await select.click()
  const threeDigits = picker.getByRole('option', { name: /고속국도 104호선/ }).locator('.road-badge')
  assert.ok(await threeDigits.evaluate(el => { const text = el.querySelector('span'); return parseFloat(getComputedStyle(text).fontSize) === 12 && text.scrollWidth <= el.clientWidth }))
  await picker.getByRole('option', { name: /고속국도 50호선 영동선/ }).click()
  assert.match(await select.innerText(), /50\s*영동선/)
  await select.focus(); await select.press('Home'); await select.press('Home'); await select.press('Enter')
  assert.match(await select.innerText(), /1\s*경부선/)
  await select.click(); await select.press('Escape')
  assert.equal(await select.getAttribute('aria-expanded'), 'false')
  await select.click()
  await picker.screenshot({ path: 'artifacts/road-options-desktop.png' })
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 900 })
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    assert.ok(await picker.locator('[role=listbox]').evaluate(el => el.getBoundingClientRect().right <= innerWidth))
  }
  await picker.screenshot({ path: 'artifacts/road-options-mobile.png' })
  await select.press('Escape')
  await page.waitForFunction(() => window.testMapMarkers.some(marker => marker.map), { timeout: 60000 })
  const marker = await page.evaluate(() => {
    const marker = window.testMapMarkers.find(marker => marker.map)
    return { src: marker.image.src, width: marker.image.size.width, offset: marker.image.options.offset, title: marker.title }
  })
  assert.match(marker.src, /rest-area-pin-.*\.svg$/)
  assert.equal(marker.width, 48)
  assert.deepEqual(marker.offset, { x: 24, y: 64 })
  assert.ok((await page.request.get(new URL(marker.src, page.url()).href)).ok())
  await page.evaluate(() => window.testMapMarkers.find(marker => marker.map).click())
  await page.locator('.detail-dialog').waitFor()
  assert.equal(await page.locator('#detail-title').innerText(), marker.title)
  await page.waitForFunction(() => window.testMapMarkers.some(marker => marker.map && marker.image.size.width === 56))
  await page.getByRole('button', { name: '상세정보 닫기' }).click()
  await page.goto('http://localhost:5195/#directory')
  const directory = page.getByRole('combobox', { name: '고속도로 노선 선택' })
  await directory.click()
  await page.getByRole('option', { name: /고속국도 1호선 경부선/ }).click()
  assert.match(await directory.innerText(), /1\s*경부선/)
  await directory.click()
  await page.getByRole('option', { name: '전체 고속도로', exact: true }).click()
  assert.equal(await directory.locator('.road-badge').count(), 0)
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ passed: true, checks: ['dropdown icons and numbers', 'keyboard selection and Escape', 'mobile layout', 'directory reset', 'marker image anchor and asset', 'marker click and selection size'], mapSdk: 'controlled adapter' }))
} finally { await browser?.close(); server.kill() }
