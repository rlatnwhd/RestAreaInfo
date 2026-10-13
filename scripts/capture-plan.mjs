import { chromium } from 'playwright'
const browser = await chromium.launch({ channel:'msedge', headless:true })
try {
  const page = await browser.newPage({ viewport:{width:1440,height:1570} })
  await page.goto('http://localhost:5173', {waitUntil:'domcontentloaded',timeout:15000})
  await page.locator('.area-card').first().waitFor({timeout:45000})
  await page.waitForSelector('.map-toolbar .success',{timeout:30000})
  await page.waitForTimeout(2500)
  await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0)})
  await page.screenshot({path:'artifacts/plan-home.png'})
  console.log('PLAN_SCREENSHOT_READY')
} finally {await browser.close()}
