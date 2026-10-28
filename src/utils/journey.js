import { areaDirections } from './directionGroups.js'
const aliases={'서울외곽순환':'수도권제1순환','대전통영':'통영대전','당진영덕':'청주영덕','상주영덕':'청주영덕','대구포항':'새만금포항','익산장수':'완주장수','구리포천':'세종포천','남해제2지':'남해2지'}
export function roadKey(value){const name=String(value||'').replace(/\([^)]*\)/g,'').replace(/고속도로/g,'').replace(/\s/g,'').replace(/선$/,'');return aliases[name]||name}
export const sameRoad=(a,b)=>roadKey(a)===roadKey(b)
export function journeyHighways(sections){
 const groups=new Map()
 for(const section of sections||[])for(const road of section.roads||[]){
  const name=String(road.name||'').trim()
  if(!/고속도로(?:지선)?(?:\([^)]*\))?$/.test(name))continue
  if(!groups.has(name))groups.set(name,{name,distance:0})
  const group=groups.get(name)
  if(Number.isFinite(road.distance)&&road.distance>=0)group.distance+=road.distance
 }
 return [...groups.values()]
}
// Approximate direction-city centres; used only for estimated heading, not entrances.
const centres={서울:[126.978,37.567],부산:[129.076,35.180],순천:[127.488,34.950],대구:[128.602,35.871],무안:[126.481,34.990],시흥:[126.803,37.380],목포:[126.392,34.812],논산:[127.099,36.188],광양:[127.696,34.940],전주:[127.148,35.824],상주:[128.159,36.411],청원:[127.431,36.565],하남:[127.215,37.540],통영:[128.433,34.855],평택:[127.113,36.993],제천:[128.191,37.132],현풍:[128.447,35.698],마산:[128.573,35.197],양평:[127.487,37.491],인천:[126.705,37.456],강릉:[128.876,37.752],춘천:[127.730,37.881],양양:[128.619,38.075],동해:[129.114,37.525],속초:[128.591,38.207],퇴계원:[127.143,37.650],냉정:[128.808,35.215],서천:[126.692,36.080],공주:[127.119,36.446],대전:[127.385,36.350],밀양:[128.746,35.504],울산:[129.311,35.539],익산:[126.958,35.948],포항:[129.343,36.019],일산:[126.769,37.658],판교:[127.104,37.393],창원:[128.681,35.228],남이:[127.423,36.565],천안:[127.147,36.815],영암:[126.697,34.800],남양주:[127.217,37.636],동탄:[127.070,37.200],봉담:[126.950,37.220],광주:[126.852,35.160],원주:[127.920,37.342],강진:[126.768,34.642],영덕:[129.366,36.416],장수:[127.521,35.648],완주:[127.163,35.904],산인:[128.429,35.286],진주:[128.108,35.180],포천:[127.201,37.895],세종:[127.289,36.480],김해:[128.890,35.228],기장:[129.222,35.244]}
Object.assign(centres,{구리:[127.129,37.594],근덕:[129.225,37.380],삼척:[129.165,37.450],청주:[127.489,36.640],회덕:[127.426,36.400],산내:[127.453,36.280],고창:[126.702,35.436],담양:[126.988,35.321],달서:[128.533,35.831],동대구:[128.628,35.878],언양:[129.125,35.570],당진:[126.628,36.893],파주:[126.780,37.760],양주:[127.045,37.785],새만금:[126.500,35.820]})
const xy=point=>[point.lng*89000,point.lat*111000]
function makeSegments(paths,name){
 const list=[];let offset=0
 for(const road of paths||[])if(road.name===name)for(let i=1;i<road.points.length;i++){
  const a=xy(road.points[i-1]),b=xy(road.points[i]),dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)
  if(length>0){list.push({a,b,dx,dy,length,offset});offset+=length}
 }
 return list
}
function atDistance(segments,distance){
 const last=segments.at(-1)
 const d=Math.max(0,Math.min(distance,last.offset+last.length))
 const s=segments.find(segment=>segment.offset+segment.length>=d)||last,t=(d-s.offset)/s.length
 return [s.a[0]+t*s.dx,s.a[1]+t*s.dy]
}
function locate(point,segments){
 const [x,y]=xy(point);let best=null
 for(const s of segments){
  const raw=((x-s.a[0])*s.dx+(y-s.a[1])*s.dy)/(s.length*s.length),t=Math.max(0,Math.min(1,raw))
  const px=s.a[0]+t*s.dx,py=s.a[1]+t*s.dy,distance=Math.hypot(x-px,y-py)
  if(!best||distance<best.distance)best={x:px,y:py,distance,offset:s.offset+t*s.length,raw,segment:s}
 }
 if(!best||best.distance>1200)return null
 if(best.segment===segments[0]&&best.raw<0||best.segment===segments.at(-1)&&best.raw>1)return null
 const before=atDistance(segments,best.offset-1000),after=atDistance(segments,best.offset+1000)
 const dx=after[0]-before[0],dy=after[1]-before[1],length=Math.hypot(dx,dy)
 return length?{...best,dx:dx/length,dy:dy/length}:null
}
export function journeyGroups(route,areas,shelters){
 return (route.highways||[]).map(road=>{
  const segments=makeSegments(route.paths,road.name), stops=[];let unverified=0
  for(const [type,rows] of [['rest',areas],['shelter',shelters]])for(const area of rows.filter(area=>sameRoad(area.routeName,road.name))){
   if(!area.coordinates){unverified++;continue}
   const match=locate(area.coordinates,segments)
   if(!match)continue
   const directions=type==='rest'?areaDirections(area):[String(area.direction||'').replace(/방향$/,'').trim()]
   let direction=null
   if(directions.includes('양방향'))direction='양방향'
   else{
    const scores=directions.filter(label=>centres[label]).map(label=>{
     const [lng,lat]=label==='광주'&&/광주원주/.test(roadKey(road.name))?[127.255,37.429]:centres[label],[x,y]=xy({lng,lat}),dx=x-match.x,dy=y-match.y
     return {label,score:(dx*match.dx+dy*match.dy)/Math.hypot(dx,dy)}
    })
    const forward=scores.filter(value=>value.score>.35)
    if(forward.length===1)direction=forward[0].label
    else if(!scores.length||scores.some(value=>Math.abs(value.score)<=.35))unverified++
   }
   if(direction)stops.push({...area,kind:type,journeyDirection:direction,journeyOffset:match.offset})
  }
  return {...road,stops:stops.sort((a,b)=>a.journeyOffset-b.journeyOffset),unverified}
 })
}
