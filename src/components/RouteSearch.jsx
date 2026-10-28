import { RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { request } from '../services/api'
import PlaceField from './PlaceField'
import { Search, Swap, Route } from './Icons'
export default function RouteSearch({ onRoute, currentRoute }) {
  const [origin, setOrigin] = useState(null), [destination, setDestination] = useState(null), [loading, setLoading] = useState(false), [error, setError] = useState('')
  const controllerRef = useRef(null)
  const [resetVersion,setResetVersion]=useState(0)
  function reset(){controllerRef.current?.abort();setOrigin(null);setDestination(null);setLoading(false);setError('');setResetVersion(value=>value+1);onRoute(null)}
  useEffect(() => () => controllerRef.current?.abort(), [])
  function change(setter, point) { controllerRef.current?.abort(); setter(point); setLoading(false); setError(''); onRoute(null) }
  async function submit(event) {
    event.preventDefault()
    if (!origin || !destination) { setError('각 입력창의 검색 버튼을 누른 뒤 검색 결과에서 장소를 선택해 주세요.'); return }
    controllerRef.current?.abort(); const controller = new AbortController(); controllerRef.current = controller
    setLoading(true); setError(''); onRoute(null)
    try { const result = await request('route', { origin: `${origin.lng},${origin.lat}`, destination: `${destination.lng},${destination.lat}` }, controller.signal); if(!controller.signal.aborted)onRoute({ ...result, origin, destination }) }
    catch (e) { if (e.name !== 'AbortError') setError(e.message) }
    finally { if (!controller.signal.aborted) setLoading(false) }
  }
  return <section className="route-search"><div className="route-search-heading"><div><h2>나의 이동 경로 찾기</h2><p>주소 또는 장소명을 검색하고, 검색 결과에서 장소를 선택하세요.</p></div><div className="route-heading-actions"><span className="small-badge"><Route size={12} /> 자동차 기준</span><button type="button" className="route-reset" onClick={reset}><RotateCcw size={14}/>처음 화면</button></div></div><form className="route-form" onSubmit={submit}><PlaceField key={`origin:${resetVersion}`} label="출발지" variant="origin" point={origin} onChange={point => change(setOrigin, point)} /><button className="swap-button" type="button" aria-label="선택한 출발지와 목적지 바꾸기" disabled={!origin || !destination} onClick={() => { controllerRef.current?.abort(); setOrigin(destination); setDestination(origin); setLoading(false); setError(''); onRoute(null) }}><Swap size={18} /></button><PlaceField key={`destination:${resetVersion}`} label="도착지" variant="destination" point={destination} onChange={point => change(setDestination, point)} /><button type="submit" className="button primary" disabled={loading}><Search size={18} /> {loading ? '경로 조회 중…' : '경로 검색'}</button></form>{error && <p className="form-error" role="alert">{error}</p>}{currentRoute && <div className="route-result" role="status"><strong>{currentRoute.origin.name} → {currentRoute.destination.name}</strong><span>{currentRoute.distance == null ? '거리 정보 없음' : `${(currentRoute.distance / 1000).toFixed(1)} km`}</span><span>{currentRoute.duration == null ? '시간 정보 없음' : `${Math.floor(Math.ceil(currentRoute.duration/60)/60)}시간 ${Math.ceil(currentRoute.duration/60)%60}분`}</span><small>출처: 카카오모빌리티 · 예상 소요시간</small></div>}</section>
}
