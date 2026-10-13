import fs from 'node:fs'
import { api, exRows } from '../server/api.js'

const report={checkedAt:new Date().toISOString(),sources:{},limitations:['휴게소 X/Y 좌표계는 공식 확인 전 미검증 상태입니다.','진입 방향·접속 도로 자료가 없어 경로상 휴게소를 확정하지 않습니다.','ODCLOUD 통계에는 stdRestCd가 없어 다른 자료와 자동 결합하지 않습니다.']}
for (const [name,path] of Object.entries({basic:'/api/rest-areas',menus:'/api/menus',oilFacilities:'/api/oil-facilities',statistics:'/api/statistics'})) {
  try {
    const data=await api(path,new URLSearchParams())
    report.sources[name]={success:true,count:data.count,fields:data.fields||['순번','노선명','휴게소명','소재지','1일 이용객수(17년)','1일 차량 통행량(24년)'],sample:data.rows.slice(0,2)}
    if(name==='basic') {
      report.duplicateBasicCodes=data.rows.filter(row=>row.ambiguousCode).length
      report.sampleJoins=[]
      for (const area of data.rows.slice(0,3)) {
        const detail=await api('/api/rest-area',new URLSearchParams({id:area.id}))
        report.sampleJoins.push({code:area.code,name:area.name,menus:detail.menus.length,brands:detail.brands.length,oilFacilities:detail.oilFacilities.length,sources:detail.sources})
      }
    }
  } catch(e) { report.sources[name]={success:false,message:e.message,code:e.code} }
}
try { const places=await api('/api/places',new URLSearchParams({query:'서울역'})); report.sources.places={success:true,count:places.rows.length}; const result=await api('/api/route',new URLSearchParams({origin:'126.972,37.555',destination:'129.04,35.115'})); report.sources.route={success:true,distance:result.distance,duration:result.duration,roadCount:result.paths.length,matchingStatus:result.matchingStatus} } catch(e) { report.sources.route={success:false,message:e.message} }
try {
  const data=await exRows('brands')
  report.sources.brands={success:true,count:data.count,fields:data.fields}
  const menus=await exRows('menus')
  report.menuFlagValues=Object.fromEntries(['recommendyn','bestfoodyn','premiumyn','seasonMenu'].map(field=>[field,[...new Set(menus.rows.map(row=>row[field]))]]))
  const locations=await api('/api/map-points',new URLSearchParams())
  report.sources.mapPoints={success:true,count:locations.count,total:locations.total,source:locations.source}
}catch(e){report.additionalVerificationError=e.message}
fs.mkdirSync('docs',{recursive:true})
fs.writeFileSync('docs/api-verification.json',JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify({sources:Object.fromEntries(Object.entries(report.sources).map(([name,result])=>[name,{success:result.success,count:result.count}])),report:'docs/api-verification.json'},null,2))
