import test from 'node:test'
import assert from 'node:assert/strict'
import { number, basic, menu, oilFacility, statistic, connectRows } from '../server/normalizers.js'

test('invalid and missing prices remain unknown; commas and zero are preserved', () => {
  for (const input of [null, undefined, '', '무료', '-1', '8,000원', 'NaN']) assert.equal(number(input), null)
  assert.equal(number('8,000'), 8000)
  assert.equal(number('0'), 0)
})
test('unknown CRS never becomes a map coordinate or direction', () => {
  const row = { stdRestCd:'000001', unitCode:'001', unitName:'서울만남(부산)휴게소', xValue:'127.042514', yValue:'37.459939' }
  const area = basic(row,0,'')
  assert.equal(area.coordinates,null)
  assert.equal(area.direction,null)
  assert.equal(basic(row,0,'WGS84').coordinates.lng,127.042514)
  assert.equal(basic({...row,xValue:'200000'},0,'WGS84').coordinates,null)
})
test('exact codes are mandatory and conflicting names are rejected', () => {
  const area = { code:'000001', name:'서울만남(부산)휴게소' }
  const result = connectRows(area,[{stdRestCd:'000001',stdRestNm:'서울만남(부산)휴게소'},{stdRestCd:'000002',stdRestNm:area.name},{stdRestCd:'000001',stdRestNm:'반대 방향 휴게소'}])
  assert.equal(result.rows.length,1)
  assert.equal(result.rejected,2)
  assert.equal(result.status,'conflict')
})
test('oil service start/end are sections, not business hours', () => {
  const facility=oilFacility({stdRestCd:'000002',psName:'쉼터',stime:'00:00',etime:'24:00'})
  assert.equal(facility.startSection,'00:00')
  assert.equal('start' in facility,false)
})
test('actual ODCLOUD fields preserve separate years and units', () => {
  const row=statistic({'순번':1,'휴게소명':'건천(부산)','노선명':'경부선','1일 이용객수(17년)':4165,'1일 차량 통행량(24년)':'2,803'},0)
  assert.equal(row.visitors,4165)
  assert.equal(row.traffic,2803)
  assert.equal(row.visitorYear,2017)
  assert.equal(row.trafficYear,2024)
  assert.equal(row.unit,'명/일')
  assert.equal(row.trafficUnit,'대/일')
})
test('source flags and unknown seasons are not inferred', () => {
  const row=menu({foodCost:'8000',recommendyn:'Y',bestfoodyn:'1',seasonMenu:'UNKNOWN'})
  assert.equal(row.price,8000)
  assert.equal(row.recommended,true)
  assert.equal(row.best,false)
  assert.equal(row.season,null)
  assert.equal(menu({seasonMenu:'s'}).season,'여름')
  assert.equal(menu({seasonMenu:'w'}).season,'겨울')
})
