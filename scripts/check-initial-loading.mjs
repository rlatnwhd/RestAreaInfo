import {spawn} from 'node:child_process'
import {chromium} from 'playwright'
import assert from 'node:assert/strict'
const server=spawn(process.execPath,['server/index.js','--production'],{env:{...process.env,PORT:'5190'},stdio:'ignore',windowsHide:true})
let browser
try{
 for(let i=0;i<60;i++){try{if((await fetch('http://localhost:5190/api/status')).ok)break}catch{}await new Promise(r=>setTimeout(r,150))}
 browser=await chromium.launch({channel:'msedge',headless:true})
 const page=await browser.newPage({viewport:{width:1200,height:1000}}),errors=[]
 page.on('pageerror',error=>errors.push(error.message))
 await page.addInitScript(()=>{class Point{}window.kakao={maps:{Map:class{relayout(){}setBounds(){}setLevel(){}panTo(){}},LatLng:Point,Point,Size:Point,LatLngBounds:class{extend(){}},MarkerImage:class{},Marker:class{setMap(){}},Polyline:class{setMap(){}},CustomOverlay:class{setMap(){}},event:{addListener(){}}}}})
 const areas=[0,1].map(i=>({id:String(i),name:`휴게소${i}`,routeName:'경부선',routeCode:'0010',coordinates:null}))
 const points=areas.map((area,i)=>({id:area.id,coordinates:{lat:36+i*.1,lng:127}}))
 let releaseMenu,releasePins,mode='pending',nationalCalls=0
 const menuGate=new Promise(resolve=>releaseMenu=resolve),pinsGate=new Promise(resolve=>releasePins=resolve)
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;let body={rows:[],count:0}
  if(path==='/api/status')body={publicMapKey:'test',sources:{ex:true,places:true}}
  if(path==='/api/rest-areas')body={rows:areas,count:2}
  if(path==='/api/menus')nationalCalls++
  if(path==='/api/map-points-cached')body={rows:[points[0]],count:1,total:2}
  if(path==='/api/menu-count'||path==='/api/map-points'){
   if(mode==='pending')await(path==='/api/menu-count'?menuGate:pinsGate)
   if(mode==='error')return route.fulfill({status:503,json:{error:'연결 지연'}})
   body=path==='/api/menu-count'?{count:7259}:{rows:points,count:2,total:2}
  }
  return route.fulfill({json:body})
 })
 await page.goto('http://localhost:5190/#route')
 await page.locator('.summary-loading').waitFor()
 await page.locator('.map-points-status').waitFor()
 assert.equal(await page.locator('.summary-grid article[aria-busy=true]').count(),1)
 assert.ok((await page.locator('.map-toolbar').innerText()).includes('불러오는 중'))
 assert.ok((await page.locator('.map-points-status').innerText()).includes('위치 1곳 표시'))
 releaseMenu();await page.locator('.summary-grid').getByText('7,259',{exact:false}).waitFor()
 releasePins();await page.waitForFunction(()=>!document.querySelector('.map-points-status'))
 assert.equal(nationalCalls,0)
 assert.ok((await page.locator('.map-toolbar').innerText()).includes('위치 2곳'))
 mode='error';await page.reload()
 await page.locator('.summary-load-error').waitFor()
 await page.locator('.map-points-status.is-error').waitFor()
 assert.ok((await page.locator('.map-toolbar').innerText()).includes('확인 필요'))
 mode='success';await page.locator('.map-points-status').getByRole('button',{name:'다시 조회',exact:true}).click()
 await page.waitForFunction(()=>!document.querySelector('.map-points-status')&&!document.querySelector('.summary-load-error'))
 for(const width of [390,320]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))}
 assert.deepEqual(errors,[])
 console.log('Passed: independent loaders, cached pins during loading, count-only startup, failure and retry, mobile layout')
}finally{await browser?.close();server.kill()}
