import test from 'node:test'
import assert from 'node:assert/strict'
import {api,exRows} from '../server/api.js'
test('menu count reads one shared page; full menus use bounded parallel pages in original order',async()=>{
 const originalFetch=globalThis.fetch,originalKey=process.env.EX_API_KEY
 process.env.EX_API_KEY='menu-pagination-test-key'
 let calls=0,active=0,maxActive=0
 globalThis.fetch=async url=>{
  const page=Number(new URL(url).searchParams.get('pageNo'));calls++;active++;maxActive=Math.max(maxActive,active)
  await new Promise(resolve=>setTimeout(resolve,(8-page)*3));active--
  return new Response(JSON.stringify({code:'SUCCESS',count:14,pageSize:7,numOfRows:2,list:[{page,seq:1},{page,seq:2}]}),{status:200})
 }
 try{
  const count=await api('/api/menu-count',new URLSearchParams());assert.equal(count.count,14);assert.equal(calls,1)
  const data=await exRows('menus');assert.equal(calls,7);assert.equal(data.rows.length,14)
  assert.deepEqual(data.rows.map(row=>row.page),[1,1,2,2,3,3,4,4,5,5,6,6,7,7])
  assert.ok(maxActive>1&&maxActive<=4)
  await api('/api/menu-count',new URLSearchParams());assert.equal(calls,7)
 }finally{globalThis.fetch=originalFetch;if(originalKey===undefined)delete process.env.EX_API_KEY;else process.env.EX_API_KEY=originalKey}
})
