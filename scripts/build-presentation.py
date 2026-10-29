from pathlib import Path
import json
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'presentation'; A=OUT/'assets'
data=json.loads((A/'verified-data.json').read_text(encoding='utf-8'))
r=Presentation(); r.slide_width=Inches(13.333); r.slide_height=Inches(7.5)
NAVY='20304B'; TEAL='47858A'; GOLD='F0BC5E'; INK='26364A'; MUTED='708097'; BG='F4F7FA'; WHITE='FFFFFF'
notes=[]
def box(s,x,y,w,h,color,line=None):
    sh=s.shapes.add_shape(5, Inches(x), Inches(y), Inches(w), Inches(h))
    sh.fill.solid(); sh.fill.fore_color.rgb=RGBColor.from_string(color)
    sh.line.fill.background() if not line else None
    if line: sh.line.color.rgb=RGBColor.from_string(line)
    return sh
def txt(s,text,x,y,w,h,size=20,color=INK,bold=False):
    sh=s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h)); tf=sh.text_frame; tf.word_wrap=True
    tf.margin_left=tf.margin_right=Inches(.02); tf.margin_top=Inches(.02)
    for i,line in enumerate(text.split('\n')):
        p=tf.paragraphs[0] if i==0 else tf.add_paragraph(); p.text=line; p.font.name='맑은 고딕'; p.font.size=Pt(size); p.font.bold=bold; p.font.color.rgb=RGBColor.from_string(color); p.space_after=Pt(10)
    return sh
def pic(s,name,x,y,w,h):
    path=A/name if name!='food.png' else ROOT/'icons/food.png'
    iw,ih=Image.open(path).size; scale=min(w/iw,h/ih); ww,hh=iw*scale,ih*scale
    s.shapes.add_picture(str(path), Inches(x+(w-ww)/2), Inches(y+(h-hh)/2), width=Inches(ww),height=Inches(hh))
def slide(title,kicker,note):
    s=r.slides.add_slide(r.slide_layouts[6]); s.background.fill.solid(); s.background.fill.fore_color.rgb=RGBColor.from_string(BG)
    txt(s,kicker.upper(),.55,.25,11,.3,11,TEAL,True); txt(s,title,.55,.78,12.2,.8,29,NAVY,True)
    box(s,.55,7.13,12.2,.012,'DCE4EB'); txt(s,'휴게길  ·  김수종 / 202395007',.55,7.22,10,.2,9,MUTED); txt(s,f'{len(r.slides):02}',12.1,7.18,.6,.3,11,TEAL,True)
    s.notes_slide.notes_text_frame.text=note; notes.append((title,note)); return s
def card(s,x,y,w,h,title,body):
    box(s,x,y,w,h,WHITE); box(s,x,y,.055,h,TEAL); txt(s,title,x+.22,y+.2,w-.4,.6,21,NAVY,True); txt(s,body,x+.22,y+.95,w-.45,h-.95,17,MUTED)

s=slide('휴게길','PUBLIC DATA × HIGHWAY JOURNEY','[15초] 안녕하세요. 김수종입니다. 휴게길은 이동 경로에 맞춰 휴게소와 졸음쉼터를 찾고, 음식과 시설을 비교하는 공공데이터 기반 웹사이트입니다.')
box(s,.55,1.8,6.05,4.85,NAVY); pic(s,'food.png',.9,2.15,.85,.85)
txt(s,'가는 길의 쉼,\n공공데이터로 한눈에',.95,3.2,5.3,1.8,34,WHITE,True)
txt(s,'김수종  |  202395007\n프로젝트 1 발표  ·  2026.10.28',.95,5.55,5.2,.8,16,'C9D9E4')
pic(s,'route-home.png',6.9,1.8,5.85,4.85)

s=slide('운전자는 장소보다 ‘가는 방향의 정보’가 필요합니다','01 / PROBLEM & USER VALUE','[40초] 휴게소는 반대 방향에 있으면 이용하기 어렵습니다. 음식, 입점 매장, 주차 정보를 여러 곳에서 찾는 번거로움도 있습니다. 경로와 방향을 중심으로 정보를 모으고, 같은 기준으로 비교하도록 설계했습니다.')
for x,t,b in [( .55,'어디서 쉴까?','노선과 진행 방향에 맞는\n휴게소 · 졸음쉼터 탐색'),(4.7,'무엇을 먹을까?','음식 가격과 입점 브랜드,\n등록 운영시간 확인'),(8.85,'어느 곳이 나을까?','같은 음식 가격과 주차 규모,\n과거 이용량을 나란히 비교')]: card(s,x,2.0,3.92,3.25,t,b)
box(s,.55,5.65,12.2,.85,NAVY); txt(s,'출발 전 탐색 → 이동 중 휴식 계획 → 방문할 곳 선택',.85,5.85,11.6,.45,23,WHITE,True)

