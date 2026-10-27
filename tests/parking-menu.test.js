import test from 'node:test'
import assert from 'node:assert/strict'
import { parkingFor } from '../server/parking.js'
import { priceDescending } from '../src/utils/menuCategories.js'
test('parking joins preserve directional identity and current source date', () => {
  const area = { name: '죽전(서울)휴게소', routeName: '경부선' }
  const parking = parkingFor(area, [area])
  assert.equal(parking.total, 223)
  assert.equal(parking.total, parking.small + parking.large + parking.accessible)
  assert.equal(parking.asOf, '2026-07-31')
  assert.equal(parkingFor({ ...area, name: '죽전(부산)휴게소' }, [area]), null)
  assert.equal(parkingFor(area, [area, { ...area }]), null)
  assert.equal(parkingFor({ ...area, ambiguousCode: true }, [area]), null)
})
test('comparison prices descend numerically with zero before unknown and preserve source order', () => {
  const source = [{price:900},{price:null},{price:12000},{price:0},{price:NaN}]
  const sorted = [...source].sort(priceDescending)
  assert.deepEqual(sorted.map(row=>row.price), [12000,900,0,null,NaN])
  assert.equal(source[0].price,900)
})
