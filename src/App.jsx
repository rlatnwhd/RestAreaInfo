import foodLogo from '../icons/food.png'
import RouteJourney from './components/RouteJourney'
import ShelterDetail from './components/ShelterDetail'
import usePageMotion from './hooks/usePageMotion'
import HighwayRoutes from './components/HighwayRoutes'
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { request } from './services/api'
import { Route, Search, ArrowRight, Shield, Food, Store, Chart, Info, Refresh, Close, Chevron, Fuel } from './components/Icons'
import RouteSearch from './components/RouteSearch'
import LiveMap from './components/LiveMap'
import Directory from './components/Directory'
import HighwayPicker from './components/HighwayPicker'
import MenuBrowser from './components/MenuBrowser'
import RestAreaDetail from './components/RestAreaDetail'
import RestAreaCompare from './components/RestAreaCompare'
import State from './components/State'
import ShelterBrowser from './components/ShelterBrowser'
import SourceInfo from './components/SourceInfo'
const Statistics = lazy(() => import('./components/Statistics'))
const navigation = [['route','경로 찾기'],['highways','노선별 고속도로'],['directory','휴게소 찾기'],['menus','음식 메뉴'],['shelters','졸음쉼터'],['statistics','과거 통계'],['sources','이용·데이터 안내']]
function currentView() { const hash=window.location.hash.slice(1); return navigation.some(([id])=>id===hash)?hash:'route' }

