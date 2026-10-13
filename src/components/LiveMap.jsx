import { useEffect, useRef, useState } from 'react'
import { Pin, Layers, Info } from './Icons'

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
export default function LiveMap({ apiKey, route, areas, onSelect, selectedId }) {
  const host = useRef(null), mapRef = useRef(null), objects = useRef([])
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
    let bounded = false
    for (const road of route?.paths || []) {
      const path = road.points.map(point => new maps.LatLng(point.lat, point.lng))
      path.forEach(point => { bounds.extend(point); bounded = true })
      const line = new maps.Polyline({ map, path, strokeWeight: 5, strokeColor: '#087f81', strokeOpacity: .9 })
      objects.current.push(line)
    }
    for (const area of areas.filter(area => area.coordinates)) {
      const point = new maps.LatLng(area.coordinates.lat, area.coordinates.lng)
      const marker = new maps.Marker({ map, position: point, title: area.name })
      maps.event.addListener(marker, 'click', () => onSelect(area))
      objects.current.push(marker)
      if (!route) { bounds.extend(point); bounded = true }
      if (area.id === selectedId) map.panTo(point)
    }
    if (bounded && !selectedId) map.setBounds(bounds)
  }, [ready, route, areas, onSelect, selectedId])
  return <section className="map-pane" aria-label="자동차 경로 및 휴게소 지도"><div className="map-toolbar"><span><Layers size={16} /> 경로 지도</span><span className={`small-badge ${ready ? 'success' : ''}`}>{ready ? `Kakao Maps · 위치 ${areas.filter(area=>area.coordinates).length}곳` : '지도 연결 대기'}</span></div><div ref={host} className="map-canvas" />{!ready && <div className="map-state"><div className="map-grid" aria-hidden="true" /><div className="map-message"><span className="map-message-icon"><Pin size={31} /></span><h3>{error ? '지도 연결을 확인해 주세요' : apiKey ? '지도를 불러오는 중입니다' : '여행의 경로를 한눈에'}</h3><p>{error || (apiKey ? '잠시만 기다려 주세요.' : '지도 서비스 연결 후 실제 자동차 경로와\n공식 주소에서 확인한 휴게소 위치를 표시합니다.')}</p>{error && <button className="button secondary" onClick={() => setRetry(value => value + 1)}>다시 연결</button>}<span className="map-state-caption"><Info size={13} /> 실제 지도 연결 전 안내 화면</span></div></div>}<div className="map-legend"><span><i /> 자동차 이동 경로</span><span><Pin size={13} /> 주소 기반 위치 · 진입로 아님</span></div></section>
}
