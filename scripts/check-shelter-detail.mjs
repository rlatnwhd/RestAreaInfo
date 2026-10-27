import {spawn} from 'node:child_process'
import {chromium} from 'playwright'
import assert from 'node:assert/strict'
const server=spawn(process.execPath,['server/index.js','--production'],{env:{...process.env,PORT:'5193'},stdio:'ignore',windowsHide:true})
let browser
try{
 for(let i=0;i<60;i++){try{if((await fetch('http://localhost:5193/api/status')).ok)break}catch{}await new Promise(r=>setTimeout(r,150))}
 browser=await chromium.launch({channel:'msedge',headless:true})
 const page=await browser.newPage({viewport:{width:1200,height:1000}}),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.addInitScript(()=>{
 class Point{constructor(a,b){this.a=a;this.b=b}}
 window.kakao={maps:{Map:class{relayout(){}setBounds(){}setLevel(){}panTo(){}},LatLng:Point,Point,Size:Point,LatLngBounds:class{extend(){}},MarkerImage:class{},Marker:class{setMap(){}},CustomOverlay:class{setMap(){}},event:{addListener(){}}}}
 })
 const shelter={id:'1',name:'김포',routeName:'수도권제1순환선',direction:'일산',kilometer:76,installedYear:2015}
 await page.route('**/api/**',route=>{
 const path=new URL(route.request().url()).pathname
 let body={rows:[],count:0}
 if(path==='/api/status')body={publicMapKey:'test',sources:{}}
 if(path==='/api/shelters')body={rows:[shelter],count:1}
 if(path==='/api/shelter-point')body={row:{id:'1',name:'김포졸음쉼터 일산방향',coordinates:{lat:37.5931,lng:126.7692}},status:'resolved'}
 return route.fulfill({json:body})
 })
 await page.goto('http://localhost:5193/#shelters')
 assert.equal(await page.locator('.main-nav a[href="#facilities"]').count(),0)
 await page.getByRole('button',{name:'김포 일산 졸음쉼터 상세정보',exact:true}).click()
 const dialog=page.locator('.shelter-detail')
 await dialog.getByRole('heading',{name:'김포 졸음쉼터'}).waitFor()
 await dialog.locator('.location-map-actions button:enabled').first().waitFor()
 assert.ok((await dialog.innerText()).includes('76 km'))
 assert.ok(await dialog.locator('.map-canvas').evaluate(el=>el.clientHeight===300))
 assert.ok((await dialog.getByRole('link',{name:'카카오맵에서 보기'}).getAttribute('href')).includes('37.5931,126.7692'))
 for(const width of [390,320]){
  await page.setViewportSize({width,height:900})
  assert.ok(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1))
 }
 await page.getByRole('button',{name:'졸음쉼터 상세정보 닫기',exact:true}).click()
 assert.equal(await page.locator('.shelter-detail').count(),0)
 assert.deepEqual(errors,[])
 console.log('Passed: fuel tab removed; shelter card, details, directional map, map link, closing and mobile bounds')
}finally{await browser?.close();server.kill()}

