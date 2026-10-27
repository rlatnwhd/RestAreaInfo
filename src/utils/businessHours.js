const koreaClock = new Intl.DateTimeFormat('en-GB', { timeZone:'Asia/Seoul', hourCycle:'h23', hour:'2-digit', minute:'2-digit', second:'2-digit' })
function minutes(value, allow24=false) {
  const match=String(value||'').trim().match(/^(\d{1,2}):(\d{2})$/)
  if(!match)return null
  const hour=Number(match[1]),minute=Number(match[2])
  if(minute>59||hour>23&&!(allow24&&hour===24&&minute===0))return null
  return hour*60+minute
}
export function businessStatus(start,end,now=new Date()) {
  const open=minutes(start),close=minutes(end,true)
  if(open===null||close===null||!Number.isFinite(now.getTime()))return {kind:'unknown',label:'시간 확인 필요'}
  if(open===0&&close===1440)return {kind:'open',label:'영업 중',allDay:true}
  // Equal times alone do not establish that the shop operates around the clock.
  if(open===close)return {kind:'unknown',label:'시간 확인 필요'}
  const clock=Object.fromEntries(koreaClock.formatToParts(now).map(part=>[part.type,part.value]))
  const current=Number(clock.hour)*60+Number(clock.minute)+Number(clock.second)/60
  const overnight=close<open
  const isOpen=overnight?current>=open||current<close:current>=open&&current<close
  if(!isOpen)return {kind:'closed',label:'영업 종료'}
  const remaining=(close-current+1440)%1440
  return remaining<=60?{kind:'closing',label:'곧 마감'}:{kind:'open',label:'영업 중'}
}
