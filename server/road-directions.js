import fs from 'node:fs'
const snapshot = JSON.parse(fs.readFileSync(new URL('./data/road-directions.json', import.meta.url), 'utf8'))
const name = value => String(value || '').replace(/\s+/g, '').replace(/휴게소$/, '')
const routeNumber = area => /^\d{4}$/.test(area.routeCode || '') ? String(Number(area.routeCode.slice(0, 3))) : null
export function bothDirectionInfo(area, areas) {
  if (area.ambiguousCode || !routeNumber(area)) return null
  const matchesArea = other => name(other.name) === name(area.name) && routeNumber(other) === routeNumber(area)
  if (areas.filter(matchesArea).length !== 1) return null
  const matches = snapshot.rows.filter(row => row.provider === '한국도로공사' && row.direction === '양방향' && row.routeNumber === routeNumber(area) && name(row.name) === name(area.name))
  if (matches.length !== 1) return null
  return { source: snapshot.source, sourceUrl: snapshot.sourceUrl, asOf: matches[0].asOf, checkedAt: snapshot.checkedAt, sourceName: matches[0].name, routeNumber: matches[0].routeNumber }
}
