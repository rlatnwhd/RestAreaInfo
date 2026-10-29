import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const file=fileURLToPath(new URL('../.cache/locations.json',import.meta.url)),maxAge=7*24*60*60*1000
let entries={}
try{entries=JSON.parse(fs.readFileSync(file,'utf8'))}catch{}
const identity=(type,area)=>JSON.stringify([type,area.id,area.name,area.address||'',area.direction||'',area.directions||[]])
let timer
export function storedLocation(type,area,now=Date.now()){
 const entry=entries[identity(type,area)]
 if(!entry||!Number.isFinite(entry.savedAt)||now-entry.savedAt>maxAge)return null
 const point=entry.point?.coordinates
 return point&&Number.isFinite(point.lat)&&Number.isFinite(point.lng)&&point.lat>=32&&point.lat<=40&&point.lng>=124&&point.lng<=132?entry.point:null
}
export function saveLocation(type,area,point){
 if(!point?.coordinates)return
 entries[identity(type,area)]={point,savedAt:Date.now()}
 if(!timer){timer=setTimeout(flushLocations,250);timer.unref?.()}
}
export function flushLocations(){
 clearTimeout(timer);timer=null
 try{
  const now=Date.now();entries=Object.fromEntries(Object.entries(entries).filter(([,entry])=>now-entry.savedAt<=maxAge))
  fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(entries));fs.renameSync(file+'.tmp',file)
 }catch{/* Disk cache is optional; never block a live location response. */}
}
