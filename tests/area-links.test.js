import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { linkRelated, officialOverview } from '../server/area-links.js'
import { facilityInventory } from '../server/facilities.js'
import { snapshotFacilities } from '../server/facility-snapshots.js'
const area = { code: '000003', name: '죽전(서울)휴게소', routeName: '경부선', routeCode: '0010', serviceAreaCode: 'A00002' }
test('a different gas station code connects only by unique road and directional name', () => {
  const rows = [
    { stdRestCd: '000004', stdRestNm: '죽전(서울)주유소', routeNm: '경부선', routeCd: '0010', psName: '쉼터' },
    { stdRestCd: 'opposite', stdRestNm: '죽전(부산)주유소', routeNm: '경부선', routeCd: '0010' },
    { stdRestCd: 'other-road', stdRestNm: '죽전(서울)주유소', routeNm: '영동선', routeCd: '0500' }
  ]
  const joined = linkRelated(area, [area], rows, 'oil')
  assert.equal(joined.rows.length, 1)
  assert.equal(joined.matchedCode, '000004')
  assert.equal(linkRelated(area, [area], [...rows, { ...rows[0], stdRestCd: 'another' }], 'oil').status, 'ambiguous')
  assert.equal(linkRelated(area, [area, { ...area, code: 'another' }], rows, 'oil').status, 'ambiguous')
})
test('statistics retain direction and reject ambiguous or renamed rows', () => {
  const rows = [{ id: '1', name: '죽전(서울)', routeName: '경부선' }, { id: '2', name: '죽전(부산)', routeName: '경부선' }]
  assert.equal(linkRelated(area, [area], rows, 'statistics').rows[0].id, '1')
  assert.equal(linkRelated(area, [area], [{ ...rows[0], name: '죽전' }], 'statistics').status, 'unmatched')
  assert.equal(linkRelated(area, [area], [...rows, { ...rows[0], id: '3' }], 'statistics').status, 'ambiguous')
})
test('official directions require code, name and road code consistency', () => {
  const row = { serviceAreaCode2: area.code, serviceAreaName: area.name, routeCode: area.routeCode, direction: '서울' }
  assert.equal(officialOverview(area, [row]).length, 1)
  for (const change of [{ routeCode: '0500' }, { serviceAreaName: '죽전(부산)휴게소' }, { serviceAreaCode2: 'different' }]) assert.equal(officialOverview(area, [{ ...row, ...change }]).length, 0)
  assert.equal(officialOverview({ ...area, ambiguousCode: true }, [row]).length, 0)
})
test('missing facilities are unknown; only explicit negative flags mean absent', () => {
  const groups = facilityInventory([{ psName: '샤워실' }], [{ maintenanceYn: 'X', convenience: '수유실' }])
  const items = Object.fromEntries(groups.flatMap(g => g.items).map(item => [item.id, item]))
  assert.equal(items.shower.status, 'present')
  assert.equal(items.nursing.status, 'present')
  assert.equal(items.maintenance.status, 'absent')
  assert.equal(items.wifi.status, 'unknown')
  assert.equal(items.ev.status, 'unknown')
  const conflicting = facilityInventory([], [{ maintenanceYn: 'O' }, { maintenanceYn: 'X' }]).flatMap(g => g.items).find(item => item.id === 'maintenance')
  assert.equal(conflicting.status, 'unknown')
})
test('public snapshots preserve actual zero counts and source dates', () => {
  const result = snapshotFacilities(area, [area])
  assert.equal(result.wifi.status, 'present')
  assert.equal(result.wifi.asOf, '2026-08-04')
  assert.equal(result.maintenance.status, 'absent')
  assert.ok(result.air && result.air.asOf === '2026-07-31')
  assert.deepEqual(snapshotFacilities({ ...area, ambiguousCode: true }, [area]), {})
  const vehicle = JSON.parse(fs.readFileSync(new URL('../server/data/vehicle.json', import.meta.url)))
  const zero = vehicle.rows.find(row => row['공기압 점검기'] === '0')
  const zeroArea = { code: 'test-zero', name: zero['시설명'], routeName: zero['노선명'] }
  assert.equal(snapshotFacilities(zeroArea, [zeroArea]).air.status, 'absent')
})
