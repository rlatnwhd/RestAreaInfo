import test from 'node:test'
import assert from 'node:assert/strict'
import { expresswayNumber, roadOptions } from '../src/utils/roadRoutes.js'
test('EX section identifiers are never displayed as road numbers', () => {
  for (const [code, number] of [['0010','1'],['0100','10'],['0101','10'],['0251','25'],['0351','35'],['0352','35'],['0652','65'],['1040','104'],['4510','451']]) assert.equal(expresswayNumber(code), number)
  for (const code of ['',null,'035','garbage','0000']) assert.equal(expresswayNumber(code), null)
})
test('routes stay separate by section name and conflicting numbers remain unknown', () => {
  const options = roadOptions([{routeName:'남해선(순천-부산)',routeCode:'0100'},{routeName:'남해선(영암-순천)',routeCode:'0101'},{routeName:'충돌',routeCode:'0100'},{routeName:'충돌',routeCode:'0500'}])
  assert.equal(options.length,3)
  assert.deepEqual(options.filter(o=>o.name.startsWith('남해')).map(o=>o.number),['10','10'])
  assert.equal(options.find(o=>o.name==='충돌').number,null)
  const [national] = roadOptions([{routeName:'일반국도 1호선',roadType:'national',routeNumber:'1',routeCode:'0001'}])
  assert.equal(national.type,'national')
  assert.equal(national.number,'1')
})
