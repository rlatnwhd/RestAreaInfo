import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { bothDirectionInfo } from '../server/road-directions.js'
import { areaDirections, matchesDirection, directionGroups, UNSPECIFIED_DIRECTION } from '../src/utils/directionGroups.js'
const snapshot = JSON.parse(fs.readFileSync(new URL('../server/data/road-directions.json', import.meta.url)))
test('every explicitly bidirectional standard record retains route and date provenance', () => {
  const rows = snapshot.rows.filter(row => row.direction === '양방향')
  assert.equal(rows.length, 14)
  for (const row of rows) {
    const area = { name: `${row.name}휴게소`, routeCode: row.routeNumber.padStart(3,'0')+'0' }
    assert.equal(bothDirectionInfo(area, [area]).asOf, '2026-09-17')
    assert.equal(bothDirectionInfo({ ...area, routeCode: '9990' }, [area]), null)
    assert.equal(bothDirectionInfo(area, [area, { ...area }]), null)
    assert.equal(bothDirectionInfo({ ...area, ambiguousCode: true }, [area]), null)
  }
})
test('official directions take precedence; unlabeled never means bidirectional', () => {
  assert.deepEqual(areaDirections({ name: '가(서울)휴게소', directions: ['부산'] }), ['부산'])
  assert.deepEqual(areaDirections({ name: '가휴게소', directions: [] }), [UNSPECIFIED_DIRECTION])
  assert.deepEqual(areaDirections({ name: '가휴게소', directions: ['부산', '순천'] }), ['부산', '순천'])
})
test('a verified shared area appears once in each direction and in the shared-only filter', () => {
  const shared = { name: '공유휴게소', routeName: '도로', bidirectional: true }
  const rows = [shared, { name: '가(서울)휴게소', routeName: '도로' }, { name: '나(부산)휴게소', routeName: '도로' }]
  assert.equal(matchesDirection(shared, '서울'), true)
  assert.equal(matchesDirection(shared, UNSPECIFIED_DIRECTION), false)
  const groups = directionGroups(rows, '도로')
  assert.equal(groups.find(g => g.direction === '서울').count, 2)
  assert.equal(groups.find(g => g.direction === '부산').count, 2)
  assert.equal(groups.find(g => g.direction === '양방향').count, 1)
})