s=slide('흩어진 공공데이터를 휴게소 단위로 연결했습니다','02 / DATA SOURCES','[45초] 한국도로공사 기준정보, 메뉴, 브랜드 자료와 공공데이터포털의 졸음쉼터, 주차장, 과거 이용량을 연결했습니다. 10월 28일 실제 조회 결과입니다. 카카오 API는 지도 표시, 장소 검색과 자동차 경로에 사용합니다. 주차는 빈자리 수가 아닌 공식 주차면 수입니다. 출처: data.ex.co.kr/openapi, data.go.kr/data/15043710/fileData.do, data.go.kr/data/15043716/fileData.do, data.go.kr/data/15118977/fileData.do, developers.kakao.com, developers.kakaomobility.com.')
for x,num,label in [(.55,str(data['areaCount']),'휴게소'),(3.1,f"{data['menuCount']:,}",'음식 메뉴'),(5.65,str(data['shelterCount']),'졸음쉼터')]:
    box(s,x,1.85,2.3,1.35,WHITE); txt(s,num,x+.16,2,2,.6,32,TEAL,True); txt(s,label,x+.16,2.7,2,.35,14,MUTED)
txt(s,'한국도로공사  ·  기준정보 / 음식 / 브랜드 / 시설\n공공데이터포털  ·  쉼터 / 주차 / 과거 이용량\n카카오  ·  지도 / 장소 검색 / 자동차 경로',.65,3.65,7.4,1.8,20,INK)
box(s,8.25,1.85,4.5,4.9,NAVY); txt(s,'실제 응답 예시 · 죽전(서울)',8.5,2.1,4,.5,18,WHITE,True)
p=data['example']['parking']; txt(s,f'주차면 수  {p["total"]}면\n소형  {p["small"]} / 대형  {p["large"]}\n장애인 전용  {p["accessible"]}\n\n자료 기준  {p["asOf"]}\n조회 확인  2026-10-28',8.5,2.95,4,3.2,21,WHITE)
txt(s,'수량은 조회 시점 기준 · 등록 정보이며 실시간 상태와 다를 수 있습니다.',.65,6.15,7.3,.5,13,MUTED)

s=slide('찾기 · 확인하기 · 비교하기로 이어지는 사용 흐름','03 / CORE EXPERIENCE','[50초] 첫째 출발지와 도착지를 검색하면 경로와 관련 고속도로, 해당 방향의 휴게소와 졸음쉼터를 확인합니다. 둘째 상세창에서 음식, 브랜드, 시설, 위치를 확인합니다. 셋째 비교할 휴게소를 담아 같은 음식의 저렴한 쪽과 주차 규모 등을 비교합니다. 방향은 경로와 자료에 기반한 판정이며 실제 진입 가능성을 보증하지는 않습니다.')
pic(s,'route-result.png',.55,1.8,8.2,4.95)
for y,t,b in [(1.9,'경로에 맞게 찾기','고속도로 · 방향 · 휴식 지점'),(3.5,'방문 전에 확인하기','음식 · 브랜드 · 시설 · 위치'),(5.1,'같은 기준으로 비교하기','동일 음식 가격 · 주차 규모')]: card(s,9,y,3.75,1.4,t,b)

s=slide('생성형 AI는 개발 보조에 활용했습니다','04 / AI USE & VERIFICATION','[45초] 이 프로젝트의 AI 활용은 Codex를 통한 개발 보조입니다. 사용자 입력을 받아 AI가 추천하는 런타임 기능은 구현하지 않았습니다. 실제 요구사항을 전달해 코드와 UI를 수정하고, 실제 API 응답과 테스트로 확인했습니다. 분류 기준이 모호했던 음식 분류는 제거했고, 없는 데이터는 만들어내지 않고 확인 불가로 표시했습니다. 평가표의 사용자 대상 AI 기능은 향후 개선 과제입니다.')
card(s,.55,1.9,7.45,2.0,'실제 개발 요청 ①','“사용자가 사용하기 쉽도록 … 무조건 반응형으로 만들어야 해.”')
card(s,.55,4.1,7.45,2.1,'실제 개발 요청 ②','“출발-도착을 입력하면 어떤 고속도로를 타는지 …\n휴게소 … 졸음쉼터 … 정보를 출력해줘.”')
box(s,8.3,1.9,4.45,4.3,NAVY); txt(s,'요구사항 입력\n↓\nCodex · 코드 / UI 수정\n↓\n실제 응답 · 테스트 확인',8.6,2.25,3.85,2.8,23,WHITE,True)
txt(s,'앱 내부 AI 추천 기능은 미구현',8.6,5.5,3.9,.5,15,GOLD,True)

