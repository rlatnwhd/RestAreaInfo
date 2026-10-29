import { storedLocation, saveLocation, flushLocations } from './location-cache.js'
import { journeyHighways, sameRoad } from '../src/utils/journey.js'
import { geocodeArea, shelterPlace, coordinates as geocodedCoordinates } from './geocoding.js'
import fs from 'node:fs'
import { operationFor, foodHoursFor } from './rest-area-info.js'
import { officialOverview, linkRelated } from './area-links.js'
import { facilityInventory } from './facilities.js'
import { snapshotFacilities } from './facility-snapshots.js'
import { expandAreaCatalog } from './area-catalog.js'
import { bothDirectionInfo } from './road-directions.js'
import { parkingFor, parkingSnapshot } from './parking.js'
import { basic, menu, brand, oilFacility, statistic, shelter, connectRows, text, number } from './normalizers.js'

export const STAT_PATH = '/15118977/v1/uddi:6b9e8fc2-34cf-4edb-a963-f9830622995d'
export const SHELTER_PATH = '/15043710/v1/uddi:e1b4ec79-63d7-414b-b010-ffbc50e87954'
export const PARKING_PATH = '/15043716/v1/uddi:9938ee7f-21f7-4c51-9912-812750bf1d0f'
const EX_ENDPOINTS = { basic: 'locationinfo/locationinfoRest', menus: 'restinfo/restBestfoodList', brands: 'restinfo/restBrandList', oilFacilities: 'restinfo/restOilList', facilities: 'restinfo/restConvList', routeFacilities: 'business/serviceAreaRoute' }
export class ApiError extends Error { constructor(message, status = 502, code = 'UPSTREAM_ERROR') { super(message); this.status = status; this.code = code } }
export function settings() {
  const values = { ...process.env }
  if (fs.existsSync('.env')) for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)
    if (match && !process.env[match[1]]) values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2')
  }
  return values
}
const cache = new Map(), pending = new Map()
async function cached(key, work) {
  const item = cache.get(key)
  if (item && item.expires > Date.now()) return item.data
  if (pending.has(key)) return pending.get(key)
  const task = work().then(data => { cache.set(key, { data, expires: Date.now() + 600_000 }); return data }).finally(() => pending.delete(key))
  pending.set(key, task)
  return task
}
async function fetchJson(url, headers = {}) {
  let response
  try { response = await fetch(url, { headers, signal: AbortSignal.timeout(20000) }) }
  catch { throw new ApiError('데이터 제공기관 연결이 지연되고 있어요. 잠시 후 다시 시도해 주세요.', 504, 'UPSTREAM_TIMEOUT') }
  if (!response.ok) throw new ApiError(response.status === 401 || response.status === 403 ? 'API 인증 또는 서비스 이용 권한을 확인해 주세요.' : '데이터 제공기관에서 정상 응답을 받지 못했습니다.', 502, 'UPSTREAM_HTTP')
  try { return await response.json() } catch { throw new ApiError('제공기관 응답이 예상한 JSON 형식이 아닙니다.', 502, 'INVALID_RESPONSE') }
}
function requireKey(key, label) { if (!key?.trim()) throw new ApiError(`${label} 인증키가 아직 설정되지 않았어요. 관리자 설정 후 이용할 수 있습니다.`, 503, 'MISSING_KEY') }
async function exPage(kind,filters,page) {
  const env=settings();requireKey(env.EX_API_KEY,'한국도로공사')
  return cached(JSON.stringify(['ex-page',kind,filters,page,env.EX_API_KEY]),async()=>{
    const url=new URL(`https://data.ex.co.kr/openapi/${EX_ENDPOINTS[kind]}`)
    url.search=new URLSearchParams({key:env.EX_API_KEY,type:'json',...filters,...(kind!=='oilFacilities'?{pageNo:String(page),numOfRows:'1000'}:{})}).toString()
    const body=await fetchJson(url)
    if(text(body.code).toUpperCase()==='ERROR'||body.list===null)throw new ApiError('한국도로공사 API가 요청을 거절했습니다. 인증키와 서비스 권한을 확인해 주세요.',502,'EX_REJECTED')
    if(!Array.isArray(body.list))throw new ApiError('한국도로공사 응답 필드를 확인할 수 없습니다.',502,'SCHEMA_CHANGED')
    return body
  })
}
export async function exRows(kind,filters={}) {
  const env=settings();requireKey(env.EX_API_KEY,'한국도로공사')
  return cached(JSON.stringify([kind,filters,env.EX_API_KEY]),async()=>{
    const first=await exPage(kind,filters,1),expected=number(first.count),rowsPerPage=number(first.numOfRows)||first.list.length
    const pages=kind==='oilFacilities'?1:number(first.pageSize)||number(first.pageSizes)||(expected&&rowsPerPage?Math.ceil(expected/rowsPerPage):1)
    if(pages>100)throw new ApiError('응답의 페이지 수가 수집 한도를 초과했습니다.',502,'PAGINATION_LIMIT')
    const lists=[first.list];let next=2
    async function worker(){while(next<=pages){const page=next++,body=await exPage(kind,filters,page);if(!body.list.length)throw new ApiError('페이지 응답이 비어 있어 전체 자료를 확인할 수 없습니다.',502,'INCOMPLETE_DATA');lists[page-1]=body.list}}
    await Promise.all(Array.from({length:Math.min(4,pages-1)},worker))
    const records=lists.flat()
    if(expected!==null&&expected>records.length)throw new ApiError('전체 건수와 수집 건수가 다릅니다. 페이지 설정 검증이 필요합니다.',502,'INCOMPLETE_DATA')
    return {rows:records,fetchedAt:new Date().toISOString(),source:'한국도로공사',endpoint:EX_ENDPOINTS[kind],count:records.length,fields:records[0]?Object.keys(records[0]):[]}
  })
}
async function menuCount() {
  const first=await exPage('menus',{},1),count=number(first.count)
  if(count===null)throw new ApiError('음식 메뉴 총건수를 확인할 수 없습니다.',502,'SCHEMA_CHANGED')
  return {count,fetchedAt:new Date().toISOString(),source:'한국도로공사'}
}
async function areas() {
  const [data, overviewResult] = await Promise.all([exRows('basic'), exRows('routeFacilities').then(value => ({ data: value })).catch(error => ({ error: error.message }))])
  const system = settings().EX_COORDINATE_SYSTEM
  const rows = expandAreaCatalog(data.rows.map((row, index) => basic(row, index, system)), overviewResult.data?.rows || [])
  const counts = new Map()
  rows.forEach(row => counts.set(row.code, (counts.get(row.code) || 0) + 1))
  return { ...data, rows: rows.map(row => {
    const area = { ...row, ambiguousCode: !row.code || counts.get(row.code) > 1 }
    const overview = officialOverview(area, overviewResult.data?.rows || [])
    const directions = [...new Set(overview.map(row => text(row.direction)).filter(Boolean))]
    const bidirectionalEvidence = bothDirectionInfo(area, rows)
    return { ...area, operation: operationFor(area), registeredDirections: directions, bidirectional: Boolean(bidirectionalEvidence), bidirectionalEvidence, directions: bidirectionalEvidence ? ['양방향'] : directions, direction: bidirectionalEvidence ? '양방향' : directions.length ? directions.join(' · ') : null, directionSource: bidirectionalEvidence ? bidirectionalEvidence.source : directions.length ? '한국도로공사 노선별·방향별 편의시설' : null, phone: overview.find(row => row.telNo)?.telNo || null, address: overview.find(row => row.svarAddr)?.svarAddr || null }
  }), count: rows.length, baseCount: data.count, catalogSources: ['locationinfo/locationinfoRest', ...(overviewResult.data ? ['business/serviceAreaRoute'] : [])], fields: data.fields, coordinateSystem: system === 'WGS84' ? 'WGS84 (관리자 확인)' : '미검증', directionVerified: false, directionSourceError: overviewResult.error || null }
}
async function details(id) {
  const data = await areas(), area = data.rows.find(row => row.id === id)
  if (!area) throw new ApiError('선택한 휴게소를 찾을 수 없습니다.', 404, 'NOT_FOUND')
  if (area.ambiguousCode) return { area, sources: {}, menus: [], brands: [], oilFacilities: [], visitorStats: null, warning: '식별코드가 누락되거나 중복되어 상세 데이터를 자동 결합하지 않았습니다.' }
  const sources = {}, result = { area, parking: null, foodHours: foodHoursFor(area), menus: [], brands: [], oilFacilities: [], facilities: [], visitorStats: null }
  await Promise.all([Promise.all(Object.entries({ menus: menu, brands: brand, facilities: row => row }).map(async ([kind, normalize]) => {
    try {
      const response = await exRows(kind, { stdRestCd: area.code })
      const joined = connectRows(area, response.rows)
      result[kind] = joined.rows.map(normalize)
      sources[kind] = { status: joined.status, rejected: joined.rejected, fetchedAt: response.fetchedAt, message: joined.rejected ? '코드 또는 명칭 불일치 항목을 제외했습니다.' : '' }
    } catch (error) { sources[kind] = { status: 'error', message: error instanceof ApiError ? error.message : '데이터 처리에 실패했습니다.' } }
  })), (async () => {
    const response = await parkingData()
    result.parking = parkingFor(area, data.rows, response)
    sources.parking = { status: response.mode, fetchedAt: response.fetchedAt, asOf: response.asOf }
  })(), (async () => {
    try {
      const response = await exRows('oilFacilities')
      const joined = linkRelated(area, data.rows, response.rows, 'oil')
      result.oilFacilities = joined.rows.map(row => ({ ...oilFacility(row), sourceName: row.stdRestNm }))
      sources.oilFacilities = { ...joined, rows: undefined, fetchedAt: response.fetchedAt }
    } catch (error) { sources.oilFacilities = { status: 'error', message: error.message } }
  })(), (async () => {
    try {
      const response = await statistics()
      const joined = linkRelated(area, data.rows, response.rows, 'statistics')
      result.visitorStats = joined.rows[0] || null
      sources.statistics = { ...joined, rows: undefined, fetchedAt: response.fetchedAt, datasetDate: response.datasetDate }
    } catch (error) { sources.statistics = { status: 'error', message: error.message } }
  })()])
  const overview = await exRows('routeFacilities').then(response => officialOverview(area, response.rows)).catch(() => [])
  result.facilityGroups = facilityInventory(result.facilities, overview, snapshotFacilities(area, data.rows))
  return { ...result, sources }
}
async function statistics() {
  const key = settings().ODCLOUD_API_KEY
  requireKey(key, '공공데이터포털')
  return cached(`stats:${key}`, async () => {
    const rows = []; let count = null
    for (let page = 1; page <= 100; page++) {
      const url = new URL(`https://api.odcloud.kr/api${STAT_PATH}`)
      let decoded = key
      try { decoded = decodeURIComponent(key) } catch { /* already decoded key */ }
      url.search = new URLSearchParams({ serviceKey: decoded, page: String(page), perPage: '1000', returnType: 'JSON' }).toString()
      const body = await fetchJson(url)
      if (!Array.isArray(body.data)) throw new ApiError('통계 응답의 data 필드를 확인할 수 없습니다.', 502, 'SCHEMA_CHANGED')
      count = number(body.totalCount)
      if (count === null) throw new ApiError('통계 전체 건수를 확인할 수 없습니다.', 502, 'SCHEMA_CHANGED')
      rows.push(...body.data)
      if (rows.length >= count) return { rows: rows.map(statistic), count, fetchedAt: new Date().toISOString(), source: '한국도로공사 / 공공데이터포털', datasetDate: '2024-12-31', linkingPolicy: 'unique-route-direction-name' }
      if (!body.data.length) break
    }
    throw new ApiError('통계 페이지 수집을 완료하지 못했습니다.', 502, 'INCOMPLETE_DATA')
  })
}
async function areaPoint(area) {
  const env=settings(), key=env.KAKAO_REST_API_KEY || env.ROUTE_API_KEY
  requireKey(key,'카카오 위치 검색')
  if(area.ambiguousCode)return null
  const stored=storedLocation('rest',area);if(stored)return stored
  return cached(`map-point:v2:${area.id}:${area.name}:${area.address}:${key}`,async()=>{
    let addresses=area.address?[area.address]:[]
    if(!addresses.length){
      try {
        const foods=await exRows('menus',{stdRestCd:area.code})
        const joined=connectRows(area,foods.rows)
        const values=[...new Set(joined.rows.map(row=>text(row.svarAddr)).filter(Boolean))]
        if(values.length===1)addresses=values
      } catch { /* A food-source outage must not prevent a verified place-name lookup. */ }
    }
    const point=await geocodeArea(area,addresses,async(kind,query)=>{
      const url=new URL(`https://dapi.kakao.com/v2/local/search/${kind}.json`)
      url.search=new URLSearchParams({query,size:'15'}).toString()
      return fetchJson(url,{Authorization:`KakaoAK ${key}`})
    })
    saveLocation('rest',area,point);return point
  })
}
async function mapPoint(id) {
  const data=await areas(),area=data.rows.find(row=>row.id===id)
  if(!area)throw new ApiError('선택한 휴게소를 찾을 수 없습니다.',404,'NOT_FOUND')
  const row=await areaPoint(area)
  return {row,status:row?'resolved':'unresolved'}
}
async function cachedMapPoints() {
  const data=await areas(),rows=data.rows.filter(area=>!area.ambiguousCode).map(area=>storedLocation('rest',area)).filter(Boolean)
  return {rows,count:rows.length,total:data.rows.length}
}
async function mapPoints() {
  const env=settings(),key=env.KAKAO_REST_API_KEY || env.ROUTE_API_KEY
  requireKey(key,'카카오 위치 검색')
  return cached(`map-points:v2:${env.EX_API_KEY}:${key}`,async()=>{
    const data=await areas(),rows=[];let cursor=0
    async function worker(){
      while(cursor<data.rows.length){
        const area=data.rows[cursor++]
        try{const point=await areaPoint(area);if(point)rows.push(point)}catch{}
      }
    }
    await Promise.all(Array.from({length:6},()=>worker()));flushLocations()
    return {rows,count:rows.length,total:data.rows.length,source:'한국도로공사 주소 / 카카오 Local',fetchedAt:new Date().toISOString(),precision:'주소 또는 휴게소명·방향으로 확인한 위치이며 진입로 좌표가 아닙니다.'}
  })
}
async function shelterPoint(id) {
  const data=await shelters(),area=data.rows.find(row=>row.id===id)
  if(!area)throw new ApiError('선택한 졸음쉼터를 찾을 수 없습니다.',404,'NOT_FOUND')
  const env=settings(),key=env.KAKAO_REST_API_KEY || env.ROUTE_API_KEY
  requireKey(key,'카카오 위치 검색')
  const stored=storedLocation('shelter',area);if(stored)return {row:stored,status:'resolved'}
  return cached(`shelter-point:${id}:${key}`,async()=>{
    const url=new URL('https://dapi.kakao.com/v2/local/search/keyword.json')
    url.search=new URLSearchParams({query:`${area.name.replace(/졸음쉼터/g,'')} 졸음쉼터 ${area.direction.replace(/방향$/,'')}방향`,size:'15'}).toString()
    const body=await fetchJson(url,{Authorization:`KakaoAK ${key}`})
    const place=shelterPlace(area,body.documents||[]),coordinates=geocodedCoordinates(place)
    const row=coordinates?{id:area.id,name:place.place_name,coordinates,address:place.road_address_name||place.address_name,placeId:place.id,coordinateSource:'카카오 장소 검색 · 졸음쉼터명·방향 일치'}:null
    saveLocation('shelter',area,row)
    return {row,status:row?'resolved':'unresolved'}
  })
}
async function places(query) {
  const env = settings(), key = env.KAKAO_REST_API_KEY || env.ROUTE_API_KEY
  requireKey(key, '카카오 장소 검색')
  if (!query.trim() || query.length > 100) throw new ApiError('장소명을 1~100자로 입력해 주세요.', 400, 'INVALID_QUERY')
  const headers = { Authorization: `KakaoAK ${key}` }
  const urls = ['keyword', 'address'].map(kind => { const url = new URL(`https://dapi.kakao.com/v2/local/search/${kind}.json`); url.search = new URLSearchParams({ query, size: '5' }).toString(); return fetchJson(url, headers) })
  const responses = await Promise.all(urls)
  const rows = responses.flatMap(body => {
    if (!Array.isArray(body.documents)) throw new ApiError('장소 검색 응답을 확인할 수 없습니다.')
    return body.documents.map(row => ({ id: row.id || `${row.x}:${row.y}`, name: row.place_name || row.address_name, address: row.road_address_name || row.address_name, lng: number(row.x), lat: number(row.y) }))
  }).filter(row => row.lng !== null && row.lat !== null)
  return { rows: [...new Map(rows.map(row => [row.id, row])).values()].slice(0, 8) }
}
async function route(search) {
  const key = settings().ROUTE_API_KEY
  requireKey(key, '자동차 경로')
  const point = value => {
    const [x, y, ...extra] = text(value).split(',')
    const lng = number(x), lat = number(y)
    if (extra.length || lng === null || lat === null || lng < 124 || lng > 132 || lat < 32 || lat > 40) throw new ApiError('검색 결과에서 출발지와 목적지를 선택해 주세요.', 400, 'INVALID_COORDINATES')
    return `${lng},${lat}`
  }
  const url = new URL('https://apis-navi.kakaomobility.com/v1/directions')
  url.search = new URLSearchParams({ origin: point(search.get('origin')), destination: point(search.get('destination')), summary: 'false', road_details: 'true', alternatives: 'false', priority: 'RECOMMEND' }).toString()
  return cached(`directions:${key}:${url.search}`,async()=>{
  const body = await fetchJson(url, { Authorization: `KakaoAK ${key}` })
  const result = body.routes?.[0]
  if (!result || result.result_code !== 0) throw new ApiError('자동차 이동 경로를 찾을 수 없습니다. 다른 장소를 선택해 주세요.', 422, 'ROUTE_NOT_FOUND')
  const paths = []
  for (const section of result.sections || []) for (const road of section.roads || []) {
    const points = []
    for (let index = 0; index + 1 < (road.vertexes?.length || 0); index += 2) {
      const lng = number(road.vertexes[index]), lat = number(road.vertexes[index + 1])
      if (lng !== null && lat !== null) points.push({ lng, lat })
    }
    if (points.length) paths.push({ name: text(road.name), points })
  }
  return { distance: number(result.summary?.distance), duration: number(result.summary?.duration), paths, highways:journeyHighways(result.sections), source:'카카오모빌리티', matchingMessage:'휴게소·졸음쉼터는 경로 주변 위치와 진행방향을 대조한 참고 정보입니다. 실제 진입은 현장 안내와 길찾기를 확인하세요.' }
  })
}
async function journeyPoints(search) {
  const routeData=await route(search),env=settings()
  const cacheKey=`journey-points:${search.get('origin')}:${search.get('destination')}:${env.EX_API_KEY}:${env.KAKAO_REST_API_KEY||env.ROUTE_API_KEY}`
  const result=await cached(cacheKey,async()=>{
    const data=await areas()
    let shelterRows=[],shelterError=''
    try{shelterRows=(await shelters()).rows}catch{ shelterError='졸음쉼터 자료를 불러오지 못했습니다.' }
    const relevant=area=>(routeData.highways||[]).some(road=>sameRoad(road.name,area.routeName))
    const tasks=[...data.rows.filter(relevant).map(area=>({...area,kind:'rest'})),...shelterRows.filter(relevant).map(area=>({...area,kind:'shelter'}))]
    const points=[];let cursor=0,failed=0
    async function worker(){while(cursor<tasks.length){
      const area=tasks[cursor++]
      try{
        const point=area.coordinates?area:area.kind==='rest'?await areaPoint(area):(await shelterPoint(area.id)).row
        points.push({...area,coordinates:point?.coordinates||null,address:point?.address||area.address})
      }catch{failed++;points.push({...area,coordinates:null})}
    }}
    await Promise.all(Array.from({length:4},worker))
    return {points,failed,shelterError}
  })
  if(result.failed||result.shelterError)cache.delete(cacheKey)
  return result
}
async function parkingData() {
  const key = settings().PARKING_API_KEY || settings().ODCLOUD_API_KEY
  if (!key) return { ...parkingSnapshot, count: parkingSnapshot.rows.length, mode: 'snapshot' }
  return cached(`parking:${key}`, async () => {
    try {
      let decoded = key
      try { decoded = decodeURIComponent(key) } catch { /* already decoded */ }
      const rows = []
      for (let page = 1; page <= 100; page++) {
        const url = new URL(`https://api.odcloud.kr/api${PARKING_PATH}`)
        url.search = new URLSearchParams({ serviceKey: decoded, page: String(page), perPage: '1000', returnType: 'JSON' }).toString()
        const body = await fetchJson(url), count = number(body.totalCount)
        const required = ['노선','휴게소명','합계','대형','소형','장애인']
        if (!Array.isArray(body.data) || count === null || body.data.some(row => required.some(field => !(field in row)))) throw new ApiError('주차장 응답 형식이 변경되었습니다.')
        rows.push(...body.data)
        if (rows.length >= count) return { rows, count, source: parkingSnapshot.source, sourceUrl: parkingSnapshot.sourceUrl, asOf: '2026-07-31', fetchedAt: new Date().toISOString(), mode: 'api' }
        if (!body.data.length) break
      }
      throw new ApiError('주차장 자료 수집을 완료하지 못했습니다.')
    } catch { return { ...parkingSnapshot, count: parkingSnapshot.rows.length, mode: 'snapshot', apiAvailable: false } }
  })
}
async function shelters() {
  const key = settings().SHELTER_API_KEY || settings().ODCLOUD_API_KEY
  requireKey(key, '졸음쉼터')
  return cached(`shelters:${key}`, async () => {
    const rows = []
    for (let page = 1; page <= 100; page++) {
      let decoded = key
      try { decoded = decodeURIComponent(key) } catch { /* already decoded */ }
      const url = new URL(`https://api.odcloud.kr/api${SHELTER_PATH}`)
      url.search = new URLSearchParams({ serviceKey: decoded, page: String(page), perPage: '1000', returnType: 'JSON' }).toString()
      const body = await fetchJson(url)
      const count = number(body.totalCount)
      if (!Array.isArray(body.data) || count === null) throw new ApiError('졸음쉼터 응답 형식을 확인할 수 없습니다.', 502, 'SCHEMA_CHANGED')
      const required = ['번호','명칭','노선','방향','이정','설치년도']
      if (body.data.some(row => required.some(field => !(field in row)))) throw new ApiError('졸음쉼터 응답 필드가 변경되었습니다.', 502, 'SCHEMA_CHANGED')
      rows.push(...body.data)
      if (rows.length >= count) return { rows: rows.map(shelter), count, datasetDate: '2026-08-01', fetchedAt: new Date().toISOString(), source: '한국도로공사 졸음쉼터 설치현황', sourceUrl: 'https://www.data.go.kr/data/15043710/fileData.do' }
      if (!body.data.length) break
    }
    throw new ApiError('졸음쉼터 전체 자료를 수집하지 못했습니다.', 502, 'INCOMPLETE_DATA')
  })
}
export async function api(path, search) {
  if (path === '/api/parking') return parkingData()
  if (path === '/api/status') {
    const env = settings()
    return { publicMapKey: env.KAKAO_MAP_JS_KEY || env.VITE_KAKAO_MAP_APP_KEY || '', sources: { ex: Boolean(env.EX_API_KEY), statistics: Boolean(env.ODCLOUD_API_KEY), places: Boolean(env.KAKAO_REST_API_KEY || env.ROUTE_API_KEY), route: Boolean(env.ROUTE_API_KEY), map: Boolean(env.KAKAO_MAP_JS_KEY || env.VITE_KAKAO_MAP_APP_KEY) }, coordinateVerified: env.EX_COORDINATE_SYSTEM === 'WGS84', directionVerified: false }
  }
  if (path === '/api/rest-areas') return areas()
  if (path === '/api/rest-area') return details(search.get('id'))
  if (path === '/api/menu-count') return menuCount()
  if (path === '/api/menus') {
    const id = search.get('id')
    if (id) {
      const catalogue = await areas(), area = catalogue.rows.find(row => row.id === id)
      if (!area) throw new ApiError('선택한 휴게소를 찾을 수 없습니다.', 404, 'NOT_FOUND')
      if (area.ambiguousCode) throw new ApiError('휴게소 식별코드를 확인할 수 없습니다.', 422, 'AMBIGUOUS_AREA')
      const data = await exRows('menus', { stdRestCd: area.code })
      const joined = connectRows(area, data.rows), rows = joined.rows.map(menu)
      return { ...data, rows, count: rows.length, area }
    }
    const data = await exRows('menus'); return { ...data, rows: data.rows.map(menu) }
  }
  if (path === '/api/oil-facilities') { const data = await exRows('oilFacilities'); return { ...data, rows: data.rows.map(oilFacility) } }
  if (path === '/api/statistics') return statistics()
  if (path === '/api/shelters') return shelters()
  if (path === '/api/shelter-point') return shelterPoint(search.get('id'))
  if (path === '/api/map-point') return mapPoint(search.get('id'))
  if (path === '/api/map-points-cached') return cachedMapPoints()
  if (path === '/api/map-points') return mapPoints()
  if (path === '/api/places') return places(search.get('query') || '')
  if (path === '/api/journey-points') return journeyPoints(search)
  if (path === '/api/route') return route(search)
  throw new ApiError('요청한 API가 없습니다.', 404, 'NOT_FOUND')
}
