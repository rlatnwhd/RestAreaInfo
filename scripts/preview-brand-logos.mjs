import fs from 'node:fs'
import {chromium} from 'playwright'
const manifest=JSON.parse(fs.readFileSync('src/data/brandLogos.json','utf8'))
const browser=await chromium.launch({channel:'msedge',headless:true})
try{const page=await browser.newPage({viewport:{width:1000,height:1000}});await page.setContent(`<style>body{font:14px sans-serif;display:grid;grid-template-columns:repeat(4,1fr);gap:12px;background:#eee}article{background:white;padding:15px;text-align:center;border-radius:10px}img{width:160px;height:85px;object-fit:contain;background:#f3f5f7}p{margin:8px}</style>`+Object.entries(manifest).map(([name,m])=>{const ext=m.logo.split('.').pop(),type=ext==='svg'?'svg+xml':ext;return `<article><img src="data:image/${type};base64,${fs.readFileSync('public'+m.logo).toString('base64')}"><p>${name}</p></article>`}).join(''));await page.screenshot({path:'artifacts/brand-logo-contact.png',fullPage:true})}finally{await browser.close()}
