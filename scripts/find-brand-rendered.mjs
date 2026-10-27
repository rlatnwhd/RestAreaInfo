import {chromium} from 'playwright'
import fs from 'node:fs'
const sites={'탐앤탐스':'https://www.tomntoms.com/','로띠번':'https://rottibun.com/ko/','파스쿠찌':'https://www.pascucci.co.kr/','투썸플레이스':'https://www.twosome.co.kr/','엔제리너스':'https://www.lotteeatz.com/brand/angelinus','롯데리아':'https://www.lotteeatz.com/brand/lotteria','GS25':'https://www.gsretail.com/brand/gs25','공차':'https://www.gong-cha.co.kr/brand/','파리바게뜨':'https://www.paris.co.kr/','배스킨라빈스':'https://www.baskinrobbins.co.kr/','스타벅스':'https://www.starbucks.co.kr/','맥도날드':'https://www.mcdonalds.co.kr/kor/','NEPA':'https://www.nplus.co.kr/main/main.asp','토스타토스트':'https://www.tosta-toast.com/','성북당':'https://www.sungbukdang.com/','임실치즈피자':'https://www.imsilcheesepizza.com/'}
const browser=await chromium.launch({channel:'msedge',headless:true})
const result={};let cursor=0;const tasks=Object.entries(sites)
async function worker(){const page=await browser.newPage();while(cursor<tasks.length){const [name,url]=tasks[cursor++];try{await page.goto(url,{waitUntil:'domcontentloaded',timeout:16000});await page.waitForTimeout(500);result[name]={site:page.url(),candidates:await page.evaluate(()=>{
 const images=[...document.images].filter(i=>/logo|로고/i.test(i.outerHTML)).map(i=>i.currentSrc||i.src)
 const backgrounds=[...document.querySelectorAll('[class*=logo],[id*=logo],header h1 a,.header h1 a')].flatMap(el=>{const bg=getComputedStyle(el).backgroundImage;return [...bg.matchAll(/url\(["']?(.*?)["']?\)/g)].map(m=>new URL(m[1],location.href).href)})
 return [...new Set([...images,...backgrounds])].filter(s=>s.startsWith('http')).slice(0,12)
})}}catch(e){result[name]={site:url,error:e.name}}}await page.close()}
try{await Promise.all(Array.from({length:4},worker));fs.writeFileSync('artifacts/research/brand-rendered.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result))}finally{await browser.close()}
