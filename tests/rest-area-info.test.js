import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { operationFor, foodHoursFor } from '../server/rest-area-info.js'
const snapshot = JSON.parse(fs.readFileSync(new URL('../server/data/operations.json', import.meta.url)))
test('all audited areas have a unique code and retain provenance', () => {
  assert.equal(snapshot.records.length, 203)
  assert.equal(new Set(snapshot.records.map(r => r.code)).size, 203)
  assert.equal(snapshot.records.filter(r => r.status === 'verified').length, 172)
  for (const row of snapshot.records) {
    assert.equal(operationFor(row).asOf, '2026-08-28')
    if (row.status === 'verified') assert.equal(row.type, row.sourceRecord['유형'])
    else assert.equal(row.type, null)
  }
})
test('changed name, road or ambiguous identity cannot inherit operation data', () => {
  const area = snapshot.records.find(r => r.status === 'verified')
  for (const change of [{ name: 'opposite direction' }, { routeName: 'another road' }, { ambiguousCode: true }, { code: 'missing' }]) {
    assert.equal(operationFor({ ...area, ...change }).type, null)
  }
})
test('foodcourt hours preserve exceptions and never imply individual menu hours', () => {
  const area = { code: '000292', name: '덕평휴게소', routeName: '영동선' }
  const [hours] = foodHoursFor(area)
  assert.equal(hours.scope, '푸드코트')
  assert.match(hours.exception, /일부 품목 제외/)
  assert.equal(hours.publishedAt, null)
  assert.deepEqual(foodHoursFor({ ...area, name: 'other' }), [])
  assert.deepEqual(foodHoursFor({ ...area, ambiguousCode: true }), [])
})
