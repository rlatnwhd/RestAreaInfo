import { useRef, useState } from 'react'
import { request } from '../services/api'
import { Search, Pin } from './Icons'

export default function PlaceField({ label, point, onChange, variant }) {
  const [query, setQuery] = useState(point?.name || '')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const sequence = useRef(0)
  const displayed = point ? point.name : query
  async function search() {
    if (!displayed.trim()) { setError('주소 또는 장소명을 입력해 주세요.'); return }
    const version = ++sequence.current
    setLoading(true); setError(''); setRows([])
    try { const result = await request('places', { query: displayed }); if (version === sequence.current) { setRows(result.rows); if (!result.rows.length) setError('검색 결과가 없습니다. 다른 장소명을 입력해 주세요.') } }
    catch (e) { if (version === sequence.current) setError(e.message) }
    finally { if (version === sequence.current) setLoading(false) }
  }
  return <div className="place-control"><label className={`place-box ${variant}`}><span className="point-dot" /><span className="place-label">{label}</span><input value={displayed} placeholder="주소 또는 장소명" aria-label={label} autoComplete="off" maxLength={100} onChange={e => { sequence.current++; setLoading(false); setQuery(e.target.value); onChange(null); setRows([]); setError('') }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); search() } }} /></label><button className="place-search" aria-label={`${label} 장소 검색`} type="button" disabled={loading} onClick={search}><Search size={18} /></button>{(loading || error || rows.length > 0) && <div className="place-results"><div role="status">{loading ? '장소 검색 중…' : error}</div>{rows.map(row => <button key={row.id} type="button" onClick={() => { setQuery(row.name); onChange(row); setRows([]); setError('') }}><Pin size={15} /><span><strong>{row.name}</strong><small>{row.address}</small></span></button>)}{rows.length > 0 && <button className="dismiss-results" type="button" onClick={() => setRows([])}>검색 결과 닫기</button>}</div>}</div>
}
