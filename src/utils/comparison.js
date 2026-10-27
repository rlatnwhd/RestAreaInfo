import { priceDescending } from './menuCategories.js'
export const validMetric = value => typeof value === 'number' && Number.isFinite(value) && value >= 0
export const menuKey = item => String(item.name || '').normalize('NFC').replace(/\s+/g,'').toLocaleLowerCase('ko')
export function commonMenus(rows) {
 const groups = new Map()
 rows.forEach((row,index)=>{
  if(row.data?.sources?.menus?.status==='error')return
  for(const item of row.data?.menus||[]){
   const key=menuKey(item)
   if(!key||!validMetric(item.price))continue
   if(!groups.has(key))groups.set(key,new Map())
   const stops=groups.get(key), previous=stops.get(index)
   if(!previous||item.price<previous.price)stops.set(index,item)
  }
 })
 return [...groups].filter(([,stops])=>stops.size>=2).map(([key,stops])=>({key,stops,min:Math.min(...[...stops.values()].map(item=>item.price)),max:Math.max(...[...stops.values()].map(item=>item.price))})).sort((a,b)=>b.max-a.max||a.key.localeCompare(b.key,'ko'))
}
export function orderedMenus(row,index,common) {
 const shared=common.map(group=>({item:group.stops.get(index),group})).filter(value=>value.item)
 const selected=new Set(shared.map(value=>value.item))
 return {shared,other:[...(row.data?.menus||[])].filter(item=>!selected.has(item)).sort(priceDescending)}
}
export function metricWinner(rows,index,getValue,getPeriod=()=>null) {
 const value=getValue(rows[index]), period=getPeriod(rows[index])
 if(!validMetric(value))return false
 const values=rows.filter(row=>getPeriod(row)===period).map(getValue).filter(validMetric)
 return values.length>=2&&Math.max(...values)>Math.min(...values)&&value===Math.max(...values)
}
