import assert from 'node:assert/strict'
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

// A separate port keeps the user's development server untouched.
const server=spawn(process.execPath,['server/index.js','--production'],{env:{...process.env,PORT:'5191'},stdio:'ignore',windowsHide:true})
let browser
try {
  let ready=false
  for(let i=0;i<80;i++){
    try {const response=await fetch('http://localhost:5191/api/status');if(response.ok){ready=true;break}}catch{}
    await new Promise(resolve=>setTimeout(resolve,150))
  }
  assert.ok(ready,'Isolated server did not start')
  const response=await fetch('http://localhost:5191/api/shelters'),body=await response.json()
  assert.equal(response.status,200)
  assert.equal(body.count,body.rows.length)
  assert.equal(body.datasetDate,'2026-08-01')
  assert.ok(body.count>0)
  const parking=await(await fetch('http://localhost:5191/api/parking')).json()
  assert.equal(parking.mode,'api')
  assert.equal(parking.count,215)
  browser=await chromium.launch({channel:'msedge',headless:true})
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto('http://localhost:5191/#shelters')
  await page.locator('.shelter-card').first().waitFor({timeout:45000})
  await page.getByRole('combobox',{name:'졸음쉼터 노선',exact:true}).click()
  await page.getByRole('option',{name:/경부선/}).click()
  assert.ok((await page.locator('.shelter-card-top').allTextContents()).every(text=>text.includes('경부선')))
  assert.equal(await page.locator('.shelter-card-top .small-badge .direction-highway-icon').count(),await page.locator('.shelter-card').count())
  const directionSelect=page.getByRole('combobox',{name:'졸음쉼터 방향',exact:true})
  assert.equal(await directionSelect.locator('.direction-highway-icon').count(),0)
  assert.equal(await page.getByRole('combobox',{name:'졸음쉼터 노선',exact:true}).locator('.road-badge').count(),1)
  await directionSelect.click()
  const direction=await page.getByRole('option').nth(1).innerText()
  await page.getByRole('option').nth(1).click()
  assert.ok((await page.locator('.shelter-card-top .small-badge').allTextContents()).every(text=>text===direction))
  await page.getByLabel('졸음쉼터 검색',{exact:true}).fill('존재하지않는쉼터-test')
  await page.getByRole('heading',{name:'검색 결과가 없습니다'}).waitFor()
  await page.getByLabel('졸음쉼터 검색',{exact:true}).fill('')
  fs.mkdirSync('artifacts',{recursive:true})
  await page.screenshot({path:'artifacts/shelters-desktop.png',fullPage:true})
  for(const width of [768,390,320]) {
    await page.setViewportSize({width,height:900})
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`Shelters overflow at ${width}`)
    if(width===390)await page.screenshot({path:'artifacts/shelters-mobile.png',fullPage:true})
  }
  await page.goto('http://localhost:5191/#route')
  await page.locator('.hero').waitFor()
  assert.equal(await page.locator('.highway-art,.project-banner').count(),0)
  assert.ok(!/대학|과제|프로젝트|공식 정부/.test(await page.locator('body').innerText()))
  assert.ok(await page.locator('.hero').evaluate(element=>element.getBoundingClientRect().height<230))
  await page.setViewportSize({width:1440,height:1100})
  await page.screenshot({path:'artifacts/home-clean.png',fullPage:true})
  assert.equal(errors.length,0)
  console.log(JSON.stringify({passed:true,count:body.count,checked:['live shelter API','route and direction filters','empty search','320/390/768 responsive','illustration removed','project copy removed','compact hero']}))
}finally{
  await browser?.close()
  server.kill()
}
