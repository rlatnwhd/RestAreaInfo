export function priceDescending(a, b) {
  const knownA = typeof a.price === 'number' && Number.isFinite(a.price) && a.price >= 0
  const knownB = typeof b.price === 'number' && Number.isFinite(b.price) && b.price >= 0
  if (!knownA || !knownB) return Number(knownB) - Number(knownA)
  return b.price - a.price
}
