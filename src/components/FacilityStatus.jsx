import { Accessibility, Bus, Check, CircleHelp, Coffee, Fuel, Minus, Moon, Wrench } from 'lucide-react'
import { date } from '../services/api'
const icons = { convenience: Coffee, rest: Moon, vehicle: Wrench, access: Accessibility, transfer: Bus }
const states = { present: ['있음', Check], absent: ['없음', Minus], unknown: ['정보 미상', CircleHelp] }
export default function FacilityStatus({ data, onRetry }) {
  return <section className="facility-status">
    <div className="facility-intro"><h3>휴게소 시설 안내</h3><p>‘정보 미상’은 공식 자료에서 확인되지 않은 항목입니다.</p>
      <div className="facility-legend">{Object.entries(states).map(([key, [label, Icon]]) => <span key={key} className={`facility-state ${key}`}><Icon size={14} aria-hidden="true" />{label}</span>)}</div>
    </div>
    {data.sources.facilities?.status === 'error' && <p className="form-error">편의시설 정보를 불러오지 못했습니다. <button className="text-button" onClick={onRetry}>다시 조회</button></p>}
    <div className="facility-status-grid">{(data.facilityGroups || []).map(group => {
      const Icon = icons[group.id]
      return <article className="facility-group" key={group.id}><h4><Icon size={19} aria-hidden="true" />{group.title}</h4><ul>{group.items.map(item => {
        const [label, StatusIcon] = states[item.status]
        return <li key={item.id}><div><strong>{item.label}</strong>{item.source && <small>{item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.source}</a> : item.source}{item.asOf ? ` · ${item.asOf} 기준` : item.checkedAt ? ` · 확인 ${item.checkedAt}` : ''}</small>}{item.description && <details><summary>시설 안내</summary><p>{item.description}</p>{item.updatedAt && <small>등록 수정일 {item.updatedAt}</small>}</details>}</div><span className={`facility-state ${item.status}`}><StatusIcon size={14} aria-hidden="true" />{label}</span></li>
      })}</ul></article>
    })}</div>
    <p className="source-line">자료에 등록된 시설 기준이며, 목록에 없는 항목을 ‘없음’으로 판단하지 않습니다.</p>
    <details className="linked-oil"><summary><Fuel size={17} aria-hidden="true" /> 연결된 주유소 편의시설 {data.oilFacilities.length}건</summary>
      {data.sources.oilFacilities?.status === 'error' ? <p className="form-error">{data.sources.oilFacilities.message}</p> : data.oilFacilities.length ? <>
        <p>{data.sources.oilFacilities.matchedName} · 노선·방향 포함 명칭 대조</p>
        <div className="detail-items">{data.oilFacilities.map((row, i) => <article key={i}><h4>{row.name}</h4><p>{row.description || '상세 안내 없음'}</p></article>)}</div>
      </> : <p>같은 노선·방향으로 연결되는 주유소 시설 자료가 없습니다.</p>}
    </details>
    {data.sources.facilities?.fetchedAt && <p className="source-line">한국도로공사 편의시설 · 조회 {date(data.sources.facilities.fetchedAt)}</p>}
  </section>
}
