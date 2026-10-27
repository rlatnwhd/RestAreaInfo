const clean = value => String(value || '').normalize('NFC').replace(/[\s()（）·,.-]/g,'')
export function restPlace(area, documents) {
 const base=clean(area.name.replace(/\([^)]*\)/g,'').replace(/휴게소$/,''))
 const explicit=area.name.match(/\(([^()]*)\)/)?.[1]?.replace(/방향$/,'').trim()
 const direction=area.bidirectional?'양방향':explicit||(area.directions?.length===1?area.directions[0]:null)
 const expected=base+(direction&&direction!=='양방향'?clean(direction):'')
 const matches=documents.filter(doc=>{
  if(!/휴게소$/.test(doc.category_name||''))return false
  const name=clean(doc.place_name).replace(/방향/g,'').replace(/휴게소/g,'')
  return name===expected || (direction==='양방향'&&name===base+'양방향')
 })
 const unique=[...new Map(matches.map(doc=>[doc.id||`${doc.x}:${doc.y}`,doc])).values()]
 return unique.length===1?unique[0]:null
}
export function coordinates(doc) {
 if(!doc||doc.x==null||doc.y==null||String(doc.x).trim()===''||String(doc.y).trim()==='')return null
 const lng=Number(doc.x),lat=Number(doc.y)
 return Number.isFinite(lng)&&Number.isFinite(lat)&&lng>=124&&lng<=132&&lat>=32&&lat<=40?{lat,lng}:null
}
export async function geocodeArea(area, addresses, lookup) {
 for(const address of [...new Set(addresses.filter(Boolean))]){
  const body=await lookup('address',address)
  if(body.documents?.length!==1||(body.meta?.total_count??1)!==1)continue
  const point=coordinates(body.documents[0])
  if(point)return {id:area.id,coordinates:point,address,coordinateSource:'한국도로공사 주소 → 카카오 주소 검색'}
 }
 const base=area.name.replace(/\([^)]*\)/g,'').replace(/휴게소$/,'')
 const direction=area.name.match(/\(([^()]*)\)/)?.[1]||(area.directions?.length===1?area.directions[0]:'')
 const body=await lookup('keyword',`${base}휴게소 ${direction==='양방향'?'':direction+'방향'}`.trim())
 const place=restPlace(area,body.documents||[]),point=coordinates(place)
 return point?{id:area.id,coordinates:point,address:place.road_address_name||place.address_name,placeId:place.id,coordinateSource:'카카오 장소 검색 · 휴게소명·방향 일치'}:null
}

export function shelterPlace(shelter, documents) {
  const base=clean(shelter.name).replace(/졸음쉼터/g,'')
  const direction=clean(shelter.direction).replace(/방향$/,'')
  const expected=base+direction
  const matches=documents.filter(doc=>String(doc.place_name||'').includes('졸음쉼터')&&clean(doc.place_name).replace(/졸음쉼터|방향/g,'')===expected)
  const unique=[...new Map(matches.map(doc=>[doc.id||`${doc.x}:${doc.y}`,doc])).values()]
  return unique.length===1?unique[0]:null
}
