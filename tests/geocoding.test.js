import test from 'node:test'
import assert from 'node:assert/strict'
import {restPlace,geocodeArea,coordinates,shelterPlace} from '../server/geocoding.js'
const area={id:'a',name:'죽암(서울)휴게소',directions:['서울']}
const place={id:'seoul',place_name:'죽암휴게소 서울방향',category_name:'교통,수송 > 휴게소',x:'127.43',y:'36.49',road_address_name:'청주시 도로명주소'}
test('place fallback requires the exact rest-stop name and direction and rejects shops and ambiguity',()=>{
 assert.equal(restPlace(area,[place]).id,'seoul')
 assert.equal(restPlace(area,[{...place,place_name:'죽암휴게소 부산방향'}]),null)
 assert.equal(restPlace(area,[{...place,category_name:'음식점 > 카페'}]),null)
 assert.equal(restPlace(area,[place,{...place,id:'duplicate'}]),null)
 assert.equal(restPlace(area,[{...place,place_name:'죽암휴게소 서울방향 주유소'}]),null)
})
test('obsolete or ambiguous addresses fall back to a directional place, and unresolved stays null',async()=>{
 const calls=[]
 const result=await geocodeArea(area,['예전 청원군 주소'],async(kind,query)=>{calls.push({kind,query});return kind==='address'?{documents:[]}:{documents:[place]}})
 assert.deepEqual(calls.map(row=>row.kind),['address','keyword'])
 assert.ok(calls[1].query.includes('서울방향'))
 assert.deepEqual(result.coordinates,{lat:36.49,lng:127.43})
 assert.equal(result.placeId,'seoul')
 assert.equal(await geocodeArea(area,['주소'],async()=>({documents:[]})),null)
 const direct=await geocodeArea(area,['주소'],async()=>({documents:[{x:'127.4',y:'36.4'}],meta:{total_count:1}}))
 assert.deepEqual(direct.coordinates,{lat:36.4,lng:127.4})
 assert.equal(coordinates({x:'',y:'36'}),null)
 assert.equal(coordinates({x:'0',y:'0'}),null)
})

test('shelter locations require matching direction and never choose toilets or the opposite carriageway',()=>{
 const area={name:'김포',direction:'일산'},place={id:'1',place_name:'김포졸음쉼터 일산방향',x:'126.77',y:'37.59'}
 assert.equal(shelterPlace(area,[place]).id,'1')
 assert.equal(shelterPlace(area,[{...place,place_name:'김포졸음쉼터 판교방향'}]),null)
 assert.equal(shelterPlace(area,[{...place,place_name:'김포졸음쉼터 일산방향 화장실'}]),null)
 assert.equal(shelterPlace(area,[place,{...place,id:'2'}]),null)
})
