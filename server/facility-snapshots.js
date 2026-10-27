import fs from 'node:fs'
import { linkRelated } from './area-links.js'
const load = name => JSON.parse(fs.readFileSync(new URL(`./data/${name}.json`, import.meta.url), 'utf8'))
const wifi = load('wifi'), vehicle = load('vehicle'), official = load('official-facilities'), transfer = load('transfer')
const datasets = [
  { data: wifi, rows: wifi.rows.map((row, i) => ({ ...row, id: String(i), routeName: row['노선'], name: row['휴게소명'] })), fields: { wifi: '가능여부' } },
  { data: vehicle, rows: vehicle.rows.map((row, i) => ({ ...row, id: String(i), routeName: row['노선명'], name: row['시설명'] })), fields: { air: '공기압 점검기', vacuum: '진공 청소기', mat: '매트 청소기', airgun: '에어건' } }
]
export function snapshotFacilities(area, areas) {
  const result = {}
  for (const { data, rows, fields } of datasets) {
    const linked = linkRelated(area, areas, rows, 'snapshot')
    if (linked.rows.length !== 1) continue
    for (const [id, field] of Object.entries(fields)) {
      const value = String(linked.rows[0][field] ?? '').trim()
      const status = value === 'O' ? 'present' : value === 'X' ? 'absent' : /^\d+$/.test(value) ? (Number(value) > 0 ? 'present' : 'absent') : 'unknown'
      if (status !== 'unknown') result[id] = { status, source: data.source, sourceUrl: data.sourceUrl, asOf: data.asOf, checkedAt: data.checkedAt }
    }
  }
  const transferRows = transfer.rows.map((row, index) => ({ id: String(index), name: row['휴게소명'], routeName: row['노선'], hours: row['운영시간'] }))
  const bus = linkRelated(area, areas, transferRows, 'snapshot')
  if (bus.rows.length === 1) result.bus = { status: 'present', source: transfer.source, sourceUrl: transfer.sourceUrl, asOf: transfer.asOf, description: `환승 운영시간 ${bus.rows[0].hours}` }
  const record = official.rows.filter(row => row.serviceAreaCode === area.serviceAreaCode && row.name === area.name.replace(/휴게소$/, '').trim())
  if (!area.ambiguousCode && record.length === 1) {
    const provenance = { source: official.source, sourceUrl: official.sourceUrl, checkedAt: official.checkedAt, description: '', updatedAt: null }
    for (const id of ['wash', 'maintenance', 'truck']) {
      const flag = record[0][id]
      if (['O', 'X'].includes(flag)) result[id] = { ...provenance, status: flag === 'O' ? 'present' : 'absent' }
    }
    const map = { nursing: '수유실', shower: '샤워실', sleep: '수면실', laundry: '세탁실', garden: '쉼터', pharmacy: '약국' }
    for (const [id, label] of Object.entries(map)) if (record[0].restFacilities.includes(label)) result[id] = { ...provenance, status: 'present' }
  }
  return result
}
