import highway from '../../icons/highway-sign.png'
import ellipse from '../../icons/ellipse.png'
export default function RoadBadge({ type, number }) {
  if (!number || !['expressway', 'national'].includes(type)) return null
  return <span className={`road-badge ${type} ${String(number).length >= 3 ? 'long-number' : ''}`} role="img" aria-label={`${type === 'expressway' ? '고속국도' : '일반국도'} ${number}호선`}>
    <img src={type === 'expressway' ? highway : ellipse} alt="" /><span aria-hidden="true">{number}</span>
  </span>
}
