// Catalogue labels from the original name, never a claim about road access.
export const UNSPECIFIED_DIRECTION = '__unspecified__'
export function nameDirection(area) {
  const match = String(area.name || '').match(/\(([^()]+)\)\s*(?:휴게소)?$/)
  const label=match?.[1].trim()
  if(!label||['통합','공용'].includes(label))return UNSPECIFIED_DIRECTION
  return label==='양방향'?label:label.replace(/방향$/, '').trim()||UNSPECIFIED_DIRECTION
}
export function directionLabel(value) {
  if (value === UNSPECIFIED_DIRECTION) return '방향 미표기'
  return /방향$/.test(value) ? value : `${value} 방향`
}
export function areaDirections(area) {
  if (area.bidirectional || nameDirection(area) === '양방향') return ['양방향']
  const official = [...new Set((area.directions || []).map(value => String(value).replace(/방향$/, '').trim()).filter(Boolean))]
  return official.length ? official : [nameDirection(area)]
}
export function matchesDirection(area, direction) {
  const values = areaDirections(area)
  return values.includes(direction) || (direction !== UNSPECIFIED_DIRECTION && values.includes('양방향'))
}
export function directionGroups(areas, routeName) {
  const rows = areas.filter(area => area.routeName === routeName)
  const directions = new Set(rows.flatMap(areaDirections))
  return [...directions].map(direction => ({ direction, count: rows.filter(area => direction === '양방향' ? areaDirections(area).includes('양방향') : matchesDirection(area, direction)).length })).sort((a,b) => a.direction === UNSPECIFIED_DIRECTION ? 1 : b.direction === UNSPECIFIED_DIRECTION ? -1 : a.direction.localeCompare(b.direction, 'ko'))
}
