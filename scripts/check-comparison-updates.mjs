import assert from 'node:assert/strict'
import fs from 'node:fs'
import {spawn} from 'node:child_process'
import {chromium} from 'playwright'
const server=spawn(process.execPath,['server/index.js','--production'],{env:{...process.env,PORT:'5197'},stdio:'ignore',windowsHide:true})
let browser
try{
 for(let i=0;i<60;i++){try{if((await fetch('http://localhost:5197/api/status')).ok)break}catch{}await new Promise(r=>setTimeout(r,150))}
 const areas=[0,1,2].map(i=>({id:String(i),name:['김해금관가야휴게소','비교휴게소(부산)','비교휴게소(서울)'][i],routeName:'부산외곽순환선',routeCode:'6000',bidirectional:i===0,directions:i===0?['양방향']:['부산'],coordinates:{lat:35.2+i*.1,lng:128.9+i*.1}}))
 areas[2].coordinates=null
 const details=areas.map((area,i)=>({area,sources:{},menus:[{name:'돈까스',price:[10000,8000,9000][i]},{name:'고가 메뉴'+i,price:30000-i*1000}],parking:{total:[100,200,150][i],small:[60,120,90][i],large:[30,60,45][i],accessible:[10,20,15][i],asOf:'2026-07-31'},visitorStats:{visitors:[1000,2000,1500][i],visitorYear:2017,traffic:[2000,3000,2500][i],trafficYear:2024},brands:[],facilities:[],oilFacilities:[]}))
 browser=await chromium.launch({channel:'msedge',headless:true})
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.addInitScript(()=>{
  window.mapState={bounds:0,pan:0,centre:'initial',level:8};window.markers=[];window.overlays=[];window.hasRoadview=true;window.pano=null
  class Point{constructor(lat,lng){this.lat=lat;this.lng=lng}}
  window.kakao={maps:{Map:class{relayout(){}setBounds(){window.mapState.bounds++;window.mapState.centre='bounds'}panTo(p){window.mapState.pan++;window.mapState.centre=p}},LatLng:Point,Point,Size:Point,LatLngBounds:class{extend(){}},MarkerImage:class{},Marker:class{constructor(options){Object.assign(this,options);window.markers.push(this)}setMap(map){this.map=map}},Roadview:class{setPanoId(id){window.pano=id}},RoadviewClient:class{getNearestPanoId(point,radius,callback){callback(window.hasRoadview?123:null)}},CustomOverlay:class{constructor(options){Object.assign(this,options);window.overlays.push(this)}setMap(map){this.map=map}},Polyline:class{setMap(){}},event:{addListener:(target,name,fn)=>target[name]=fn}}}
 })
 await page.route('**/api/**',route=>{
  const url=new URL(route.request().url());let body={rows:[],count:0}
  if(url.pathname==='/api/status')body={publicMapKey:'test',sources:{ex:true,places:true}}
  if(url.pathname==='/api/rest-areas'||url.pathname==='/api/map-points')body={rows:areas,count:3}
  if(url.pathname==='/api/map-point')body={row:{id:'2',coordinates:{lat:35.4,lng:129.1},coordinateSource:'test geocoding'},status:'resolved'}
  if(url.pathname==='/api/rest-area')body=details[Number(url.searchParams.get('id'))]
  return route.fulfill({json:body})
 })
 await page.goto('http://localhost:5197/#route')
 await page.waitForFunction(()=>window.markers.some(m=>m.map))
 await page.evaluate(()=>window.markers.find(m=>m.map).click())
 await page.locator('.detail-dialog').waitFor()
 await page.locator('.detail-dialog .location-map-section .location-map-actions button:enabled').first().waitFor()
 await page.waitForFunction(()=>window.overlays.some(item=>item.map&&item.content.textContent.includes('김해금관가야')))
 await page.waitForFunction(()=>window.mapState.pan>0)
 const detailMap=page.locator('.detail-dialog .location-map-section')
 assert.ok(await detailMap.locator('.map-canvas').evaluate(el=>el.getBoundingClientRect().height>=260))
 assert.ok(await detailMap.locator('.location-map-frame').evaluate(el=>el.getBoundingClientRect().height>=310))
 assert.equal(await detailMap.locator('.map-toolbar,.map-legend').count(),0)
 assert.ok(await page.evaluate(()=>window.overlays.filter(item=>item.map).every(item=>!/^\d+\./.test(item.content.textContent))))
 assert.match(await detailMap.getByRole('link',{name:'카카오맵에서 보기'}).getAttribute('href'),/https:\/\/map.kakao.com\/link\/map\//)
 await detailMap.getByRole('button',{name:'거리뷰',exact:true}).click()
 await page.waitForFunction(()=>window.pano===123)
 await detailMap.getByRole('button',{name:'지도 보기',exact:true}).click()
 await page.evaluate(()=>window.hasRoadview=false)
 await detailMap.getByRole('button',{name:'거리뷰',exact:true}).click()
 await detailMap.getByText('이 위치 주변에는 제공되는 거리뷰가 없습니다.',{exact:true}).waitFor()
 await detailMap.getByRole('button',{name:'원래 위치',exact:true}).click()
 assert.equal(await detailMap.locator('.location-roadview').count(),0)
 await page.evaluate(()=>window.hasRoadview=true)

 await page.evaluate(()=>{window.mapState.centre='user-panned-position';window.mapState.level=5})
 const before=await page.evaluate(()=>({...window.mapState}))
 await page.getByRole('button',{name:'상세정보 닫기',exact:true}).click()
 assert.deepEqual(await page.evaluate(()=>({...window.mapState})),before)
 const badge=page.locator('.area-card .both-direction-badge').first()
 assert.ok(await badge.evaluate(el=>getComputedStyle(el).whiteSpace==='nowrap'&&parseFloat(getComputedStyle(el).fontSize)===10))
 for(const checkbox of await page.locator('.compare-check input').all())await checkbox.check()
 await page.getByRole('button',{name:'선택한 휴게소 비교',exact:true}).click()
 await page.locator('.common-menu-items').first().waitFor()
 await page.locator('.compare-dialog .location-map-section .location-map-actions button:enabled').first().waitFor()
 await page.locator('.compare-dialog .location-map-places button').nth(2).waitFor()
 assert.equal(await page.locator('.compare-dialog .location-map-places button').count(),3)
 const initialPan=await page.evaluate(()=>window.mapState.pan)
 await page.locator('.compare-dialog .location-map-places button').nth(1).click()
 await page.waitForFunction(value=>window.mapState.pan>value,initialPan)
 assert.equal(await page.locator('.common-menu-items .is-winner').count(),1)
 assert.ok((await page.locator('.common-menu-items .is-winner').innerText()).includes('8,000원'))
 const parking=page.locator('.comparison-table tr').filter({has:page.getByRole('rowheader',{name:'주차장',exact:true})})
 assert.equal(await parking.locator('td').nth(1).locator('.is-winner').count(),4)
 const stats=page.locator('.comparison-table tr').filter({has:page.getByRole('rowheader',{name:'과거 통계',exact:true})})
 assert.equal(await stats.locator('td').nth(1).locator('.is-winner').count(),2)
 fs.mkdirSync('artifacts',{recursive:true});await page.locator('.compare-dialog').screenshot({path:'artifacts/comparison-highlights.png'})
 await page.locator('.compare-dialog .dialog-content').evaluate(el=>el.scrollTop=el.scrollHeight)
 await page.locator('.compare-dialog').screenshot({path:'artifacts/comparison-parking-refined.png'})
 assert.equal(await parking.locator('.comparison-award').count(),0)
 await page.getByRole('button',{name:'비교 화면 닫기',exact:true}).click()
 for(const width of [390,320]){
  await page.setViewportSize({width,height:900})
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  assert.ok(await badge.evaluate(el=>el.getBoundingClientRect().right<=innerWidth))
 }
 await page.getByRole('button',{name:'전체 삭제',exact:true}).click()
 assert.equal(await page.locator('.compare-dock').count(),0)
 assert.equal(await page.locator('.compare-check input:checked').count(),0)
 assert.deepEqual(errors,[])
 console.log('Passed: map viewport preserved, bidirectional badge layout, common menu minimum, parking/statistic maximum, clear all, mobile bounds')
}finally{await browser?.close();server.kill()}
