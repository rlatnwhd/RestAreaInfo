export default function FoodHours({ data }) {
  const schedules = data.foodHours || []
  return <section className="food-hours" aria-label="음식 판매시간">
    <h3>음식 판매시간 안내</h3>
    {schedules.map((row, index) => <div className="hours-entry" key={index}>
      <strong>{row.scope} · {row.hours}</strong><p>{row.exception}</p>
      <small><a href={row.sourceUrl} target="_blank" rel="noreferrer">{row.source}</a> · 확인 {row.checkedAt} · 게시일 미제공</small>
      {row.phone && <p><a href={`tel:${row.phone}`}>전화 문의 {row.phone}</a></p>}
    </div>)}
    {!schedules.length && <p>식당가 판매시간은 아직 확인되지 않았습니다.</p>}
    <p>개별 메뉴 판매시간은 제공되지 않습니다. 야간 판매 메뉴와 주문 마감은 매장에 확인해 주세요.</p>
  </section>
}
