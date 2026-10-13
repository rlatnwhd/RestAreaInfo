# 실제 API 검증 — 2026-10-13

인증정보는 로컬 `.env`에서 읽었으며 검증 결과에 키를 기록하지 않았습니다. 원본 공개 문서의 설명과 실제 응답을 구분했습니다.

| 서비스 | 실제 결과 | 페이지·식별자 | 사용 방식 |
| --- | --- | --- | --- |
| locationinfoRest | 203곳 | list, count, pageSize, numOfRows, stdRestCd | 기준정보·검색·상세 기준 |
| restBestfoodList | 7,255건 | list, count, pageSize, stdRestCd | 음식·가격, 공식 코드 결합 |
| restBrandList | 699건 및 샘플 결합 | list, count, pageSize, stdRestCd | 입점 브랜드·원본 등록 시간 |
| restOilList | 432건 | list, count, stdRestCd | 독립 주유소 시설 화면 |
| ODCLOUD 15118977/v1 | 207건 | data, totalCount, page, perPage, 순번 | 독립 과거 통계 |
| Kakao Local | 장소·주소 실제 응답 | documents, id, x, y | 검색 결과 선택·주소 변환 |
| Kakao Mobility | 실제 서울–부산 경로 정상 | routes, summary, sections.roads.vertexes | 자동차 경로 선, API 거리·소요시간 |

## 정확한 통계 요청 경로 및 필드

Swagger에서 확정한 요청 경로:

`https://api.odcloud.kr/api/15118977/v1/uddi:6b9e8fc2-34cf-4edb-a963-f9830622995d`

인증은 `serviceKey`, 페이지는 `page`, `perPage`, JSON 반환은 `returnType=JSON`입니다. 원본에는 `순번`, `노선명`, `휴게소명`, `소재지`, `부지면적(제곱미터)`, 주차 항목, `운영형태`, `1일 이용객수(17년)`, `1일 차량 통행량(24년)`이 있습니다. 방문객은 2017년, 교통량은 2024년입니다. 데이터셋 제목의 20241231을 두 수치 모두의 집계 연도로 쓰지 않습니다.

`stdRestCd`는 통계에 없으므로 기준정보에 자동 결합하지 않습니다. 이름이나 순번으로 동일 휴게소를 확정하지 않습니다.

## 공식 코드 결합 샘플

실제 서울만남(부산)휴게소 000001: 메뉴 54건, 브랜드 2건을 코드와 명칭 일치로 연결했습니다. 죽전(서울)휴게소 000003: 메뉴 19건, 브랜드 3건을 확인했습니다. 원본 명칭이 불일치하는 자료는 제외합니다.

주유소 시설 전체 자료에는 서울만남(부산)주유소가 000002로 제공됩니다. 휴게소 000001과 다른 식별자이므로 자동 결합하지 않았습니다. 코드 관계를 설명하는 추가 공식 자료가 필요합니다.

추천·베스트·프리미엄의 실제 값은 Y/N입니다. 계절 값은 문서의 대문자 S/W와 달리 실제 응답에서 4/s/w로 확인되어 대소문자를 정규화합니다.

## 위치·경로 판단

기준정보 응답은 xValue=127.042514, yValue=37.459939와 같은 값을 제공하지만 제공받은 명세에 좌표계 선언이 없어 단순 범위만으로 WGS84를 확정하지 않았습니다. 원본 좌표 대신 정확한 공식 코드로 연결된 메뉴 주소를 카카오 Local 주소 검색에 요청하여 단일 결과인 경우에만 지도 위치로 사용합니다. 203곳 중 130곳을 확인했습니다. 나머지는 주소 모호성·검색 실패 등을 포함하며 추측하지 않습니다.

자동차 경로 API는 실제 도로 geometry와 안내를 제공하지만 휴게소의 공식 진입 방향·접속 도로 코드가 없어 정확한 경로상 휴게소 및 주행 순서 판별은 완료하지 않았습니다. 추가로 공식 휴게소 진입로/출구 도로 식별자와 방향 정보가 필요합니다. 거리 기반 근접 검색을 최종 결과로 대체하지 않았습니다.

## 지도 도메인 확인

제공된 지도 키는 `http://localhost:5173`에서 JavaScript SDK 정상 응답을 확인했습니다. `http://127.0.0.1:5174` 요청에서는 `domain mismatched` 오류가 발생했습니다. 개발 서버를 등록된 localhost 도메인에 맞추고 실제 브라우저에서 지도 및 경로 표시를 검증했습니다.

## 출처

- [한국도로공사 기준정보](https://www.data.go.kr/data/15076770/openapi.do)
- [통계 Swagger](https://infuser.odcloud.kr/oas/docs?namespace=15118977/v1)
- [카카오 Local API](https://developers.kakao.com/docs/latest/ko/local/dev-guide)
- [카카오모빌리티 자동차 길찾기](https://developers.kakaomobility.com/guide/navi-api/directions)
- [카카오 지도 SDK](https://apis.map.kakao.com/web/guide/)

세부 응답 필드와 실제 검증 스냅샷은 `api-verification.json`을 확인합니다. 건수는 다음 조회 시 변경될 수 있습니다. 최종수정일이 제공되는 음식·브랜드·시설에만 해당 날짜를 표시하며 기준정보 조회 시각은 원본 갱신일이 아닙니다.
