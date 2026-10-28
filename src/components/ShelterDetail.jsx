import {useEffect,useRef} from 'react'
import {Close,Pin} from './Icons'
import HighwayIcon from './HighwayIcon'
import RoadBadge from './RoadBadge'
import {shelterRoadOption} from '../utils/roadRoutes'
import LocationMap from './LocationMap'
export default function ShelterDetail({shelter,apiKey,onClose}) {
  const dialog=useRef(null)
  useEffect(()=>{dialog.current?.showModal();return()=>dialog.current?.close()},[])
  const name=shelter.name.includes('졸음쉼터')?shelter.name:`${shelter.name} 졸음쉼터`
  return <dialog ref={dialog} className="detail-dialog shelter-detail" onCancel={event=>{event.preventDefault();onClose()}} aria-labelledby="shelter-detail-title">
    <div className="dialog-header"><div><span className="eyebrow">{shelter.routeName}</span><h2 id="shelter-detail-title">{name}</h2></div><button className="icon-button" type="button" aria-label="졸음쉼터 상세정보 닫기" onClick={onClose}><Close size={23}/></button></div>
    <div className="dialog-content"><div className="shelter-detail-road"><RoadBadge {...shelterRoadOption(shelter.routeName)}/><strong>{shelter.routeName}</strong><span><HighwayIcon size={16}/>{shelter.direction||'방향 정보 없음'}</span></div>
      <dl className="basic-grid"><div><dt>진행방향</dt><dd>{shelter.direction||'정보 없음'}</dd></div><div><dt>노선 이정</dt><dd>{shelter.kilometer==null?'정보 없음':`${shelter.kilometer} km`}</dd></div><div><dt>설치연도</dt><dd>{shelter.installedYear==null?'정보 없음':`${shelter.installedYear}년`}</dd></div><div><dt>자료 기준일</dt><dd>2026.08.01</dd></div></dl>
      <LocationMap areas={[{...shelter,kind:'shelter',name:`${name} (${shelter.direction})`}]} apiKey={apiKey} pointEndpoint="shelter-point" placeType="졸음쉼터"/>
      <div className="inline-notice"><Pin size={16}/><p>이정은 해당 노선의 거리 기준점입니다. 현재 위치에서의 거리와 다릅니다. 진입방향은 현장 안내를 확인하세요.</p></div>
      <p className="source-line">출처: 한국도로공사 졸음쉼터 설치현황 · 위치: 카카오 장소 검색</p>
    </div>
  </dialog>
}
