import State from './State'
import { date } from '../services/api'
const count = (value, unit) => value == null ? '정보 없음' : `${value.toLocaleString('ko-KR')}${unit}`
export default function AreaStatistics({ data, onRetry }) {
  const row = data.visitorStats, source = data.sources.statistics
  if (source?.status === 'error') return <State error={source.message} onRetry={onRetry} />
  if (!row) return <State title="연결되는 과거 통계가 없습니다">같은 노선과 방향의 휴게소 통계를 확인하지 못했습니다.</State>
  return <section className="area-statistics"><h3>과거 이용객·교통량</h3><p>항목별 조사연도가 다릅니다. 실시간 혼잡도 정보가 아닙니다.</p>
    <div className="area-stat-values"><article><span>1일 이용객 · {row.visitorYear}년</span><strong>{count(row.visitors, '명/일')}</strong></article><article><span>1일 차량 통행량 · {row.trafficYear}년</span><strong>{count(row.traffic, '대/일')}</strong></article></div>
    <dl className="basic-grid"><div><dt>통계상 휴게소</dt><dd>{row.name}</dd></div><div><dt>노선</dt><dd>{row.routeName}</dd></div><div><dt>통계상 소재지</dt><dd>{row.address || '정보 없음'}</dd></div></dl>
    <p className="source-line">노선·방향을 포함한 명칭이 일치하는 통계입니다. <a href="https://www.data.go.kr/data/15118977/fileData.do" target="_blank" rel="noreferrer">한국도로공사 이용객 및 교통량 현황</a> · {source.datasetDate} 기준 · 조회 {date(source.fetchedAt)}</p>
  </section>
}
