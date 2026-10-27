import ShelterDetail from './ShelterDetail'
import RoadBadge from './RoadBadge'
import HighwayIcon from './HighwayIcon'
import { shelterRoadOption } from '../utils/roadRoutes'
import RoadSelect from './RoadSelect'
import drowsyIcon from '../../icons/drowsy-driving.png'
import { useEffect, useMemo, useState } from 'react'
import { request } from '../services/api'
import { Search, Pin } from './Icons'
import State from './State'

export default function ShelterBrowser({apiKey}) {
  const [selected,setSelected]=useState(null)
  const [data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[reload,setReload]=useState(0)
  const [query,setQuery]=useState(''),[route,setRoute]=useState(''),[direction,setDirection]=useState(''),[page,setPage]=useState(1)
  useEffect(()=>{const controller=new AbortController();setLoading(true);setError('');request('shelters',{},controller.signal).then(setData).catch(e=>{if(e.name!=='AbortError')setError(e.message)}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});return()=>controller.abort()},[reload])
  const routes=useMemo(()=>[...new Set((data?.rows||[]).map(row=>row.routeName).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko')),[data])
  const directions=useMemo(()=>[...new Set((data?.rows||[]).filter(row=>!route||row.routeName===route).map(row=>row.direction).filter(Boolean))].sort(),[data,route])
  const rows=(data?.rows||[]).filter(row=>(!route||row.routeName===route)&&(!direction||row.direction===direction)&&`${row.name} ${row.routeName}`.includes(query.trim()))
  const pages=Math.max(1,Math.ceil(rows.length/18))
  return <><section className="content-panel shelter-browser"><div className="section-title"><div><h1>졸음쉼터 안내</h1><p>이동 중 잠깐 쉬어갈 곳을 노선과 방향별로 확인하세요.</p></div><span className="title-icon"><img src={drowsyIcon} width="34" height="34" alt="" /></span></div><div className="shelter-filters"><label className="search-field"><Search size={17}/><input aria-label="졸음쉼터 검색" placeholder="쉼터명 또는 노선 검색" value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}}/></label><RoadSelect label="졸음쉼터 노선" value={route} options={[{value:'',name:'전체 노선'},...routes.map(shelterRoadOption)]} onChange={value=>{setRoute(value);setDirection('');setPage(1)}} /><RoadSelect icon={<HighwayIcon size={18}/>} label="졸음쉼터 방향" value={direction} options={[{value:'',name:'전체 방향'},...directions.map(name=>({value:name,name}))]} onChange={value=>{setDirection(value);setPage(1)}} /></div>{loading||error?<State loading={loading} error={error} onRetry={()=>setReload(value=>value+1)}/>:<><p className="result-label">졸음쉼터 <strong>{rows.length.toLocaleString()}곳</strong><span className="shelter-date">2026.08.01 기준</span></p>{!rows.length?<State title="검색 결과가 없습니다">다른 검색어나 노선을 선택해 주세요.</State>:<><div className="shelter-grid">{rows.slice((page-1)*18,page*18).map(row=><button type="button" key={row.id} className="shelter-card" onClick={()=>setSelected(row)} aria-label={`${row.name} ${row.direction} 졸음쉼터 상세정보`}><div className="shelter-card-top"><span className="shelter-route-label"><RoadBadge {...shelterRoadOption(row.routeName)}/>{row.routeName||'노선 정보 없음'}</span><span className="small-badge success"><HighwayIcon size={14}/>{row.direction||'방향 정보 없음'}</span></div><div className="shelter-card-heading"><span className="shelter-symbol"><img src={drowsyIcon} width="29" height="29" alt="" /></span><h2>{row.name||'명칭 정보 없음'}{row.name&&!row.name.includes('졸음쉼터')?' 졸음쉼터':''}</h2></div><div className="shelter-card-metrics"><p><Pin size={14}/> 이정 {row.kilometer===null?'정보 없음':`${row.kilometer} km`}</p><small>{row.installedYear===null?'설치연도 정보 없음':`${row.installedYear}년 설치`}</small></div></button>)}</div><div className="pagination"><button disabled={page<=1} onClick={()=>setPage(value=>value-1)}>이전</button><span>{page} / {pages}</span><button disabled={page>=pages} onClick={()=>setPage(value=>value+1)}>다음</button></div></>}</>}<p className="source-line">출처: <a href="https://www.data.go.kr/data/15043710/fileData.do" target="_blank" rel="noreferrer">한국도로공사 졸음쉼터 설치현황</a> · 기준일 2026.08.01<br/>이정은 해당 노선의 거리 기준점입니다. 화장실·편의시설 정보는 현장 표지판을 확인하세요.</p></section>{selected&&<ShelterDetail key={selected.id} shelter={selected} apiKey={apiKey} onClose={()=>setSelected(null)}/>}</>
}
