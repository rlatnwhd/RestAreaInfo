import LocationMap from './LocationMap'
﻿import { parkingCount } from './ParkingInfo'
import { useEffect, useRef, useState } from 'react'
import { request, price } from '../services/api'
import { Close } from './Icons'
import State from './State'
import { commonMenus, orderedMenus, metricWinner } from '../utils/comparison'
export default function RestAreaCompare({ areas, onClose, apiKey, mapAreas = areas }) {
  const dialog = useRef(null), [rows, setRows] = useState([]), [loading, setLoading] = useState(true)
  useEffect(() => { dialog.current?.showModal(); const controller = new AbortController(); setLoading(true); Promise.all(areas.map(async area => { try { return { area, data: await request('rest-area', { id: area.id }, controller.signal) } } catch(e) { return { area, error: e.message } } })).then(result => { if (!controller.signal.aborted) { setRows(result); setLoading(false) } }); return () => { controller.abort(); dialog.current?.close() } }, [areas])
  const common = commonMenus(rows)
  function menuLine(item, winner=false) {
    return <><span>{item.name}</span><span className={winner?'comparison-value is-winner':'comparison-value'}>{winner&&<small className="comparison-award">최저가</small>}<strong>{price(item.price)}</strong></span></>
  }
  function content(row, kind, index) {
    if (row.error) return row.error
    const source = row.data.sources?.[kind]
    if (source?.status === 'error') return source.message
    if(kind==='menus') {
      const {other}=orderedMenus(row,index,common)
      if(!row.data.menus?.length&&!common.length)return '정보 없음'
      return <>{common.length>0&&<><p className="comparison-section-label">같은 음식 · {common.length}종</p><ul className="comparison-items common-menu-items">{common.map(group=>{
        const item=group.stops.get(index)
        return <li key={group.key}>{item?menuLine(item,group.min<group.max&&item.price===group.min):<><span>{[...group.stops.values()][0].name}</span><span className="comparison-missing">등록 정보 없음</span></>}</li>
      })}</ul></>}{other.length>0&&<><p className="comparison-section-label">{common.length?'그 외 메뉴 · 가격 높은 순':'메뉴 · 가격 높은 순'}</p><ul className="comparison-items">{other.map((item,i)=><li key={i}>{menuLine(item)}</li>)}</ul></>}</>
    }
    const list=row.data[kind]
    if(!list?.length)return kind==='oilFacilities'?'연결정보 없음':'정보 없음'
    return <ul className="comparison-items">{list.map((item,index)=><li key={index}><span>{item.name||item.psName}</span></li>)}</ul>
  }
  function metric(index,value,format,getValue,getPeriod) {
    const winner=metricWinner(rows,index,getValue,getPeriod)
    return <span className={winner?'comparison-metric is-winner':'comparison-metric'} title={winner?'비교 대상 중 가장 많은 값':undefined}><strong>{format(value)}</strong></span>
  }
  const stats=(index,key,yearKey,unit)=>{
    const stats=rows[index].data.visitorStats
    return <div className="comparison-stat"><div className="comparison-stat-label"><span>{key==='visitors'?'일평균 이용객':'일평균 통행량'}</span><small>{stats[yearKey]}년</small></div>{metric(index,stats[key],value=>value==null?'정보 없음':<>{value.toLocaleString()}<span className="comparison-unit">{unit}/일</span></>,row=>row.data?.visitorStats?.[key],row=>row.data?.visitorStats?.[yearKey])}</div>
  }
  return <dialog ref={dialog} className="compare-dialog" onCancel={e=>{e.preventDefault();onClose()}} aria-labelledby="compare-title">
    <div className="dialog-header"><h2 id="compare-title">휴게소 정보 비교</h2><button className="icon-button" aria-label="비교 화면 닫기" onClick={onClose}><Close size={23}/></button></div>
    <div className="dialog-content"><LocationMap areas={mapAreas} apiKey={apiKey} comparison/><p className="comparison-guide">같은 이름의 음식은 위에 모았습니다. 낮은 가격은 <b>최저가</b>, 주차면·이용량이 많은 값은 <b>진한 초록색과 굵은 숫자</b>로 표시합니다.</p>
      {loading?<State loading/>:<div className="comparison-scroll"><table className="comparison-table"><thead><tr><th scope="col">비교 항목</th>{rows.map(row=><th scope="col" key={row.area.id}>{row.area.name}<small>{row.area.routeName}</small></th>)}</tr></thead><tbody>
        {[['menus','메뉴·가격'],['brands','입점 브랜드'],['facilities','휴게소 시설'],['oilFacilities','연결 주유소 시설']].map(([kind,label])=><tr key={kind}><th scope="row">{label}</th>{rows.map((row,index)=><td key={row.area.id}>{content(row,kind,index)}</td>)}</tr>)}
        <tr><th scope="row">주차장</th>{rows.map((row,index)=><td key={row.area.id}>{row.data?.parking?<section className="comparison-parking"><div className="comparison-parking-total"><span className="comparison-stat-label">전체 주차면</span>{metric(index,row.data.parking.total,value=>value==null?'정보 없음':<>{value.toLocaleString()}<span className="comparison-unit">면</span></>,other=>other.data?.parking?.total,other=>other.data?.parking?.asOf)}</div><dl className="comparison-parking-details">{[['small','소형'],['large','대형'],['accessible','장애인 전용']].map(([key,label])=><div key={key}><dt>{label}</dt><dd>{metric(index,row.data.parking[key],parkingCount,other=>other.data?.parking?.[key],other=>other.data?.parking?.asOf)}</dd></div>)}</dl><small className="comparison-date">{row.data.parking.asOf} 기준</small></section>:'연결된 주차장 정보 없음'}</td>)}</tr>
        <tr><th scope="row">과거 통계</th>{rows.map((row,index)=><td key={row.area.id}>{row.data?.visitorStats?<>{stats(index,'visitors','visitorYear','명')}{stats(index,'traffic','trafficYear','대')}</>:row.data?.sources?.statistics?.status==='error'?'통계 조회 실패':'연결되는 통계 없음'}</td>)}</tr>
      </tbody></table></div>}
      <p className="source-line">출처: 한국도로공사 · 주차면은 같은 기준일, 통계는 같은 연도끼리 비교합니다.<br/>같은 음식은 공백을 제외한 메뉴명이 같은 경우이며 양·구성은 다를 수 있습니다. 같은 휴게소에 동일 이름이 여러 건이면 가장 낮은 가격을 상단에서 비교합니다.<br/>동일 경로에서 이용 가능하다고 검증된 목록은 아닙니다.</p>
    </div>
  </dialog>
}
