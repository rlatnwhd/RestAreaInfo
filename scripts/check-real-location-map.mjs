import {spawn} from 'node:child_process'
import {chromium} from 'playwright'
import assert from 'node:assert/strict'
const server=spawn(process.execPath,['server/index.js','--production'],{env:{...process.env,PORT:'5196'},stdio:'ignore',windowsHide:true})
let browser
try{
 for(let i=0;i<60;i++){try{if((await fetch('http://localhost:5196/api/status')).ok)break}catch{}await new Promise(r=>setTimeout(r,150))}
 const area={id:'test',name:'죽암(서울)휴게소',routeName:'경부선',routeCode:'0010',directions:['서울'],coordinates:{lat:36.4969720594601,lng:127.430864108349}}
 browser=await chromium.launch({channel:'msedge',headless:true})
 const page=await browser.newPage({viewport:{width:1200,height:1000}}),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 page.on('requestfailed',req=>console.log(JSON.stringify({failedHost:new URL(req.url()).hostname,error:req.failure()?.errorText})))
 await page.route('**/api/**',route=>{
  const url=new URL(route.request().url());if(url.hostname!=='localhost')return route.continue();const path=url.pathname
  if(path==='/api/status')return route.continue()
  let body={rows:[],count:0}
  if(['/api/rest-areas','/api/map-points'].includes(path))body={rows:[area],count:1}
  if(path==='/api/rest-area')body={area,sources:{},menus:[],brands:[],parking:null}
  return route.fulfill({json:body})
 })
 await page.goto(`${process.env.MAP_TEST_BASE||'http://localhost:5196'}/#directory`)
 await page.locator('.area-open').first().click()
 const section=page.locator('.detail-dialog .location-map-section')
 await section.getByRole('button',{name:'원래 위치',exact:true}).waitFor()
 try{await page.waitForFunction(()=>{const el=document.querySelector('.detail-dialog .location-map-actions button');return el&&!el.disabled},null,{timeout:20000})}catch(error){console.log(JSON.stringify({mapMessage:await section.locator('.map-message').innerText(),errors}));await section.screenshot({path:'artifacts/location-map-real-fixed.png'});throw error}
 const canvas=section.locator('.map-canvas')
 assert.ok(await canvas.evaluate(el=>el.getBoundingClientRect().height===300))
 await page.waitForFunction(()=>[...document.querySelectorAll('.detail-dialog .map-canvas img')].some(img=>img.complete&&img.naturalWidth>0&&/(?:daumcdn|kakaocdn)\.net/.test(img.src)),null,{timeout:20000})
 await page.waitForTimeout(1200)
 await section.screenshot({path:'artifacts/location-map-real-fixed.png'})
 for(const width of [390,320]){
  await page.setViewportSize({width,height:900})
  assert.ok(await canvas.evaluate(el=>el.getBoundingClientRect().height===260))
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
 }
 assert.deepEqual(errors,[])
 console.log('Actual Kakao SDK and loaded map images verified; desktop 300px and mobile 260px map heights passed')
}finally{await browser?.close();server.kill()}
