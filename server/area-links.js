import { text } from './normalizers.js'
const roadAliases = { '청주영덕선': '당진영덕선', '통영대전선': '대전통영선', '남해2지선': '남해제2지선', '동해선(부산-포항)': '울산포항선' }
const road = value => (roadAliases[text(value)] || text(value)).replace(/\([^)]*\)/g, '').replace(/\s/g, '')
const name = value => text(value).replace(/\s/g, '').replace(/휴게소/g, '').replace(/주유소$/, '')
export function officialOverview(area, rows) {
  if (area.ambiguousCode) return []
  return rows.filter(row => text(row.serviceAreaCode2) === area.code && name(row.serviceAreaName) === name(area.name) && text(row.routeCode) === area.routeCode)
}
// Alternate-source linking requires a unique road AND direction-preserving name
// on both sides. We never remove parentheses or guess renamed directions.
export function linkRelated(area, areas, rows, kind) {
  if (area.ambiguousCode) return { rows: [], status: 'ambiguous' }
  const identity = value => `${road(value.routeName)}:${name(value.name)}`
  const key = identity(area)
  if (areas.filter(other => identity(other) === key).length !== 1) return { rows: [], status: 'ambiguous' }
  const candidates = rows.filter(row => {
    const routeName = kind === 'oil' ? row.routeNm : row.routeName
    const restName = kind === 'oil' ? row.stdRestNm : row.name
    return road(routeName) === road(area.routeName) && name(restName) === name(area.name)
      && (kind !== 'oil' || !text(row.routeCd) || text(row.routeCd) === area.routeCode)
  })
  const identities = new Set(candidates.map(row => kind === 'oil' ? text(row.stdRestCd) : row.id))
  if (!candidates.length) return { rows: [], status: 'unmatched' }
  if (identities.size !== 1 || identities.has('')) return { rows: [], status: 'ambiguous' }
  return { rows: candidates, status: 'route-direction-name', matchedName: kind === 'oil' ? candidates[0].stdRestNm : candidates[0].name, matchedCode: kind === 'oil' ? candidates[0].stdRestCd : null }
}