export default function App() {
  const [menuLoading,setMenuLoading]=useState(true),[menuError,setMenuError]=useState(''),[pointsLoading,setPointsLoading]=useState(true),[pointsError,setPointsError]=useState(''),[journeyLoading,setJourneyLoading]=useState(false)
  const [journeyPoints,setJourneyPoints]=useState([]),[selectedShelter,setSelectedShelter]=useState(null)
  const [view,setView]=useState(currentView),[status,setStatus]=useState(null),[data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[reload,setReload]=useState(0),[route,setRoute]=useState(null),[selected,setSelected]=useState(null),[compare,setCompare]=useState([]),[showCompare,setShowCompare]=useState(false),[stats,setStats]=useState(null),[menuCount,setMenuCount]=useState(null),[points,setPoints]=useState([]),[shelterCount,setShelterCount]=useState(null),[directoryPreset,setDirectoryPreset]=useState(null)
  useEffect(()=>{function change(){setView(currentView());window.scrollTo({top:0,behavior:'instant'})}window.addEventListener('hashchange',change);return()=>window.removeEventListener('hashchange',change)},[])
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError('');setMenuLoading(true);setMenuError('');setPointsLoading(true);setPointsError('')
    async function locations(){
      const result=await request('status',{},controller.signal);setStatus(result)
      if(!result.sources.ex||!result.sources.places)throw new Error('위치 검색 연결 설정을 확인해 주세요.')
      try{const saved=await request('map-points-cached',{},controller.signal);if(!controller.signal.aborted&&saved.rows?.length)setPoints(saved.rows)}catch(error){if(error.name==='AbortError')throw error}
      const map=await request('map-points',{},controller.signal);if(!controller.signal.aborted)setPoints(map.rows)
    }
    locations().catch(error=>{if(error.name!=='AbortError')setPointsError(error.message)}).finally(()=>{if(!controller.signal.aborted)setPointsLoading(false)})
    request('rest-areas',{},controller.signal).then(setData).catch(e=>{if(e.name!=='AbortError')setError(e.message)}).finally(()=>{if(!controller.signal.aborted)setLoading(false)})
    request('shelters',{},controller.signal).then(result=>setShelterCount(result.count)).catch(()=>{})
    request('statistics',{},controller.signal).then(setStats).catch(()=>{})
    request('menu-count',{},controller.signal).then(result=>setMenuCount(result.count)).catch(e=>{if(e.name!=='AbortError')setMenuError(e.message)}).finally(()=>{if(!controller.signal.aborted)setMenuLoading(false)})
    return()=>controller.abort()
  },[reload])
  usePageMotion(view)
  const select=useCallback(area=>setSelected(area),[])
  const selectMap=useCallback(area=>area.kind==='shelter'?setSelectedShelter(area):setSelected(area),[])
  const updateRoute=useCallback(value=>{setJourneyPoints([]);setJourneyLoading(Boolean(value));setRoute(value)},[])
  const retry=()=>setReload(value=>value+1)
  function toggleCompare(area){setCompare(previous=>previous.some(item=>item.id===area.id)?previous.filter(item=>item.id!==area.id):previous.length<3?[...previous,area]:previous)}
  const displayData=useMemo(()=>data?{...data,rows:data.rows.map(area=>({...area,...points.find(point=>point.id===area.id)}))}:null,[data,points])
  function browseDirection(choice){setDirectoryPreset(choice);window.location.hash='directory'}
  const directoryProps={data:displayData,loading,error,pointsLoading,onRetry:retry,onSelect:select,selectedId:selected?.id,compareIds:compare.map(area=>area.id),onCompare:toggleCompare}
  return <><a href="#main" className="skip-link">본문 바로가기</a><header className="site-header"><div className="container header-main"><a href="#route" className="brand" aria-label="휴게길 홈"><span className="brand-symbol has-logo"><img src={foodLogo} width="34" height="34" alt=""/></span><span>휴게길<small>고속도로 휴게소 통합정보</small></span></a><a className="header-guide" href="#sources"><Info size={16}/> 데이터 이용 안내 <Chevron size={14}/></a></div><nav className="main-nav" aria-label="주요 메뉴"><div className="container">{navigation.map(([id,title])=><a key={id} href={`#${id}`} className={view===id?'active':''} aria-current={view===id?'page':undefined}>{title}</a>)}</div></nav></header>
    <main id="main" className="container main-container">{view==='route'?<><section className="hero"><div className="hero-copy"><h1>고속도로 휴게소·졸음쉼터 안내</h1><p>이동 경로와 휴게소 메뉴·편의시설을 확인하세요.</p></div></section><section className="summary-grid" aria-label="데이터 현황">{[{icon:Route,title:'휴게소 기준정보',value:data?.count,unit:'곳',hint:'한국도로공사 기준정보'},{icon:Food,title:'등록 음식 메뉴',value:menuCount,unit:'건',hint:'메뉴 및 등록 가격',busy:menuLoading,fail:menuError},{icon:Chart,title:'과거 통계 대상',value:stats?.count,unit:'곳',hint:'2017 이용객 · 2024 통행량'},{icon:Route,title:'졸음쉼터',value:shelterCount,unit:'곳',hint:'노선·방향별 위치 안내'}].map(({icon:Icon,title,value,unit,hint,busy,fail})=><article key={title} aria-busy={busy||undefined}><span className="summary-icon"><Icon size={22}/></span><div><span>{title}</span><strong>{busy?<span className="summary-loading"><Refresh size={13}/>불러오는 중</span>:fail?<span className="summary-load-error">조회 실패</span>:typeof value==='number'?value.toLocaleString():value??'—'}<small>{!busy&&!fail&&value!=null?unit:''}</small></strong><p>{fail?<button className="text-button" onClick={retry}>다시 조회</button>:hint}</p></div></article>)}</section><HighwayPicker data={data} loading={loading} error={error} onBrowse={browseDirection}/><div className="explorer-panel"><RouteSearch onRoute={updateRoute} currentRoute={route}/><div className="workspace"><LiveMap apiKey={status?.publicMapKey} route={route} pointsLoading={route?journeyLoading:pointsLoading} pointsError={route?null:pointsError} onRetryPoints={retry} areas={route?journeyPoints:displayData?.rows||[]} onSelect={selectMap} selectedId={selected?.id||selectedShelter?.id}/><>{route?<RouteJourney key={`${route.origin.lng}:${route.origin.lat}:${route.destination.lng}:${route.destination.lat}`} route={route} data={data} catalogueError={error} onCatalogueRetry={retry} onSelect={select} onShelter={setSelectedShelter} onMatches={setJourneyPoints} onLoadingChange={setJourneyLoading}/>:<Directory {...directoryProps} compact/>}</></div></div><div className="inline-notice route-notice"><Info size={17}/><p>{route?.matchingMessage||'지도와 목록은 전체 휴게소입니다. 이동 경로별 진입 가능 여부는 확인되지 않았습니다.'}</p></div><section className="quick-services"><div className="section-heading"><div><h2>휴게소 정보 빠르게 찾기</h2></div><a href="#sources">데이터 안내 <Chevron size={14}/></a></div><div className="service-grid">{[{id:'menus',icon:Food,title:'음식 메뉴·가격',description:'먹고 싶은 메뉴와 등록 가격 확인'},{id:'directory',icon:Store,title:'휴게소·입점 브랜드',description:'휴게소를 선택해 매장 정보 확인'},{id:'statistics',icon:Chart,title:'과거 이용객 통계',description:'기준 연도가 있는 원본 통계 확인'}].map(({id,icon:Icon,title,description})=><a key={id} href={`#${id}`}><span className="service-icon"><Icon size={24}/></span><h3>{title}</h3><p>{description}</p><span className="service-arrow"><ArrowRight size={17}/></span></a>)}</div></section></>:<><div className="breadcrumb"><a href="#route">홈</a><Chevron size={12}/><span>{navigation.find(([id])=>id===view)?.[1]}</span></div>{view==='highways'&&<HighwayRoutes data={data} loading={loading} error={error} onRetry={retry} onBrowse={browseDirection}/>}
{view==='directory'&&<div className="content-panel"><div className="section-title"><div><h1>고속도로 휴게소 찾기</h1><p>휴게소별 메뉴와 입점 브랜드를 확인하세요.</p></div></div><Directory key={directoryPreset?`${directoryPreset.routeName}:${directoryPreset.direction}`:'all'} {...directoryProps} preset={directoryPreset}/></div>}{view==='menus'&&<MenuBrowser areasData={data}/>}{view==='shelters'&&<ShelterBrowser apiKey={status?.publicMapKey}/>}{view==='statistics'&&<Suspense fallback={<State loading/>}><Statistics/></Suspense>}{view==='sources'&&<SourceInfo data={data} stats={stats}/>}</>}
    </main><footer className="site-footer"><div className="container"><div className="footer-top"><a className="footer-brand" href="#route"><img src={foodLogo} width="24" height="24" alt=""/> 휴게길</a><div><a href="#sources">이용·데이터 안내</a><a href="#statistics">통계 기준 확인</a><a href="#route">경로 찾기</a></div></div><p>데이터 제공: 한국도로공사 · 공공데이터포털 | 지도·경로: Kakao</p><small>가격·시설 정보는 현장과 다를 수 있습니다.</small></div></footer>{compare.length>0&&<aside className="compare-dock" aria-label="선택한 휴게소 비교"><div className="container"><strong>휴게소 비교 <span>{compare.length}/3</span></strong><button className="compare-clear" onClick={()=>{setCompare([]);setShowCompare(false)}}>전체 삭제</button><div className="compare-selected">{compare.map(area=><button key={area.id} onClick={()=>toggleCompare(area)} aria-label={`${area.name} 비교 선택 해제`}>{area.name}<Close size={13}/></button>)}</div><button className="button primary" disabled={compare.length<2} onClick={()=>setShowCompare(true)}>선택한 휴게소 비교 <ArrowRight size={15}/></button></div></aside>}{selectedShelter&&<ShelterDetail shelter={selectedShelter} apiKey={status?.publicMapKey} onClose={()=>setSelectedShelter(null)}/>} {selected&&<RestAreaDetail key={selected.id} area={displayData?.rows.find(area=>area.id===selected.id)||selected} apiKey={status?.publicMapKey} onClose={()=>setSelected(null)}/>} {showCompare&&<RestAreaCompare areas={compare} mapAreas={compare.map(selected=>displayData?.rows.find(area=>area.id===selected.id)||selected)} apiKey={status?.publicMapKey} onClose={()=>setShowCompare(false)}/>}</>
}
