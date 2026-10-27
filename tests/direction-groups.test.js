import test from 'node:test'
import assert from 'node:assert/strict'
import { nameDirection, directionLabel, directionGroups, UNSPECIFIED_DIRECTION } from '../src/utils/directionGroups.js'
test('catalogue labels do not change verified direction or invent a missing direction',()=>{
  const area={name:'서울만남(부산)휴게소',direction:null}
  assert.equal(nameDirection(area),'부산')
  assert.equal(area.direction,null)
  assert.equal(nameDirection({name:'방향 없는 휴게소'}),UNSPECIFIED_DIRECTION)
  assert.equal(nameDirection({name:'어느(통합)휴게소'}),UNSPECIFIED_DIRECTION)
})
test('both-direction and explicit suffixes are displayed faithfully',()=>{
  assert.equal(directionLabel(nameDirection({name:'어느(양방향)휴게소'})),'양방향')
  assert.equal(directionLabel(nameDirection({name:'어느휴게소(서울방향)'})),'서울 방향')
})
test('direction counts stay isolated by highway and include unlabelled entries',()=>{
  const rows=[{name:'가(서울)휴게소',routeName:'경부선'},{name:'나(서울)휴게소',routeName:'경부선'},{name:'다(부산)휴게소',routeName:'경부선'},{name:'라휴게소',routeName:'경부선'},{name:'마(서울)휴게소',routeName:'다른선'}]
  const groups=directionGroups(rows,'경부선')
  assert.equal(groups.find(row=>row.direction==='서울').count,2)
  assert.equal(groups.reduce((sum,row)=>sum+row.count,0),4)
  assert.equal(groups.at(-1).direction,UNSPECIFIED_DIRECTION)
})
