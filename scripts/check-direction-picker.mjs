import assert from 'node:assert/strict'
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
import { matchesDirection } from '../src/utils/directionGroups.js'
const server=spawn(process.execPath,['server/index.js','--production'],{env:{...process.env,PORT:'5192'},stdio:'ignore',windowsHide:true})
let browser
try{
  let ready=false
  for(let i=0;i<80;i++){try{const r=await fetch('http://localhost:5192/api/status');if(r.ok){ready=true;break}}catch{}await new Promise(resolve=>setTimeout(resolve,150))}
  assert.ok(ready)
  const data=await (await fetch('http://localhost:5192/api/rest-areas')).json()
  assert.ok(data.rows.length)
  browser=await chromium.launch({channel:'msedge',headless:true})
  const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto('http://localhost:5192/#route')
  const picker=page.locator('.highway-picker')
  await picker.getByRole('radio').first().waitFor({timeout:45000})
  assert.ok(await picker.getByRole('button',{name:'휴게소 보기',exact:true}).isDisabled())
  await picker.getByRole('combobox',{name:'방향별 찾기 고속도로'}).click()
  await picker.getByRole('option',{name:/고속국도 1호선 경부선/}).click()
  const radio=picker.getByRole('radio',{name:/부산 방향/})
  await radio.check()
  const expected=data.rows.filter(row=>row.routeName==='경부선'&&matchesDirection(row,'부산'))
  assert.ok(expected.length)
  const submit=picker.getByRole('button',{name:`휴게소 ${expected.length}곳 보기`,exact:true})
  fs.mkdirSync('artifacts',{recursive:true})
  await picker.screenshot({path:'artifacts/direction-picker-desktop.png'})
  await page.setViewportSize({width:390,height:844})
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth))
  await picker.screenshot({path:'artifacts/direction-picker-mobile.png'})
  await submit.click()
  await page.waitForURL('**/#directory')
  await page.locator('.content-panel #directory-title').waitFor()
  assert.ok((await page.locator('#directory-title').innerText()).includes(String(expected.length)))
  const names=await page.locator('.area-open>strong').evaluateAll(nodes=>nodes.map(node=>node.firstChild.textContent))
  assert.ok(names.every(name=>expected.some(row=>row.name===name)))
  await page.getByRole('button',{name:/서울 방향/}).click()
  assert.ok((await page.locator('.area-open>strong').allTextContents()).every(name=>matchesDirection(data.rows.find(row=>row.name===name),'서울')))
  for(const width of [320,768]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth))}
  await page.goto('http://localhost:5192/#route')
  await page.locator('.picker-directions input').first().waitFor()
  await page.locator('.picker-directions input').first().check()
  await page.getByRole('combobox',{name:'방향별 찾기 고속도로'}).click()
  await page.getByRole('option',{name:/고속국도 50호선 영동선/}).click()
  assert.equal(await page.locator('.picker-directions input:checked').count(),0)
  assert.ok(await page.locator('.picker-submit').isDisabled())
  assert.equal(errors.length,0)
  console.log(JSON.stringify({passed:true,busanCount:expected.length,checked:['live direction counts','matching filtered directory','direction switching','highway reset','320/390/768 responsiveness']}))
}finally{await browser?.close();server.kill()}
