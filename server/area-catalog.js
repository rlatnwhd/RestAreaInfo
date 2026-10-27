import { text } from './normalizers.js'
// These legacy API labels describe two routes sharing a number. The affected
// records are checked against the 2026 official operation inventory.
const sharedRouteLabels = { '0120': '광주대구선', '0350': '통영대전선' }
export function expandAreaCatalog(basics, overview) {
  const result = basics.map(area => ({ ...area, catalogSource: 'locationinfo/locationinfoRest' }))
  const codes = new Set(basics.map(area => area.code))
  const existingRoutes = new Map(basics.filter(area => area.routeCode && area.routeName).map(area => [area.routeCode, area.routeName]))
  const grouped = new Map()
  for (const row of overview) {
    const code = text(row.serviceAreaCode2)
    if (!code || codes.has(code)) continue
    if (!grouped.has(code)) grouped.set(code, [])
    grouped.get(code).push(row)
  }
  for (const [code, rows] of grouped) {
    const names = new Set(rows.map(row => text(row.serviceAreaName)))
    const roads = new Set(rows.map(row => text(row.routeCode)))
    if (names.size !== 1 || roads.size !== 1) continue
    const row = rows[0], routeCode = text(row.routeCode)
    const routeName = existingRoutes.get(routeCode) || sharedRouteLabels[routeCode] || text(row.routeName)
    // Missing road labels and placeholder records remain excluded, rather than
    // inventing a road name/number from undocumented codes such as 7001.
    if (!text(row.serviceAreaName) || !text(row.serviceAreaCode) || !routeCode || !routeName || routeName.includes(',')) continue
    result.push({ id: `${code}:${text(row.serviceAreaCode)}:overview`, code, name: text(row.serviceAreaName), routeCode, routeName, serviceAreaCode: text(row.serviceAreaCode), unitCode: '', direction: null, coordinates: null, rawCoordinates: null, ambiguousCode: false, catalogSource: 'business/serviceAreaRoute' })
  }
  return result
}
