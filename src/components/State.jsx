import { Info, Refresh } from './Icons'
export default function State({ loading, error, title, children, onRetry }) {
  return <div className={`state ${error ? 'is-error' : ''}`} role={error ? 'alert' : 'status'}><span className={`state-icon ${loading ? 'loading' : ''}`}>{loading ? <Refresh size={24} /> : <Info size={24} />}</span><h3>{loading ? '공공데이터를 불러오고 있습니다' : title || (error ? '정보를 불러오지 못했습니다' : '표시할 정보가 없습니다')}</h3><p>{error || children}</p>{onRetry && !loading && <button className="button secondary" onClick={onRetry}><Refresh size={15} /> 다시 불러오기</button>}</div>
}
