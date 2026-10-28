import test from 'node:test'
import assert from 'node:assert/strict'
import {journeyHighways,journeyGroups,sameRoad} from '../src/utils/journey.js'
const route=reverse=>({highways:[{name:'경부고속도로',distance:200000}],paths:[{name:'경부고속도로',points:reverse?[{lat:37.5,lng:127},{lat:35.5,lng:127}]:[{lat:35.5,lng:127},{lat:37.5,lng:127}]}]})
const area=(id,direction,lat=36.5)=>({id,name:`쉼터(${direction})`,routeName:'경부선',directions:[direction],direction,coordinates:{lat,lng:127}})
test('extracts expressway names in first-use order, sums segments and preserves section labels',()=>{
 const groups=journeyHighways([{roads:[{name:'일반국도',distance:100},{name:'경부고속도로',distance:1000},{name:'경부고속도로',distance:2000},{name:'남해고속도로(순천-부산)',distance:5000},{name:'경부고속도로입구',distance:20}]}])
 assert.deepEqual(groups,[{name:'경부고속도로',distance:3000},{name:'남해고속도로(순천-부산)',distance:5000}])
 assert.equal(sameRoad('중부고속도로','중부내륙선'),false)
 assert.equal(sameRoad('당진영덕고속도로(청주-상주)','당진영덕선(청주영덕)'),true)
})
test('rest and shelter filters remove reverse direction, outside segment and unknown positions; shared stays',()=>{
 const rests=[area('n','서울'),area('s','부산'),area('both','양방향'),area('outside','서울',35),{...area('unknown','서울'),coordinates:null}]
 const shelters=[area('shelter-n','서울'),area('shelter-s','부산')]
 const forward=journeyGroups(route(false),rests,shelters)[0]
 assert.deepEqual(new Set(forward.stops.map(row=>row.id)),new Set(['n','both','shelter-n']))
 assert.equal(forward.unverified,1)
 assert.deepEqual(new Set(journeyGroups(route(true),rests,shelters)[0].stops.map(row=>row.id)),new Set(['s','both','shelter-s']))
})
