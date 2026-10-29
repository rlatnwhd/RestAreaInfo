import shelterIcon from '../../icons/shelter-pin.svg'
import { LocateFixed, ExternalLink, Camera, Map as MapIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Pin, Layers, Info } from './Icons'
import restAreaIcon from '../../icons/food.png'
import restAreaPin from '../../icons/rest-area-pin.svg'

let sdkPromise
function loadSdk(key) {
  if (window.kakao?.maps?.Map) return Promise.resolve(window.kakao.maps)
  if (sdkPromise) return sdkPromise
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false`
    script.async = true
    const timer = setTimeout(() => { reject(new Error('지도 연결이 지연되고 있습니다. 등록 도메인과 키를 확인해 주세요.')); script.remove() }, 15000)
    script.onload = () => { clearTimeout(timer); if (!window.kakao?.maps) { reject(new Error('지도 서비스 권한을 확인해 주세요.')); return } window.kakao.maps.load(() => resolve(window.kakao.maps)) }
    script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error('지도를 불러오지 못했습니다. 네트워크와 지도 키를 확인해 주세요.')) }
    document.head.appendChild(script)
  }).catch(e => { sdkPromise = null; throw e })
  return sdkPromise
}
export default function LiveMap({ apiKey, route, areas, onSelect, selectedId, showLabels = false, title = '경로 지도', locationOnly = false, onReset, pointsLoading = false, pointsError = '', onRetryPoints }) {
  const host = useRef(null), mapRef = useRef(null), objects = useRef([]), viewport = useRef({ map: null, route: null, fitted: false, selectedId: null })
  const roadviewHost=useRef(null)
  const [streetView,setStreetView]=useState(false), [streetStatus,setStreetStatus]=useState('')
  const target=areas.find(area=>area.id===selectedId&&area.coordinates)||areas.find(area=>area.coordinates)
  function resetPosition(){
    setStreetView(false);onReset?.()
    const maps=window.kakao?.maps,map=mapRef.current
    if(!maps||!map)return
    const bounds=new maps.LatLngBounds()
    areas.filter(area=>area.coordinates).forEach(area=>bounds.extend(new maps.LatLng(area.coordinates.lat,area.coordinates.lng)))
    map.setBounds(bounds)
    if(areas.filter(area=>area.coordinates).length===1)map.setLevel?.(5)
  }
  const [ready, setReady] = useState(false), [error, setError] = useState(''), [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setError(''); setReady(false)
    if (!apiKey) return
    loadSdk(apiKey).then(maps => {
      if (!active || !host.current) return
      mapRef.current = new maps.Map(host.current, { center: new maps.LatLng(36.5, 127.8), level: 13 })
      setReady(true)
    }).catch(e => { if (active) setError(e.message) })
    const observer = new ResizeObserver(() => mapRef.current?.relayout())
    if (host.current) observer.observe(host.current)
    return () => { active = false; observer.disconnect(); objects.current.forEach(object => object.setMap(null)); objects.current = []; mapRef.current = null }
  }, [apiKey, retry])
  useEffect(() => {
    if (!ready || !mapRef.current) return
    const maps = window.kakao.maps, map = mapRef.current, bounds = new maps.LatLngBounds()
    objects.current.forEach(object => object.setMap(null)); objects.current = []
    if (viewport.current.map !== map) viewport.current = { map, route: null, fitted: false, selectedId: null }
    const previous = viewport.current
    let bounded = false
    for (const road of route?.paths || []) {
      const path = road.points.map(point => new maps.LatLng(point.lat, point.lng))
      path.forEach(point => { bounds.extend(point); bounded = true })
      const line = new maps.Polyline({ map, path, strokeWeight: 5, strokeColor: '#087f81', strokeOpacity: .9 })
      objects.current.push(line)
    }
    for (const area of areas.filter(area => area.coordinates)) {
      const point = new maps.LatLng(area.coordinates.lat, area.coordinates.lng)
      const isShelter=area.kind==='shelter'
      const width = area.id === selectedId ? 56 : 48
      const height = area.id === selectedId ? 74 : 64
      const image = new maps.MarkerImage(isShelter?shelterIcon:restAreaPin, new maps.Size(width, height), { offset: new maps.Point(width / 2, height) })
      const marker = new maps.Marker({ map, position: point, title: area.name, image, zIndex: area.id === selectedId ? 10 : 1 })
      maps.event.addListener(marker, 'click', () => onSelect?.(area))
      objects.current.push(marker)
      if (showLabels) {
        const label=document.createElement('button')
        label.type='button';label.className='location-map-label'
        label.textContent=area.name
        label.onclick=()=>onSelect?.(area)
        const overlay=new maps.CustomOverlay({map,position:point,content:label,yAnchor:1,zIndex:area.id===selectedId?12:3})
        objects.current.push(overlay)
      }
      if (!route) { bounds.extend(point); bounded = true }
      if (area.id === selectedId && previous.selectedId !== selectedId) map.panTo(point)
    }
    if (bounded && !selectedId && (!previous.fitted || previous.route !== route)) { map.setBounds(bounds); if (!route && areas.filter(area=>area.coordinates).length===1) map.setLevel?.(5); previous.fitted = true; previous.route = route }
    previous.selectedId = selectedId
  }, [ready, route, areas, onSelect, selectedId, showLabels])
  useEffect(()=>{
    if(!streetView||!ready||!target||!roadviewHost.current)return
    let active=true
    setStreetStatus('거리뷰를 불러오는 중입니다…')
    const timer=setTimeout(()=>{if(active)setStreetStatus('거리뷰 연결이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.')},12000)
    try {
      const maps=window.kakao.maps, point=new maps.LatLng(target.coordinates.lat,target.coordinates.lng)
      const view=new maps.Roadview(roadviewHost.current),client=new maps.RoadviewClient()
      client.getNearestPanoId(point,150,panoId=>{
        if(!active)return
        clearTimeout(timer)
        if(!panoId){setStreetStatus('이 위치 주변에는 제공되는 거리뷰가 없습니다.');return}
        view.setPanoId(panoId,point);setStreetStatus('')
      })
    }catch{clearTimeout(timer);setStreetStatus('거리뷰를 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.')}
    return()=>{active=false;clearTimeout(timer)}
  },[streetView,ready,target?.id,target?.coordinates?.lat,target?.coordinates?.lng])
  return <section className={`map-pane ${locationOnly?'location-only':''} ${streetView?'is-roadview':''}`} aria-label="휴게소 위치 지도">{!locationOnly&&<div className="map-toolbar"><span><Layers size={16} /> {title}</span><span className={`small-badge ${ready ? 'success' : ''}`}>{ready ? pointsLoading?'쉼터 위치 불러오는 중':pointsError?'위치 조회 확인 필요':`Kakao Maps · 위치 ${areas.filter(area=>area.coordinates).length}곳` : '지도 연결 대기'}</span></div>}<div ref={host} className="map-canvas" />{ready&&!locationOnly&&(pointsLoading||pointsError)&&<div className={`map-points-status ${pointsError?'is-error':''}`} role={pointsError?'alert':'status'} aria-live="polite">{pointsLoading?<><span className="pin-loading-spinner" aria-hidden="true"/><span>{areas.some(area=>area.coordinates)?`위치 ${areas.filter(area=>area.coordinates).length}곳 표시 · 추가 위치 확인 중…`:'지도는 준비됐습니다. 쉼터 위치를 불러오고 있습니다…'}</span></>:<><span>위치를 불러오지 못했습니다.</span><button type="button" onClick={onRetryPoints}>다시 조회</button></>}</div>}{!ready && <div className="map-state"><div className="map-grid" aria-hidden="true" /><div className="map-message"><span className="map-message-icon"><Pin size={31} /></span><h3>{error ? '지도 연결을 확인해 주세요' : apiKey ? '지도를 불러오는 중입니다' : '여행의 경로를 한눈에'}</h3><p>{error || (apiKey ? '잠시만 기다려 주세요.' : '지도 서비스 연결 후 실제 자동차 경로와\n공식 주소에서 확인한 휴게소 위치를 표시합니다.')}</p>{error && <button className="button secondary" onClick={() => setRetry(value => value + 1)}>다시 연결</button>}<span className="map-state-caption"><Info size={13} /> 실제 지도 연결 전 안내 화면</span></div></div>}{!locationOnly&&<div className="map-legend">{!locationOnly&&<span><i /> 자동차 이동 경로</span>}<span><img src={restAreaIcon} width="18" height="18" alt="" /> 휴게소 · 주소 기반 위치</span>{areas.some(area=>area.kind==='shelter')&&<span><img src={shelterIcon} width="18" height="18" alt=""/>졸음쉼터</span>}</div>}{locationOnly&&<>
      {streetView&&<div className="location-roadview"><div ref={roadviewHost} className="location-roadview-canvas" aria-label={`${target?.name||'휴게소'} 거리뷰`}/>{streetStatus&&<p className="roadview-status" role="status">{streetStatus}</p>}</div>}
      <div className="location-map-actions">
        <button type="button" onClick={resetPosition} disabled={!ready}><LocateFixed size={15}/>원래 위치</button>
        {target&&<a href={`https://map.kakao.com/link/map/${encodeURIComponent(target.name)},${target.coordinates.lat},${target.coordinates.lng}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/>카카오맵에서 보기</a>}
        <button type="button" onClick={()=>setStreetView(value=>!value)} disabled={!ready||!target} aria-pressed={streetView}>{streetView?<MapIcon size={15}/>:<Camera size={15}/>} {streetView?'지도 보기':'거리뷰'}</button>
      </div>
    </>}</section>
}
