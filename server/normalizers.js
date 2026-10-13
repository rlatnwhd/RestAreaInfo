export function text(value) { return value == null ? '' : String(value).trim() }
export function number(value) {
  if (value == null || text(value) === '') return null
  const valueText = text(value).replaceAll(',', '')
  if (!/^\d+(\.\d+)?$/.test(valueText)) return null
  const parsed = Number(valueText)
  return Number.isFinite(parsed) ? parsed : null
}
export function coordinates(x, y, system) {
  if (system !== 'WGS84') return null
  const lng = number(x), lat = number(y)
  return lng !== null && lat !== null && lng >= 124 && lng <= 132 && lat >= 32 && lat <= 40 ? { lat, lng } : null
}
export function basic(row, index, system) {
  return { id: [text(row.stdRestCd), text(row.unitCode), text(row.serviceAreaCode), index].join(':'), code: text(row.stdRestCd), unitCode: text(row.unitCode), serviceAreaCode: text(row.serviceAreaCode), name: text(row.unitName) || '명칭 정보 없음', routeCode: text(row.routeNo), routeName: text(row.routeName), direction: null, coordinates: coordinates(row.xValue, row.yValue, system), rawCoordinates: { x: text(row.xValue), y: text(row.yValue) } }
}
export function menu(row) {
  return { code: text(row.stdRestCd), restName: text(row.stdRestNm), routeName: text(row.routeNm), id: `${text(row.stdRestCd)}:${text(row.seq)}:${text(row.foodNm)}`, name: text(row.foodNm) || '메뉴명 정보 없음', price: number(row.foodCost), description: text(row.etc), ingredients: text(row.foodMaterial), recommended: text(row.recommendyn).toUpperCase() === 'Y', best: text(row.bestfoodyn).toUpperCase() === 'Y', premium: text(row.premiumyn).toUpperCase() === 'Y', season: ({ '4': '사계절', S: '여름', W: '겨울' })[text(row.seasonMenu).toUpperCase()] || null, address: text(row.svarAddr), updatedAt: text(row.lsttmAltrDttm) }
}
export function brand(row) {
  return { code: text(row.stdRestCd), restName: text(row.stdRestNm), name: text(row.brdName), description: text(row.brdDesc), start: text(row.stime), end: text(row.etime), updatedAt: text(row.lsttmAltrDttm) }
}
export function oilFacility(row) {
  return { code: text(row.stdRestCd), restName: text(row.stdRestNm), name: text(row.psName), description: text(row.psDesc), startSection: text(row.stime), endSection: text(row.etime), updatedAt: text(row.lsttmAltrDttm) }
}
export function statistic(row, index) {
  return { id: text(row['순번']) || String(index), name: text(row['휴게소명']), routeName: text(row['노선명']), address: text(row['소재지']), visitors: number(row['1일 이용객수(17년)']), traffic: number(row['1일 차량 통행량(24년)']), visitorYear: 2017, trafficYear: 2024, unit: '명/일', trafficUnit: '대/일' }
}
// A name is a consistency check AFTER an exact code match, never a joining key.
export function connectRows(area, rows) {
  const compact = value => text(value).replace(/\s+/g, '')
  const matches = rows.filter(row => text(row.stdRestCd) === area.code)
  const safe = matches.filter(row => !text(row.stdRestNm) || compact(row.stdRestNm) === compact(area.name))
  return { rows: safe, rejected: rows.length - safe.length, status: rows.length === 0 ? 'empty' : safe.length === rows.length ? 'code-matched' : 'conflict' }
}
