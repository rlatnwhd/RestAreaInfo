import { useMemo } from 'react'
import { ArrowRight } from './Icons'
import HighwayIcon from './HighwayIcon'
import RoadBadge from './RoadBadge'
import State from './State'
import { roadOptions } from '../utils/roadRoutes'
import { directionGroups, directionLabel } from '../utils/directionGroups'

function displayName(name) {
  const base = name.replace(/\([^)]*\)/g, '')
  const special = { '남해2지선': '남해고속도로 제2지선', '호남지선': '호남고속도로 지선', '중부내륙지선': '중부내륙고속도로 지선' }
  return special[base] || base.replace(/선$/, '고속도로')
}
export default function HighwayRoutes({ data, loading, error, onRetry, onBrowse, embedded = false }) {
  const areas = data?.rows || []
  const routes = useMemo(() => roadOptions(areas).map(road => ({ ...road, count: areas.filter(area => area.routeName === road.value).length, groups: directionGroups(areas, road.value) })), [data])
  const Heading = embedded ? 'h2' : 'h1'
  return <section className="highway-routes content-panel" aria-labelledby="highway-routes-title">
    <div className="highway-routes-heading"><div><span className="eyebrow">HIGHWAY DIRECTORY</span><Heading id="highway-routes-title">노선별 고속도로 <span>{data ? routes.length : '—'}</span></Heading><p>이용할 노선과 방향을 골라 휴게소를 확인하세요.</p></div><span className="highway-routes-total">등록 휴게소 <strong>{data?.count?.toLocaleString() || '—'}</strong>곳</span></div>
    {loading || error ? <State loading={loading} error={error} onRetry={onRetry} /> : !routes.length ? <State title="등록된 노선이 없습니다" /> : <div className="highway-route-grid">{routes.map(road => {
      const section = road.name.match(/\(([^)]+)\)/)?.[1]
      return <article className="highway-route-card" key={road.value}>
        <header><RoadBadge type={road.type} number={road.number} /><div><h2>{displayName(road.name)}</h2><p>{section ? `${section} 구간 · ` : ''}{road.number ? `노선 ${road.number}번 · ` : ''}휴게소 {road.count}곳</p></div></header>
        <div className="highway-route-directions">{road.groups.map(group => <button key={group.direction} onClick={() => onBrowse({ routeName: road.value, direction: group.direction })} aria-label={`${road.name} ${directionLabel(group.direction)} 휴게소 ${group.count}곳 보기`}><HighwayIcon /><span>{directionLabel(group.direction)}</span><small>{group.count}곳</small><ArrowRight size={15} /></button>)}</div>
      </article>
    })}</div>}
    <p className="source-line">등록 자료의 노선·구간 기준입니다. 양방향 휴게소는 각 방향 목록에 함께 포함됩니다.</p>
  </section>
}
