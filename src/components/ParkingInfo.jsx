import { SquareParking } from 'lucide-react'
export const parkingCount = value => value == null ? '정보 없음' : `${value.toLocaleString('ko-KR')}면`
export default function ParkingInfo({ parking }) {
  const groups = parking ? [{ label: '소형', value: parking.small, color: '#278c86' }, { label: '대형', value: parking.large, color: '#4461b7' }, { label: '장애인 전용', value: parking.accessible, color: '#c89436' }] : []
  const valid = groups.every(group => typeof group.value === 'number' && Number.isFinite(group.value) && group.value >= 0)
  const composition = valid && parking?.total > 0 && groups.reduce((sum, group) => sum + group.value, 0) === parking.total
  let offset = 0
  return <section className="parking-info" aria-label="휴게소 주차장 현황"><header className="parking-heading"><h3><SquareParking size={19} aria-hidden="true" />주차장 현황</h3><span>공식 등록 주차면</span></header>{parking ? <>
    <div className="parking-visual"><div className="parking-chart">
      <svg viewBox="0 0 144 144" role="img" aria-label={composition ? groups.map(group => `${group.label} ${parkingCount(group.value)}`).join(', ') : '주차면 구성 비율 정보 없음'}><circle cx="72" cy="72" r="56" fill="none" stroke="#e7edf1" strokeWidth="13" />{composition && groups.filter(group => group.value > 0).map(group => {
        const percent = group.value / parking.total * 100, start = offset
        offset += percent
        return <circle key={group.label} cx="72" cy="72" r="56" fill="none" stroke={group.color} strokeWidth="13" pathLength="100" strokeDasharray={`${percent} ${100-percent}`} strokeDashoffset={-start} transform="rotate(-90 72 72)" />
      })}</svg><div className="parking-total"><span>전체 주차면</span><strong>{parkingCount(parking.total)}</strong></div>
    </div><dl className="parking-breakdown">{groups.map(group => <div key={group.label}><dt><i style={{ background: group.color }} />{group.label}</dt><dd>{parkingCount(group.value)}{composition && <small>{(group.value / parking.total * 100).toFixed(1)}%</small>}</dd></div>)}</dl></div>
    {!composition && parking.total !== 0 && <p>주차면 구성 비율은 확인되지 않았습니다.</p>}
    <p className="source-line"><a href={parking.sourceUrl} target="_blank" rel="noreferrer">{parking.source}</a> · {parking.asOf} 기준</p><p>현재 빈자리 수가 아닌 등록된 주차장 규모입니다.</p>
  </> : <p>이 휴게소에 연결되는 주차장 자료를 확인하지 못했습니다.</p>}</section>
}
