import test from 'node:test'
import assert from 'node:assert/strict'
import { expandAreaCatalog } from '../server/area-catalog.js'
const base = [{ id: 'existing', code: '1', routeCode: '0101', routeName: '남해선(영암-순천)', name: '기존휴게소' }]
const row = { serviceAreaCode2: '2', serviceAreaCode: 'A2', serviceAreaName: '추가휴게소', routeCode: '0290', routeName: '세종포천선' }
test('supplemental coded areas expose missing highways without duplicating shared facilities', () => {
  const result = expandAreaCatalog(base, [row, { ...row, direction: '반대 방향' }, { ...row, serviceAreaCode2: '1' }])
  assert.equal(result.length, 2)
  assert.equal(result[0].id, 'existing')
  assert.equal(result[1].routeName, '세종포천선')
  assert.equal(result[1].coordinates, null)
})
test('road label variants reuse existing routes and incomplete or conflicting areas stay excluded', () => {
  assert.equal(expandAreaCatalog(base, [{ ...row, routeCode: '0101', routeName: '남해선(영암순천)' }])[1].routeName, base[0].routeName)
  assert.equal(expandAreaCatalog(base, [{ ...row, routeName: null }]).length, 1)
  assert.equal(expandAreaCatalog(base, [row, { ...row, serviceAreaName: '다른휴게소' }]).length, 1)
  assert.equal(expandAreaCatalog(base, [{ ...row, serviceAreaCode2: '' }]).length, 1)
})
