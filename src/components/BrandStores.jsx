import { businessStatus } from '../utils/businessHours'
﻿import brands from '../data/brandLogos.json'
import { useEffect, useState } from 'react'
import { Clock3, ExternalLink, Store } from 'lucide-react'
function BrandLogo({name,logo,background}) {
  const [failed,setFailed]=useState(false)
  return <div className="brand-logo-tile" style={logo&&!failed&&background?{background}:undefined}>{logo&&!failed?<img src={logo} alt={`${name} 로고`} loading="lazy" onError={()=>setFailed(true)}/>:<Store size={26} aria-hidden="true"/>}</div>
}
export default function BrandStores({rows}) {
  const [now,setNow]=useState(()=>new Date())
  useEffect(()=>{
    const update=()=>setNow(new Date())
    const timer=setInterval(update,15000)
    document.addEventListener('visibilitychange',update);window.addEventListener('focus',update)
    return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',update);window.removeEventListener('focus',update)}
  },[])
  return <div className="brand-stores"><div className="brand-stores-heading"><p>입점 브랜드 <strong>{rows.length}</strong></p><small>한국 시간·등록 운영시간 기준 · 마감 1시간 전부터 곧 마감</small></div><div className="brand-store-grid">{rows.map((row,index)=>{
    const asset=brands[row.name],status=businessStatus(row.start,row.end,now)
    return <article className="brand-store-card" key={`${row.name}:${index}`}>
      <header><BrandLogo name={row.name} logo={asset?.logo} background={asset?.background}/><div><h3>{row.name||'브랜드명 미제공'}</h3>{asset&&<a href={asset.source} target="_blank" rel="noopener noreferrer" aria-label={`${row.name} 공식 브랜드 페이지 새 창`}>브랜드 페이지 <ExternalLink size={11}/></a>}</div></header>
      {row.description&&<p className="brand-store-description">{row.description}</p>}
      <footer><div className="brand-store-hours"><Clock3 size={15}/><span>{row.start&&row.end?`${row.start} – ${row.end}`:'운영시간 미제공'}</span><span className={`brand-business-status ${status.kind}`} title={status.allDay?'24시간 운영':status.kind==='unknown'?'등록된 시간만으로 영업 여부를 판단할 수 없습니다.':'등록 운영시간 기준이며 임시휴무·현장 상황은 반영하지 않습니다.'}><i aria-hidden="true"/>{status.label}</span></div>{row.updatedAt&&<small>정보 갱신 {row.updatedAt}</small>}</footer>
    </article>
  })}</div></div>
}
