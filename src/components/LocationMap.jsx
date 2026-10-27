import { request } from '../services/api'
import { useEffect, useMemo, useState } from 'react'
import LiveMap from './LiveMap'
export default function LocationMap({areas, apiKey, comparison=false,pointEndpoint='map-point',placeType='휴게소'}) {
  const [focused,setFocused]=useState(null)
  const [points,setPoints]=useState({}),[looking,setLooking]=useState(false),[lookupError,setLookupError]=useState(false),[retry,setRetry]=useState(0)
  const missingIds=areas.filter(area=>!area.coordinates).map(area=>area.id).sort().join('|')
  useEffect(()=>{
    if(!missingIds){setLooking(false);return}
    const controller=new AbortController();setLooking(true);setLookupError(false)
    Promise.all(missingIds.split('|').map(async id=>{
      try{const result=await request(pointEndpoint,{id},controller.signal);return [id,result.row]}
      catch(error){if(error.name!=='AbortError'&&!controller.signal.aborted)setLookupError(true);return [id,null]}
    })).then(result=>{if(!controller.signal.aborted)setPoints(previous=>({...previous,...Object.fromEntries(result)}))}).finally(()=>{if(!controller.signal.aborted)setLooking(false)})
    return()=>controller.abort()
  },[missingIds,retry,pointEndpoint])
  const located=useMemo(()=>areas.map(area=>area.coordinates?area:points[area.id]?{...area,...points[area.id]}:area).filter(area=>area.coordinates),[areas,points])
  const missing=areas.filter(area=>!area.coordinates&&!points[area.id])
  return <section className="location-map-section" aria-label={comparison?'비교 휴게소 위치':`${placeType} 위치`}>
    <header><h3>{comparison?'비교 휴게소 위치':`${placeType} 위치`}</h3></header>
    {located.length ? <><div className="location-map-frame"><LiveMap apiKey={apiKey} areas={located} onSelect={area=>setFocused(area.id)} selectedId={focused} showLabels locationOnly onReset={()=>setFocused(null)}/></div>{comparison&&<div className="location-map-places">{located.map((area,index)=><button type="button" className={focused===area.id?'active':''} key={area.id} onClick={()=>setFocused(area.id)}>{area.name}</button>)}</div>}</> : <p className="location-map-unavailable">{looking?'휴게소 위치를 확인하고 있습니다…':lookupError?'위치를 불러오지 못했습니다.':'주소와 휴게소명으로 위치를 확인하지 못했습니다.'}</p>}
    {lookupError&&!looking&&<button type="button" className="text-button" onClick={()=>setRetry(value=>value+1)}>위치 다시 찾기</button>}{missing.length>0&&located.length>0&&!looking&&<p className="location-map-note">위치 미확인: {missing.map(area=>area.name).join(', ')}</p>}
  </section>
}
