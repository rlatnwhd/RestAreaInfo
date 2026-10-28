import {spawn} from 'node:child_process'
import {chromium} from 'playwright'
import assert from 'node:assert/strict'
const server=spawn(process.execPath,['server/index.js','--production'],{env:{...process.env,PORT:'5192'},stdio:'ignore',windowsHide:true})
let browser
try{
 for(let i=0;i<60;i++){try{if((await fetch('http://localhost:5192/api/status')).ok)break}catch{}await new Promise(r=>setTimeout(r,150))}
 browser=await chromium.launch({channel:'msedge',headless:true})
 const page=await browser.newPage({viewport:{width:1200,height:1000}}),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 let individualPoints=0,batchCalls=0
 const areas=['서울','부산','양방향'].map((dir,i)=>({id:`rest-${i}`,name:`테스트(${dir})휴게소`,routeName:'경부선',routeCode:'0010',directions:[dir],bidirectional:dir==='양방향',coordinates:{lat:36.5+i*.01,lng:127}}))
 const shelters=['서울','부산'].map((dir,i)=>({id:`s-${i}`,name:dir+'쉼터',routeName:'경부선',direction:dir,kilometer:100,installedYear:2015}))
 await page.addInitScript(()=>{class Point{constructor(lat,lng){this.lat=lat;this.lng=lng}}window.kakao={maps:{Map:class{relayout(){}setBounds(){}setLevel(){}panTo(){}},LatLng:Point,Point,Size:Point,LatLngBounds:class{extend(){}},MarkerImage:class{},Marker:class{setMap(){}},Polyline:class{setMap(){}},CustomOverlay:class{setMap(){}},event:{addListener(){}}}}})
 await page.route('**/api/**',route=>{
  const url=new URL(route.request().url()),path=url.pathname;let body={rows:[],count:0}
  if(path==='/api/status')body={publicMapKey:'test',sources:{}}
  if(path==='/api/rest-areas'){const extra=Array.from({length:130},(_,i)=>({...areas[0],id:`extra-${i}`,coordinates:null}));body={rows:[...areas,...extra],count:133}}
  if(path==='/api/map-point'||path==='/api/shelter-point')individualPoints++
  if(path==='/api/journey-points'){batchCalls++;body={points:[...areas.map(area=>({...area,kind:'rest'})),...shelters.map(area=>({...area,kind:'shelter',coordinates:{lat:36.7,lng:127}}))],failed:0,shelterError:''}}
  if(path==='/api/shelters')body={rows:shelters,count:2}
  if(path==='/api/shelter-point')body={row:{id:url.searchParams.get('id'),coordinates:{lat:36.7,lng:127}},status:'resolved'}
  if(path==='/api/places'){const start=url.searchParams.get('query')==='출발';body={rows:[{id:start?'a':'b',name:start?'출발도시':'도착도시',lng:127,lat:start?35.5:37.5,address:'테스트'}]}}
  if(path==='/api/route'){
   const reverse=url.searchParams.get('origin').endsWith('37.5'),points=[{lat:35.5,lng:127},{lat:37.5,lng:127}]
   body={distance:200000,duration:7200,highways:[{name:'경부고속도로',distance:200000}],paths:[{name:'경부고속도로',points:reverse?points.reverse():points}]}
  }
  if(path==='/api/rest-area')body={area:areas.find(a=>a.id===url.searchParams.get('id')),sources:{},menus:[],brands:[],parking:null}
  return route.fulfill({json:body})
 })
 await page.goto('http://localhost:5192/#route')
 for(const [label,query,name] of [['출발지','출발','출발도시'],['도착지','도착','도착도시']]){
  await page.getByRole('textbox',{name:label,exact:true}).fill(query)
  await page.getByRole('button',{name:`${label} 장소 검색`,exact:true}).click()
  await page.getByRole('button',{name:new RegExp(name)}).click()
 }
 await page.getByRole('button',{name:'경로 검색',exact:true}).click()
 await page.locator('.journey-stops>button').nth(2).waitFor()
 const names=await page.locator('.journey-stop-name strong').allTextContents()
 assert.ok(names.includes('테스트(서울)휴게소'));assert.ok(names.includes('테스트(양방향)휴게소'));assert.ok(!names.includes('테스트(부산)휴게소'))
 assert.equal(await page.locator('.journey-kind.shelter').count(),1)
 assert.equal(individualPoints,0);assert.equal(batchCalls,1)
 await page.getByRole('group',{name:'경로 쉼터 종류'}).getByRole('button',{name:/졸음쉼터/}).click()
 assert.equal(await page.locator('.journey-stops>button').count(),1)
 await page.locator('.journey-stops>button').filter({hasText:'서울쉼터'}).click()
 await page.getByRole('heading',{name:'서울쉼터 졸음쉼터',exact:true}).waitFor()
 await page.getByRole('button',{name:'졸음쉼터 상세정보 닫기',exact:true}).click()
 await page.getByRole('button',{name:'선택한 출발지와 목적지 바꾸기',exact:true}).click()
 assert.equal(await page.locator('.journey-panel').count(),0)
 await page.getByRole('button',{name:'경로 검색',exact:true}).click()
 await page.locator('.journey-stops>button').nth(2).waitFor()
 const reversed=await page.locator('.journey-stop-name strong').allTextContents()
 assert.ok(reversed.includes('테스트(부산)휴게소'));assert.ok(!reversed.includes('테스트(서울)휴게소'))
 for(const width of [768,390,320]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))}
 await page.getByRole('button',{name:'처음 화면',exact:true}).click()
 assert.equal(await page.locator('.journey-panel,.route-result').count(),0)
 assert.equal(await page.getByRole('textbox',{name:'출발지',exact:true}).inputValue(),'')
 assert.equal(await page.getByRole('textbox',{name:'도착지',exact:true}).inputValue(),'')
 assert.ok(await page.locator('.directory.compact').count()>0)
 assert.deepEqual(errors,[])
 console.log('Passed: route selection, highway names, directional rest stops and shelters, shared stops, reversed journey, details, mobile widths')
}finally{await browser?.close();server.kill()}
