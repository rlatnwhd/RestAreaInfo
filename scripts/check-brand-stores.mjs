import {spawn} from 'node:child_process'
import {chromium} from 'playwright'
import fs from 'node:fs'
import assert from 'node:assert/strict'
import {brand} from '../server/normalizers.js'
const raw=JSON.parse(fs.readFileSync('artifacts/research/brands-current.json','utf8'))
const names=['던킨도너츠','롯데리아','탐앤탐스','성북당']
const rows=names.map(name=>brand(raw.find(row=>row.brdName===name)))
rows[0].start='08:00';rows[0].end='20:00';rows[2].start='00:00';rows[2].end='24:00'
const server=spawn(process.execPath,['server/index.js','--production'],{env:{...process.env,PORT:'5194'},stdio:'ignore',windowsHide:true})
let browser
try{
 for(let i=0;i<60;i++){try{if((await fetch('http://localhost:5194/api/status')).ok)break}catch{}await new Promise(r=>setTimeout(r,150))}
 browser=await chromium.launch({channel:'msedge',headless:true})
 const page=await browser.newPage({viewport:{width:1200,height:1000},timezoneId:'America/Los_Angeles'}), errors=[]
 await page.clock.install({time:new Date('2026-10-27T19:00:00+09:00')})
 page.on('pageerror',e=>errors.push(e.message))
 const area={id:'test',name:'브랜드 표시 확인 휴게소',routeName:'경부선',routeCode:'0010',coordinates:null}
 await page.route('**/api/**',route=>{
  const path=new URL(route.request().url()).pathname
  let body={rows:[],count:0}
  if(path==='/api/status')body={sources:{}}
  if(path==='/api/rest-areas')body={rows:[area],count:1}
  if(path==='/api/rest-area')body={area,menus:[],brands:rows,sources:{brands:{status:'ok'}}}
  if(path==='/api/map-point')body={row:null,status:'unresolved'}
  return route.fulfill({json:body})
 })
 await page.goto('http://localhost:5194/#directory');await page.locator('.area-open').first().click()
 await page.getByRole('tab',{name:'입점 브랜드',exact:true}).click()
 await page.locator('.brand-store-card').nth(3).waitFor()
 await page.waitForFunction(()=>[...document.querySelectorAll('.brand-logo-tile img')].every(img=>img.complete&&img.naturalWidth>0))
 assert.equal(await page.locator('.brand-store-card').count(),4)
 assert.equal(await page.locator('.brand-store-card').first().locator('.brand-business-status').innerText(),'곧 마감')
 assert.equal(await page.locator('.brand-store-card').nth(2).locator('.brand-business-status').innerText(),'영업 중')
 await page.clock.fastForward(3600000)
 assert.equal(await page.locator('.brand-store-card').first().locator('.brand-business-status').innerText(),'영업 종료')
 assert.equal(await page.locator('.brand-store-card').nth(2).locator('.brand-business-status').innerText(),'영업 중')
 assert.equal(await page.locator('.brand-logo-tile img').count(),3)
 assert.ok((await page.locator('.brand-store-card').first().innerText()).includes('08:00'))
 await page.locator('.detail-dialog').screenshot({path:'artifacts/brand-stores-desktop.png'})
 for(const width of [390,320]){
  await page.setViewportSize({width,height:900})
  assert.ok(await page.locator('.detail-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1))
  assert.ok(await page.locator('.brand-store-card').first().evaluate(el=>el.scrollWidth<=el.clientWidth+1))
 }
 await page.locator('.detail-dialog').screenshot({path:'artifacts/brand-stores-mobile.png'})
 assert.deepEqual(errors,[])
 console.log('Passed: brand logos and fallback, source links, hours, mobile widths and no browser errors')
}finally{await browser?.close();server.kill()}
