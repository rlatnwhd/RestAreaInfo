import {chromium} from 'playwright'
import {spawn} from 'node:child_process'
import fs from 'node:fs'
const base='http://localhost:5173';let server,browser
try{
 try{await fetch(base+'/api/status',{signal:AbortSignal.timeout(2000)})}catch{server=spawn(process.execPath,['server/index.js','--production'],{stdio:'ignore',windowsHide:true});for(let i=0;i<60;i++){try{if((await fetch(base+'/api/status')).ok)break}catch{}await new Promise(r=>setTimeout(r,200))}}
 browser=await chromium.launch({channel:'msedge',headless:true})
 const page=await browser.newPage({viewport:{width:1440,height:1050},deviceScaleFactor:1})
 await page.goto(base+'/#route')
 await page.locator('.area-open').first().waitFor({timeout:45000})
 try{await page.waitForFunction(()=>!document.querySelector('.summary-loading')&&!document.querySelector('.map-points-status:not(.is-error)'),null,{timeout:45000})}catch{}
 await page.locator('.explorer-panel').screenshot({path:'presentation/assets/route-home.png'})
 const catalog=await (await page.request.get(base+'/api/rest-areas')).json()
 const a=catalog.rows.find(row=>row.name.includes('죽전')),b=catalog.rows.find(row=>row.name.includes('기흥'))
 const details=await(await page.request.get(base+'/api/rest-area?id='+encodeURIComponent(a.id))).json()
 const metadata={capturedAt:'2026-10-28',areaCount:catalog.count,menuCount:(await(await page.request.get(base+'/api/menu-count')).json()).count,shelterCount:(await(await page.request.get(base+'/api/shelters')).json()).count,example:{id:a.id,name:a.name,routeName:a.routeName,menus:details.menus?.slice(0,2).map(row=>({name:row.name,price:row.price})),parking:details.parking}}
 fs.writeFileSync('presentation/assets/verified-data.json',JSON.stringify(metadata,null,2))
 await page.goto(base+'/#directory');await page.getByLabel('휴게소명 검색',{exact:true}).fill('죽전');await page.locator('.area-open').first().click()
 await page.locator('.detail-dialog .basic-grid').waitFor({timeout:45000})
 await page.locator('.detail-dialog').screenshot({path:'presentation/assets/detail.png'})
 await page.locator('.parking-info').screenshot({path:'presentation/assets/parking.png'})
 await page.getByRole('tab',{name:'입점 브랜드',exact:true}).click();await page.locator('.brand-store-card').first().waitFor();await page.waitForTimeout(400)
 await page.locator('.detail-dialog').screenshot({path:'presentation/assets/brands.png'})
 await page.getByRole('button',{name:'상세정보 닫기',exact:true}).click()
 await page.locator('.compare-check input').first().check()
 await page.getByLabel('휴게소명 검색',{exact:true}).fill('기흥');await page.locator('.compare-check input').first().check()
 await page.getByRole('button',{name:'선택한 휴게소 비교',exact:true}).click();await page.locator('.comparison-table').waitFor({timeout:45000})
 await page.locator('.compare-dialog .dialog-content').evaluate(el=>el.scrollTop=el.scrollHeight)
 await page.locator('.compare-dialog').screenshot({path:'presentation/assets/compare.png'})
 await page.getByRole('button',{name:'비교 화면 닫기',exact:true}).click()
 await page.goto(base+'/#shelters');await page.locator('.shelter-card').first().waitFor({timeout:45000});await page.locator('.shelter-card').first().click();await page.locator('.shelter-detail .location-map-actions button:enabled').first().waitFor({timeout:30000});await page.locator('.shelter-detail').screenshot({path:'presentation/assets/shelter.png'})
 await page.getByRole('button',{name:'졸음쉼터 상세정보 닫기',exact:true}).click()
 await page.goto(base+'/#route');await page.setViewportSize({width:390,height:844});await page.waitForTimeout(400);await page.screenshot({path:'presentation/assets/mobile.png'})
 console.log(JSON.stringify({screenshots:7,areaCount:metadata.areaCount,menuCount:metadata.menuCount,shelterCount:metadata.shelterCount}))
}finally{await browser?.close();server?.kill()}