s=slide('정보의 우선순위를 정리하고 모바일까지 맞췄습니다','05 / UI DESIGN','[40초] 왼쪽은 초기 구조를 설명하기 위해 재구성한 와이어프레임입니다. 원본 초기 산출물은 아닙니다. 오른쪽은 현재 앱 화면입니다. 긴 정보를 탭으로 나누고 브랜드 로고, 운영 상태, 기준일을 보여줍니다. 화면 폭이 줄어들면 카드가 자연스럽게 재배치됩니다. 로딩과 오류 상태도 별도로 안내합니다.')
txt(s,'초기 구조 재구성',.65,1.7,3,.4,15,MUTED,True)
box(s,.65,2.25,3.1,4.2,'E3E8ED'); box(s,.85,2.5,2.7,.5,'BDC8D2')
for yy in [3.25,4.1,4.95]: box(s,.85,yy,2.7,.6,'CDD6DF')
txt(s,'검색\n\n정보 목록\n\n상세 정보',1,3.2,2.3,2.5,16,MUTED)
txt(s,'현재 화면 · 브랜드 정보',4.1,1.7,6,.4,15,TEAL,True); pic(s,'brands.png',4.1,2.2,6,4.4)
pic(s,'mobile.png',10.4,1.7,2.35,4.95)

s=slide('실제 사용 흐름을 시연하겠습니다','06 / LIVE DEMO · 2분 30초','[150초] 발표 전 배포 URL을 이 슬라이드에 입력하고 실제 접속을 확인하세요. 시연 1: 출발지 서울만남의광장휴게소와 도착지 안성시청을 검색해 장소를 선택한 뒤 경로를 찾습니다(50초). 시연 2: 휴게소 상세에서 메뉴, 브랜드 운영시간, 주차와 지도 확인(40초). 시연 3: 두 휴게소를 비교해 같은 음식 가격과 주차면 수 확인(40초). 시연 4: 졸음쉼터 위치 확인 및 처음 화면으로 복귀(20초). 장애 시 이 자료의 실제 화면 캡처로 설명합니다. 배포 URL은 미전달 상태이며 현재 배포 여부를 검증하지 않았습니다.')
pic(s,'route-result.png',.55,1.85,8,4.65)
txt(s,'01  출발 · 도착 → 경로 검색\n02  휴게소 상세 정보 확인\n03  두 휴게소 비교\n04  쉼터 위치 · 처음 화면',8.9,2,3.85,3.5,21,INK,True)
box(s,8.9,5.65,3.85,.9,TEAL); txt(s,'배포 URL 입력',9.15,5.92,3.35,.4,18,WHITE,True)

s=slide('화면과 API를 분리해 운영할 수 있도록 구성했습니다','07 / STACK & DEPLOYMENT','[45초] 프런트엔드는 React 19와 Vite 7, 백엔드는 Node.js 기반 API 중계 서버입니다. 서버에서 한국도로공사, 공공데이터포털, 카카오 REST API를 호출하며 REST 인증키는 서버 환경변수로 관리합니다. 지도 JavaScript 키는 도메인 설정이 필요합니다. 좌표 캐시, 요청 병렬화와 로딩 상태로 초기 표시를 개선했습니다. 이 슬라이드의 배포 완료는 사용자 요청에 따른 배포 후 발표용 문구입니다. 실제 공개 URL 전달과 접속 검증은 아직 필요합니다. 실제 완료 전에는 발표에서 완료 사실로 말하지 마세요.')
card(s,.55,2.05,3.55,2.55,'React 19 + Vite 7','반응형 UI · 상태 관리\n지도 · 비교 · 로딩 안내')
txt(s,'→',4.2,2.8,.5,.6,30,TEAL,True)
card(s,4.85,2.05,3.55,2.55,'Node.js 서버','API 중계 · 데이터 정규화\n환경변수 · 좌표 캐시')
txt(s,'→',8.5,2.8,.5,.6,30,TEAL,True)
card(s,9.2,2.05,3.55,2.55,'외부 데이터','한국도로공사 · 공공데이터\nKakao Maps / Mobility')
box(s,.55,5.05,12.2,1.25,NAVY); txt(s,'배포 완료',.85,5.38,2.5,.6,25,GOLD,True); txt(s,'서비스 주소  |  배포 URL 입력',3.7,5.42,8.5,.6,22,WHITE)
txt(s,'배포 후 발표용 문구 · 제출 전 공개 URL과 접속 상태 확인',.7,6.5,12,.35,12,MUTED)

