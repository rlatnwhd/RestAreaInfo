// EX route codes use three route-number digits followed by a section digit.
// The section digit is never part of the number printed on a road sign.
export function expresswayNumber(code) {
  const value = String(code || '')
  return /^\d{4}$/.test(value) && Number(value.slice(0, 3)) > 0 ? String(Number(value.slice(0, 3))) : null
}
export function roadOptions(areas) {
  const grouped = new Map()
  for (const area of areas) {
    if (!area.routeName) continue
    if (!grouped.has(area.routeName)) grouped.set(area.routeName, [])
    grouped.get(area.routeName).push(area)
  }
  return [...grouped].map(([name, rows]) => {
    // Current EX records are expressways. Other sources must explicitly declare
    // their road type and printed number; never infer a national road from digits.
    const types = new Set(rows.map(row => row.roadType || 'expressway'))
    const type = types.size === 1 ? [...types][0] : null
    const numbers = new Set(rows.map(row => type === 'expressway' ? expresswayNumber(row.routeCode) : type === 'national' && /^[1-9]\d{0,2}$/.test(String(row.routeNumber || '')) ? String(row.routeNumber) : null))
    return { value: name, name, type, number: numbers.size === 1 ? [...numbers][0] : null }
  }).sort((a, b) => (Number(a.number) || Infinity) - (Number(b.number) || Infinity) || a.name.localeCompare(b.name, 'ko'))
}

// Printed expressway numbers for the route labels used by the shelter dataset.
// Section labels retain the number of their parent route (not the EX section digit).
const shelterNumbers = {
  '수도권제1순환선':'100', '서해안선':'15', '영동선':'50', '평택제천선':'40',
  '경부선':'1', '중부선':'35', '제2중부선':'37', '구리포천선':'29',
  '중앙선':'55', '서울양양선':'60', '동해선':'65', '중부내륙선':'45',
  '당진영덕선(청주영덕)':'30', '호남지선':'251', '대전남부순환선':'300',
  '당진영덕선(당진대전)':'30', '서천공주선':'151', '호남선':'25',
  '새만금포항선(익산장수)':'20', '통영대전선':'35', '새만금포항지선':'204',
  '광주대구선':'12', '고창담양선':'253', '남해선(순천부산)':'10',
  '남해선(영암순천)':'10', '대구외곽순환선':'700', '새만금포항선(대구포항)':'20',
  '부산외곽순환선':'600', '남해1지선':'102', '울산선':'16',
  '당진영덕선(당진청주)':'30', '수도권제2순환선':'400', '세종포천선':'29',
  '포항영덕선':'65', '새만금포항선(새만금전주)':'20',
}
export function shelterRoadOption(name) {
  return { value: name, name, type: 'expressway', number: shelterNumbers[name] || null }
}
