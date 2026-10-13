import { useEffect, useRef, useState } from 'react'
import { request, price } from '../services/api'
import { Close } from './Icons'
import State from './State'
export default function RestAreaCompare({ areas, onClose }) {
  const dialog = useRef(null), [rows, setRows] = useState([]), [loading, setLoading] = useState(true)
  useEffect(() => { dialog.current?.showModal(); const controller = new AbortController(); Promise.all(areas.map(async area => { try { return { area, data: await request('rest-area', { id: area.id }, controller.signal) } } catch(e) { return { area, error: e.message } } })).then(result => { if (!controller.signal.aborted) { setRows(result); setLoading(false) } }); return () => { controller.abort(); dialog.current?.close() } }, [areas])
  function content(row, kind) {
    if (row.error) return row.error
    const source = row.data.sources[kind]
    if (source?.status === 'error') return source.message
    const list = row.data[kind]
    if (!list?.length) return kind === 'oilFacilities' ? '연결정보 없음' : '정보 없음'
    return <ul className="comparison-items">{list.map((item,index) => <li key={index}><span>{item.name}</span>{kind === 'menus' && <strong>{price(item.price)}</strong>}</li>)}</ul>
  }
  return <dialog ref={dialog} className="compare-dialog" onCancel={e => { e.preventDefault(); onClose() }} aria-labelledby="compare-title"><div className="dialog-header"><div><span className="eyebrow">COMPARE REST AREAS</span><h2 id="compare-title">휴게소 정보 비교</h2></div><button className="icon-button" aria-label="비교 화면 닫기" onClick={onClose}><Close size={23} /></button></div><div className="dialog-content">{loading ? <State loading /> : <div className="comparison-scroll"><table className="comparison-table"><thead><tr><th scope="col">비교 항목</th>{rows.map(row => <th scope="col" key={row.area.id}>{row.area.name}<small>{row.area.routeName}</small></th>)}</tr></thead><tbody>{[['menus','메뉴·가격'],['brands','입점 브랜드'],['oilFacilities','주유소 시설']].map(([kind,label]) => <tr key={kind}><th scope="row">{label}</th>{rows.map(row => <td key={row.area.id}>{content(row,kind)}</td>)}</tr>)}<tr><th scope="row">과거 통계</th>{rows.map(row => <td key={row.area.id}>공통 식별자 미확인 · 자동 연결 제외</td>)}</tr></tbody></table></div>}<p className="source-line">출처: 한국도로공사 · 전체 휴게소 목록에서 선택한 정보를 비교합니다. 동일 경로에서 이용 가능하다고 검증된 목록은 아닙니다.</p></div></dialog>
}
