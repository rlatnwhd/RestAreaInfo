export async function request(path, params = {}, signal) {
  const query = new URLSearchParams(params).toString()
  const response = await fetch(`/api/${path}${query ? '?' + query : ''}`, { signal })
  let body
  try { body = await response.json() } catch { throw new Error('API 서버에 연결할 수 없습니다. npm run dev로 실행해 주세요.') }
  if (!response.ok) throw new Error(body.error || '데이터를 불러오지 못했습니다.')
  return body
}
export function price(value) { return value == null ? '가격 정보 없음' : `${value.toLocaleString('ko-KR')}원` }
export function date(value) { if (!value) return '정보 없음'; const d = new Date(value); return Number.isNaN(d.getTime()) ? value : d.toLocaleString('ko-KR') }
