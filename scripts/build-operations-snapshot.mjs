import fs from 'node:fs'
const input = JSON.parse(fs.readFileSync('artifacts/research/operations-input.json', 'utf8'))
const sourceRows = JSON.parse(fs.readFileSync('artifacts/research/operations-2026.json', 'utf8'))
// Only reviewed road-label equivalents. Direction labels are never removed.
const aliases = { '청주영덕선': '당진영덕선', '통영대전선': '대전통영선', '남해2지선': '남해제2지선', '동해선(부산-포항)': '울산포항선' }
const name = value => value.replace(/\s+/g, '').replace(/휴게소/g, '')
const road = value => (aliases[value] || value).replace(/\([^)]*\)/g, '').replace(/\s+/g, '')
const records = input.base.map(area => {
  const candidates = sourceRows.filter(row => name(row['휴게소명']) === name(area.name) && road(row['노선명']) === road(area.routeName))
  const match = candidates.length === 1 ? candidates[0] : null
  return { code: area.code, name: area.name, routeName: area.routeName, status: match ? 'verified' : 'unconfirmed', type: match?.['유형'] || null, sourceRecord: match, reason: match ? '노선과 방향을 포함한 명칭 대조' : '최신 공식 운영유형 목록에서 동일 노선·방향 명칭을 확인하지 못함' }
})
const snapshot = { source: '한국도로공사 휴게소 현황', sourceUrl: 'https://www.data.go.kr/data/15164198/fileData.do', downloadUrl: 'https://www.data.go.kr/cmm/cmm/fileDownload.do?atchFileId=FILE_000000007661578&fileDetailSn=1&insertDataPrcus=N', asOf: '2026-08-28', checkedAt: '2026-10-16', aliases, sourceRows, records }
fs.mkdirSync('server/data', { recursive: true })
fs.writeFileSync('server/data/operations.json', JSON.stringify(snapshot, null, 2) + '\n')
console.log({ audited: records.length, verified: records.filter(r => r.status === 'verified').length, unconfirmed: records.filter(r => r.status !== 'verified').length })
