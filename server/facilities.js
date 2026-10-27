const definitions = [
  ['convenience', '편의', [['ev', '전기차 충전', '전기차 충전소'], ['nursing', '수유실', '수유실'], ['wifi', '와이파이', '와이파이'], ['store', '편의점', '편의점'], ['atm', 'ATM', 'ATM'], ['pharmacy', '약국', '약국']]],
  ['rest', '샤워·휴식', [['shower', '샤워실', '샤워실'], ['sleep', '수면실', '수면실'], ['laundry', '세탁실', '세탁실'], ['truck', '화물차 라운지', 'ex-화물차라운지'], ['garden', '쉼터', '쉼터']]],
  ['vehicle', '차량 관리', [['maintenance', '경정비', '경정비'], ['air', '타이어 공기압', '공기압점검기'], ['airgun', '에어건', '에어건'], ['vacuum', '진공청소기', '진공청소기'], ['mat', '매트 청소기', '매트청소기'], ['wash', '세차장', '세차장']]],
  ['access', '교통약자', [['accessibleParking', '장애인 전용 주차', '장애인 전용 주차'], ['tactile', '점자블록', '점자블록']]],
  ['transfer', '환승', [['bus', '고속버스 환승', '고속버스 환승']]]
]
export function facilityInventory(facilities, overview, supplementary = {}) {
  const names = new Set(facilities.map(row => row.psName))
  for (const row of overview) for (const value of (row.convenience || '').split('|')) if (value.trim()) names.add(value.trim())
  return definitions.map(([id, title, entries]) => ({ id, title, items: entries.map(([id, label, sourceName]) => {
    let status = names.has(sourceName) ? 'present' : 'unknown'
    let source = status === 'present' ? '한국도로공사 휴게소 편의시설' : null
    if (id === 'maintenance' && status === 'unknown') {
      const flags = new Set(overview.map(row => row.maintenanceYn).filter(value => ['O', 'X'].includes(value)))
      if (flags.size === 1) { status = flags.has('O') ? 'present' : 'absent'; source = '한국도로공사 노선별 편의시설 · 경정비 유무' }
    }
    const evidence = facilities.find(row => row.psName === sourceName)
    return { id, label, status, source, description: evidence?.psDesc || '', updatedAt: evidence?.lsttmAltrDttm || null, ...supplementary[id] }
  }) }))
}
