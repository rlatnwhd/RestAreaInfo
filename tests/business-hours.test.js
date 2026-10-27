import test from 'node:test'
import assert from 'node:assert/strict'
import { businessStatus } from '../src/utils/businessHours.js'
const at=time=>new Date(`2026-10-27T${time}:00+09:00`)
test('Korean time drives opening, one-hour closing threshold, and exact closing boundary',()=>{
 for(const [time,kind] of [['07:59','closed'],['08:00','open'],['18:59','open'],['19:00','closing'],['19:59','closing'],['20:00','closed']])assert.equal(businessStatus('08:00','20:00',at(time)).kind,kind)
 assert.equal(businessStatus('08:00','20:00',new Date('2026-10-27T10:30:00Z')).kind,'closing')
})
test('overnight schedules and explicit 24 hours handle midnight',()=>{
 for(const time of ['00:00','12:00','23:59'])assert.equal(businessStatus('00:00','24:00',at(time)).kind,'open')
 assert.equal(businessStatus('20:00','02:00',at('23:30')).kind,'open')
 assert.equal(businessStatus('20:00','02:00',at('01:30')).kind,'closing')
 assert.equal(businessStatus('20:00','02:00',at('02:00')).kind,'closed')
 assert.equal(businessStatus('08:00','24:00',at('23:10')).kind,'closing')
 assert.equal(businessStatus('08:00','24:00',at('00:00')).kind,'closed')
})
test('missing, malformed and equal times never invent operating hours',()=>{
 for(const [start,end] of [['','20:00'],['08:00',''],['25:00','26:00'],['08:90','20:00'],['07:00','07:00'],['00:00','00:00'],['24:00','08:00']])assert.equal(businessStatus(start,end,at('12:00')).kind,'unknown')
})
