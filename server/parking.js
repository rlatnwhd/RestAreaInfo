import fs from 'node:fs'
import { linkRelated } from './area-links.js'
import { number } from './normalizers.js'
export const parkingSnapshot = JSON.parse(fs.readFileSync(new URL('./data/parking.json', import.meta.url), 'utf8'))
// Reviewed naming differences in this source only; direction labels stay intact.
const aliases = { '중부내륙': '중부내륙선', '익산장수선': '완주장수선', '대구포항선': '새만금포항선(대구~포항)', '상주영덕선': '당진영덕선', '부산외곽선': '부산외곽순환선', '함양울산선': '밀양울산선' }
export function parkingFor(area, areas, dataset = parkingSnapshot) {
  const rows = dataset.rows.map((row, index) => ({ ...row, id: String(index), name: row['휴게소명'], routeName: aliases[row['노선']] || row['노선'] }))
  const linked = linkRelated(area, areas, rows, 'parking')
  if (linked.rows.length !== 1) return null
  const row = linked.rows[0]
  return { total: number(row['합계']), large: number(row['대형']), small: number(row['소형']), accessible: number(row['장애인']), sourceName: row.name, source: dataset.source, sourceUrl: dataset.sourceUrl, asOf: dataset.asOf, checkedAt: dataset.checkedAt || dataset.fetchedAt, mode: dataset.mode || 'snapshot', matching: linked.status }
}
