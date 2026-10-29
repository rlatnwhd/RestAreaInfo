import {useEffect,useMemo,useState} from 'react'
import {request} from '../services/api'
import {journeyGroups,sameRoad} from '../utils/journey'
import {directionLabel} from '../utils/directionGroups'
import {roadOptions,shelterRoadOption} from '../utils/roadRoutes'
import RoadBadge from './RoadBadge'
import HighwayIcon from './HighwayIcon'
import {Chevron,Refresh} from './Icons'
export default function RouteJourney({route,data,catalogueError,onCatalogueRetry,onSelect,onShelter,onMatches,onLoadingChange}) {
 const [kind,setKind]=useState('all')
 const [points,setPoints]=useState([]),[loading,setLoading]=useState(true),[issue,setIssue]=useState(''),[retry,setRetry]=useState(0)
 useEffect(()=>{
  if(!data){setLoading(!catalogueError);setIssue(catalogueError||'');return}
  const controller=new AbortController();setLoading(true);setIssue('');setPoints([])
  async function load(){
   const result=await request('journey-points',{origin:`${route.origin.lng},${route.origin.lat}`,destination:`${route.destination.lng},${route.destination.lat}`},controller.signal)
   if(controller.signal.aborted)return
   setPoints(result.points||[]);setLoading(false)
   setIssue([result.shelterError,result.failed?`위치 조회에 실패한 ${result.failed}곳이 있습니다.`:''].filter(Boolean).join(' '))
  }
  load().catch(error=>{if(!controller.signal.aborted){setIssue(error.message);setLoading(false)}})
  return()=>controller.abort()
 },[route,data,retry,catalogueError])
 useEffect(()=>{onLoadingChange?.(loading)},[loading,onLoadingChange])
 const groups=useMemo(()=>journeyGroups(route,points.filter(row=>row.kind==='rest'),points.filter(row=>row.kind==='shelter')),[route,points])
 useEffect(()=>{onMatches?.(groups.flatMap(group=>group.stops))},[groups,onMatches])
 return <section className="journey-panel" aria-label="경로별 휴게소와 졸음쉼터"><header><div><h2>이번 경로의 쉼터</h2><p>고속도로 이용 순서 · 진행방향 기준</p></div><button type="button" className="text-button" disabled={loading} onClick={()=>data?setRetry(value=>value+1):onCatalogueRetry?.()} aria-label="경로 쉼터 다시 조회"><Refresh size={15}/></button></header>
  {!groups.length?<p className="journey-message">이 경로에는 고속도로 명칭이 제공되지 않았습니다.</p>:<>
   <ol className="journey-road-flow">{groups.map(road=><li key={road.name}>{road.name}</li>)}</ol>
   {loading&&<p className="journey-message" role="status">진행방향의 휴게소와 졸음쉼터 위치를 확인하고 있습니다…</p>}
   {issue&&<p className="journey-message" role="alert">{issue}</p>}
   {!loading&&data&&<div className="journey-kind-filters" role="group" aria-label="경로 쉼터 종류">{[['all','전체'],['rest','휴게소'],['shelter','졸음쉼터']].map(([value,label])=><button type="button" key={value} aria-pressed={kind===value} className={kind===value?'active':''} onClick={()=>setKind(value)}>{label} <strong>{groups.reduce((sum,road)=>sum+road.stops.filter(area=>value==='all'||area.kind===value).length,0)}</strong></button>)}</div>}
   {!loading&&data&&<div className="journey-road-groups">{groups.map(road=>{
    const options=roadOptions((data?.rows||[]).filter(area=>sameRoad(road.name,area.routeName)))
    const number=options[0]?.number||shelterRoadOption(points.find(area=>sameRoad(area.routeName,road.name))?.routeName).number
    const rests=road.stops.filter(row=>row.kind==='rest').length,shelters=road.stops.length-rests
    return <article key={road.name} className="journey-road-group"><header>{number&&<RoadBadge type="expressway" number={number}/>}<div><h3>{road.name}</h3><p>{(road.distance/1000).toFixed(1)} km 이용 · 휴게소 {rests} · {issue.includes('졸음쉼터 자료')?'졸음쉼터 조회 실패':`졸음쉼터 ${shelters}`}</p></div></header>
     {!road.stops.filter(area=>kind==='all'||area.kind===kind).length?<p className="journey-empty">위치·진행방향이 일치하는 쉼터를 확인하지 못했습니다.</p>:<div className="journey-stops">{road.stops.filter(area=>kind==='all'||area.kind===kind).map(area=><button type="button" key={`${area.kind}:${area.id}`} onClick={()=>area.kind==='shelter'?onShelter(area):onSelect(area)}><span className={`journey-kind ${area.kind}`}>{area.kind==='rest'?'휴게소':'졸음쉼터'}</span><span className="journey-stop-name"><strong>{area.name}{area.kind==='shelter'&&!area.name.includes('졸음쉼터')?' 졸음쉼터':''}</strong><small><HighwayIcon size={12}/>{directionLabel(area.journeyDirection)}</small></span><Chevron size={15}/></button>)}</div>}
     {road.unverified>0&&<p className="journey-exclusions">해당 노선 위치·방향 미확인 {road.unverified}곳 제외</p>}
    </article>
   })}</div>}
  </>}
  <p className="journey-caption">경로 주변 1.2km 이내 위치와 진행방향으로 추린 참고 정보입니다. 양방향 휴게소를 포함하며 실제 진입 가능 여부는 길찾기로 확인하세요.</p>
 </section>
}
