import RoadSelect from './RoadSelect'
import { roadOptions } from '../utils/roadRoutes'
import { useMemo, useState } from 'react'
import { Route, ArrowRight } from './Icons'
import { directionGroups, directionLabel } from '../utils/directionGroups'

export default function HighwayPicker({ data, loading, error, onBrowse }) {
  const [chosenRoute,setChosenRoute]=useState(''),[direction,setDirection]=useState('')
  const areas=data?.rows||[]
  const options=useMemo(()=>roadOptions(areas),[data])
  const routes=options.map(option=>option.value)
  const routeName=routes.includes(chosenRoute)?chosenRoute:routes[0]||''
  const groups=useMemo(()=>directionGroups(areas,routeName),[data,routeName])
  const chosen=groups.find(group=>group.direction===direction)
  return <section className="highway-picker" aria-labelledby="highway-picker-title"><div className="highway-picker-heading"><span className="picker-icon"><Route size={24}/></span><div><h2 id="highway-picker-title">노선·방향으로 찾기</h2><p>이용할 고속도로와 방향을 선택하세요.</p></div></div><div className="picker-controls"><div className="picker-route"><span>고속도로</span><RoadSelect label="방향별 찾기 고속도로" value={routeName} options={options} disabled={loading||!routes.length} placeholder={loading?'노선 불러오는 중…':'노선 정보 없음'} onChange={value=>{setChosenRoute(value);setDirection('')}} /></div><fieldset className="picker-directions"><legend>가는 방향</legend><div>{groups.map(group=><label key={group.direction} className={direction===group.direction?'selected':''}><input type="radio" name="highway-direction" checked={direction===group.direction} value={group.direction} onChange={()=>setDirection(group.direction)}/><span>{directionLabel(group.direction)}</span><small>{group.count}곳</small></label>)}</div>{!groups.length&&<span className="picker-empty">{loading?'방향 정보를 불러오는 중입니다.':error?'휴게소 정보를 불러온 후 선택할 수 있습니다.':'방향 정보가 없습니다.'}</span>}</fieldset><button className="button primary picker-submit" disabled={!chosen||loading} onClick={()=>onBrowse({routeName,direction})}><span>{chosen?`휴게소 ${chosen.count}곳 보기`:'휴게소 보기'}</span><ArrowRight size={17}/></button></div><a className="picker-routes-link" href="#highways">노선별 고속도로 전체 보기 <ArrowRight size={14}/></a><p className="picker-footnote">공식 방향 정보 우선 · 양방향 휴게소는 각 방향 목록에 포함</p></section>
}
