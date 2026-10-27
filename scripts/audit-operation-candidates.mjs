import fs from 'node:fs'
const input=JSON.parse(fs.readFileSync('artifacts/research/operations-input.json','utf8'))
const rows=JSON.parse(fs.readFileSync('artifacts/research/operations-2026.json','utf8'))
const norm=s=>String(s||'').replace(/\s+/g,'').replace(/휴게소/g,'')
const matched=[],unmatched=[]
for(const area of input.base){
 const byName=rows.filter(row=>norm(row['휴게소명'])===norm(area.name))
 const candidates=byName.filter(row=>norm(row['노선명'])===norm(area.routeName).replace(/\([^)]*\)/g,''))
 ;(candidates.length===1?matched:unmatched).push({code:area.code,name:area.name,route:area.routeName,candidates,byName})
}
console.log(JSON.stringify({matched:matched.length,unmatched,types:[...new Set(rows.map(row=>row['유형']))]},null,2))
fs.writeFileSync('artifacts/research/latest-operation-candidates.json',JSON.stringify({matched,unmatched},null,2))
