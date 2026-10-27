import test from 'node:test'
import assert from 'node:assert/strict'
import { commonMenus, orderedMenus, metricWinner } from '../src/utils/comparison.js'
const row=(menus,visitors=0,year=2024)=>({data:{menus,sources:{},visitorStats:{visitors,visitorYear:year}}})
test('same menu names use cheapest duplicate and appear above descending unrelated menus',()=>{
 const a=row([{name:'돈 까스',price:12000},{name:'돈까스',price:10000},{name:'스테이크',price:30000},{name:'라면',price:null}])
 const b=row([{name:'돈까스',price:8000},{name:'우동',price:7000}])
 const groups=commonMenus([a,b])
 assert.equal(groups.length,1);assert.equal(groups[0].min,8000)
 assert.equal(groups[0].stops.get(0).price,10000)
 const result=orderedMenus(a,0,groups)
 assert.equal(result.shared[0].item.price,10000)
 assert.deepEqual(result.other.map(item=>item.price),[30000,12000,null])
 assert.equal(a.data.menus[0].price,12000)
 assert.equal(commonMenus([row([{name:'돈까스정식',price:1}]),b]).length,0)
})
test('highlights need two known values and matching year; ties and unknowns do not invent a winner',()=>{
 const getValue=r=>r.data.visitorStats.visitors, getYear=r=>r.data.visitorStats.visitorYear
 const rows=[row([],100),row([],200),row([],900,2023)]
 assert.equal(metricWinner(rows,1,getValue,getYear),true)
 assert.equal(metricWinner(rows,0,getValue,getYear),false)
 assert.equal(metricWinner(rows,2,getValue,getYear),false)
 assert.equal(metricWinner([row([],200),row([],200)],0,getValue,getYear),false)
 assert.equal(metricWinner([row([],null),row([],0)],1,getValue,getYear),false)
})
