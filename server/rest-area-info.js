import fs from 'node:fs'
const snapshot = JSON.parse(fs.readFileSync(new URL('./data/operations.json', import.meta.url), 'utf8'))
const schedules = JSON.parse(fs.readFileSync(new URL('./data/food-hours.json', import.meta.url), 'utf8'))
const sameArea = (record, area) => record.code === area.code && record.name === area.name && record.routeName === area.routeName && !area.ambiguousCode
export function operationFor(area) {
  const record = snapshot.records.find(row => sameArea(row, area))
  return { status: record?.status || 'unconfirmed', type: record?.type || null, asOf: snapshot.asOf, checkedAt: snapshot.checkedAt, source: snapshot.source, sourceUrl: snapshot.sourceUrl }
}
export function foodHoursFor(area) {
  return schedules.filter(row => sameArea(row, area))
}