s=slide('많은 탭보다, 결정에 필요한 정보를 선명하게','08 / IMPACT & LIMITS','[40초] 핵심 가치는 방문할 장소를 결정하기 위한 정보를 한 흐름에 모았다는 점입니다. 같은 음식은 가격을 직접 비교하고, 주차는 등록 면수로 비교합니다. 자료가 없는 항목은 없음과 구분합니다. 주차 실시간 빈자리와 실제 영업 상태는 제공하지 못하며, 경로 인근 판정도 진입 가능성을 보장하지 않습니다. 사용자 대상 AI 기능, 방향 검증 보강과 실사용자 평가가 다음 과제입니다.')
card(s,.55,1.95,5.9,2.15,'사용자에게 주는 가치','가는 방향으로 탐색 · 방문 정보 통합\n동일 음식 가격과 주차 규모 비교')
card(s,6.7,1.95,6.05,2.15,'정보의 신뢰성을 위한 장치','자료 기준일 표시 · 미상과 없음 구분\n로딩 / 오류 / 재시도 상태 안내')
box(s,.55,4.5,12.2,1.9,NAVY); txt(s,'다음 개선',.85,4.75,2,.45,21,GOLD,True); txt(s,'실시간 빈자리 · 실제 영업 상태 연계\n진입 방향 검증 보강 · 사용자 대상 AI 기능 검토',3.1,4.75,9.1,1.15,21,WHITE)

s=slide('이동 경로에 맞는 쉼을 더 쉽게','09 / Q&A','[20초] 휴게길은 공공데이터를 이동 경로라는 맥락으로 연결해, 어디에서 쉴지 선택하는 과정을 돕습니다. 들어주셔서 감사합니다. 질문 받겠습니다. 발표 총 예상 시간 9분 50초이며 시연 2분 30초를 포함합니다.')
pic(s,'food.png',.8,2.2,1.3,1.3); txt(s,'찾고, 확인하고, 비교하세요.',2.5,2.45,9.6,.9,34,NAVY,True)
txt(s,'경로에 맞는 휴식 장소  ·  방문 전 정보  ·  한눈에 비교',2.5,3.65,9.6,.7,22,TEAL)
box(s,.8,5.1,11.9,1.1,NAVY); txt(s,'Q&A',1.15,5.35,3,.6,29,WHITE,True); txt(s,'김수종  /  202395007',8.2,5.45,4.1,.5,19,WHITE)

path=OUT/'휴게길_프로젝트1_발표_김수종.pptx'; r.save(path)
(OUT/'발표대본_및_데모가이드.md').write_text('# 휴게길 발표 대본 및 시연 가이드\n\n총 9분 50초 예상, 시연 포함.\n\n'+'\n\n'.join(f'## {i}. {t}\n\n{n}' for i,(t,n) in enumerate(notes,1)),encoding='utf-8')
(OUT/'제출전_확인사항.md').write_text('''# 제출 전 확인사항

- 10장, 발표자 노트 포함. 실제 앱 화면과 2026-10-28 조회 수치를 사용했습니다.
- 사용자 요청대로 배포 후 발표용 “배포 완료” 문구를 넣었습니다. 현재 공개 URL과 배포 상태는 확인하지 못했습니다. **7·8장 URL을 실제 공개 주소로 교체하고, 배포 완료 후 해당 문구를 사용하세요.**
- 실제 배포 사이트에서 카카오 지도 허용 도메인, 장소 검색, 경로 검색, 상세 정보와 모바일 화면을 확인하세요.
- 발표 가이드: 7~10분, 시연 필수, 8~10장. 예상 9분 50초이며 시연 2분 30초입니다.
- 평가 기준의 사용자 대상 AI 기능은 현재 앱에 없습니다. AI 개발 보조 활용으로 정직하게 기술했으며, AI 기능 평가 요건을 모두 충족한다고 주장하지 않습니다.
- 6장 와이어프레임은 초기 구조 재구성이며 당시 원본 산출물이 아닙니다.
- 주차는 공식 주차면 수이며 실시간 빈자리 수가 아닙니다. 브랜드 영업 상태는 등록 시간 기준입니다.
- 네트워크 장애 시 assets 폴더의 실제 캡처와 PDF로 설명할 수 있습니다.
- 자료 출처: 한국도로공사 OpenAPI(data.ex.co.kr), 공공데이터포털(data.go.kr), Kakao Developers 및 Kakao Mobility Developers. 구체 출처는 3장 발표자 노트와 앱에서 확인할 수 있습니다.
''',encoding='utf-8')
print(path)
print('slides:',len(r.slides))
