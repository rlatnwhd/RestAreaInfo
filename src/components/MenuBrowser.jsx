import RoadSelect from './RoadSelect'
import HighwayIcon from './HighwayIcon'
import { roadOptions } from '../utils/roadRoutes'
import { directionGroups, directionLabel, matchesDirection } from '../utils/directionGroups'
import { useEffect, useMemo, useState } from 'react'
import { request, price, date } from '../services/api'
import { Search, Food, Refresh } from './Icons'
import State from './State'
export default function MenuBrowser({ areasData }) {
  const [route, setRoute] = useState(''), [direction, setDirection] = useState(''), [restId, setRestId] = useState(''), [applied, setApplied] = useState(null)
  const areas = areasData?.rows || []
  const routes = useMemo(() => roadOptions(areasData?.rows || []), [areasData])
  const directions = directionGroups(areas, route)
  const stops = areas.filter(area => area.routeName === route && matchesDirection(area, direction)).sort((a,b) => a.name.localeCompare(b.name, 'ko'))
  function searchStop(event) {
    event.preventDefault()
    const area = stops.find(row => row.id === restId)
    if (!area) return
    setApplied(area);  setQuery(''); setType('all');  setPage(1); setReload(value => value + 1)
  }
  const [data, setData] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(''), [reload, setReload] = useState(0)
  const [query, setQuery] = useState(''), [type, setType] = useState('all'), [page, setPage] = useState(1)
  useEffect(() => { const controller = new AbortController(); setLoading(true); setError(''); setData(null); request('menus', applied ? { id: applied.id } : {}, controller.signal).then(setData).catch(e => { if (e.name !== 'AbortError') setError(e.message) }).finally(() => { if (!controller.signal.aborted) setLoading(false) }); return () => controller.abort() }, [reload, applied])
  const rows = useMemo(() => (data?.rows || []).filter(row => `${row.name} ${row.restName} ${row.routeName}`.includes(query.trim()) && (type === 'all' || row[type])), [data, query, type])
  const pages = Math.max(1, Math.ceil(rows.length / 15))
  return <section className="content-panel"><div className="section-title"><div><h2>휴게소 음식 메뉴</h2><p>한국도로공사에 등록된 메뉴와 가격을 확인하세요.</p></div><span className="title-icon"><Food size={25} /></span></div><form className="menu-route-search" onSubmit={searchStop} aria-label="휴게소별 메뉴 찾기">
      <div className="menu-route-search-heading"><Food size={18}/><strong>휴게소별 메뉴 찾기</strong><span>노선 → 방향 → 휴게소</span></div>
      <div className="menu-route-fields">
        <div><label>1. 노선</label><RoadSelect label="음식 메뉴 노선" value={route} options={[{value:'',name:'노선 선택'}, ...routes]} onChange={value=>{setRoute(value);setDirection('');setRestId('')}}/></div>
        <div><label>2. 방향</label><RoadSelect label="음식 메뉴 방향" value={direction} icon={<HighwayIcon size={18}/>} disabled={!route} options={[{value:'',name:'방향 선택'}, ...directions.map(row=>({value:row.direction,name:directionLabel(row.direction)}))]} onChange={value=>{setDirection(value);setRestId('')}}/></div>
        <div><label>3. 휴게소</label><RoadSelect label="음식 메뉴 휴게소" value={restId} icon={<Food size={18}/>} disabled={!direction} options={[{value:'',name:'휴게소 선택'}, ...stops.map(area=>({value:area.id,name:area.name}))]} onChange={setRestId}/></div>
        <button type="submit" className="button primary" disabled={!restId}><Search size={17}/>메뉴 검색</button>
      </div>
    </form>
    {applied && <div className="menu-search-scope" role="status"><span><Food size={16}/><strong>{applied.name}</strong>의 음식 메뉴</span><button className="text-button" onClick={()=>{setApplied(null);setRoute('');setDirection('');setRestId('');setQuery('');setType('all');setPage(1)}}>전체 메뉴 보기</button></div>}
    <div className="filter-bar"><label className="search-field"><Search size={18} /><input value={query} onChange={e => { setQuery(e.target.value); setPage(1) }} placeholder="음식명, 휴게소, 노선을 검색하세요" aria-label="음식 메뉴 검색" /></label><div className="filter-chips">{[['all', '전체'], ['recommended', '추천'], ['best', '베스트'], ['premium', '프리미엄']].map(([id, name]) => <button key={id} className={type === id ? 'active' : ''} aria-pressed={type === id} onClick={() => { setType(id); setPage(1) }}>{name}</button>)}</div></div>{loading || error ? <State loading={loading} error={error} onRetry={() => setReload(value => value + 1)} /> : !rows.length ? <State title="표시할 메뉴가 없습니다">검색 조건을 변경하거나 등록 데이터를 확인해 주세요.</State> : <><p className="result-label">검색 결과 <strong>{rows.length.toLocaleString()}건</strong><button className="text-button" onClick={() => setReload(value => value + 1)}><Refresh size={13} /> 새로고침</button></p><div className="responsive-table"><table><thead><tr><th>메뉴</th><th>판매 휴게소</th><th>고속도로</th><th>메뉴 구분</th><th className="numeric">등록 가격</th></tr></thead><tbody>{rows.slice((page - 1) * 15, page * 15).map((row, index) => <tr key={`${row.id}:${index}`}><td data-label="메뉴"><strong>{row.name}</strong>{row.description && <small>{row.description}</small>}</td><td data-label="휴게소">{row.restName || '정보 없음'}</td><td data-label="고속도로">{row.routeName || '정보 없음'}</td><td data-label="구분"><span className="small-badge">{row.premium ? '프리미엄' : row.best ? '베스트' : row.recommended ? '추천' : '일반'}</span></td><td className="numeric" data-label="가격"><strong className="price">{price(row.price)}</strong></td></tr>)}</tbody></table></div><div className="pagination"><button disabled={page <= 1} onClick={() => setPage(value => value - 1)}>이전</button><span>{page} / {pages}</span><button disabled={page >= pages} onClick={() => setPage(value => value + 1)}>다음</button></div></>}<div className="source-line">출처: 한국도로공사 휴게소 푸드메뉴 현황 {data && `· 조회 시각 ${date(data.fetchedAt)}`}<br />등록 가격은 현장 가격과 다를 수 있습니다.</div></section>
}
