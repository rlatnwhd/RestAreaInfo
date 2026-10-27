import json,urllib.request,urllib.parse,re,concurrent.futures,pathlib
sites={
'로띠번':'https://www.rotibun.co.kr/','탐앤탐스':'https://www.tomntoms.com/','할리스커피':'https://www.hollys.co.kr/','드롭탑(커피전문점)':'https://www.cafedroptop.com/','파스쿠찌':'https://www.caffe-pascucci.co.kr/','CU':'https://cu.bgfretail.com/','엔제리너스':'https://www.angelinus.com/','던킨도너츠':'https://www.dunkindonuts.co.kr/','투썸플레이스':'https://www.twosome.co.kr/','이마트24':'https://www.emart24.co.kr/','용우동':'https://www.yongwoodong.co.kr/','달콤커피':'https://www.dalkomm.com/','클라이머홀릭':'https://www.climerholic.com/','롯데리아':'https://www.lottegrs.com/kor/brand/lotteria.jsp','GS25':'https://gs25.gsretail.com/gscvs/ko/main','코바코':'https://www.cobaco.com/','공차':'https://www.gong-cha.co.kr/','JDX':'https://www.jdx.co.kr/','세븐일레븐':'https://www.7-eleven.co.kr/','임실치즈피자':'https://www.imsilcheesepizza.com/','한신우동':'https://www.hanshinudon.co.kr/','뚜레쥬르':'https://www.tlj.co.kr/','NEPA':'https://www.nepamall.com/','ELLEGOLF':'https://www.ellegolf.co.kr/','파리바게뜨':'https://www.paris.co.kr/','앤티앤스프레즐':'https://www.auntieannes.co.kr/','나뚜루':'https://www.natuur.co.kr/','크리스피크림':'https://www.krispykreme.co.kr/','카페베네':'https://www.caffebene.co.kr/','스태프핫도그':'https://www.steffhotdog.com/','배스킨라빈스':'https://www.baskinrobbins.co.kr/','스트릿츄러스':'https://www.streetchurros.com/','성북당':'https://www.seongbukdang.com/','BBQ':'https://bbq.co.kr/','LYNX':'https://www.lynxkorea.com/','팬텀':'https://www.creasmall.com/','뉴욕핫도그':'https://www.nyhotdog.co.kr/','로티보이':'https://www.rotiboykorea.com/','설빙':'https://sulbing.com/','맥도날드':'https://www.mcdonalds.co.kr/','스무티킹':'https://www.smoothieking.co.kr/','스타벅스':'https://www.starbucks.co.kr/'}
root=pathlib.Path('artifacts/research/brand-sites');root.mkdir(parents=True,exist_ok=True)
def work(pair):
 name,url=pair
 try:
  req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
  with urllib.request.urlopen(req,timeout=12) as response: raw=response.read();base=response.url
  html=raw.decode('utf-8',errors='replace');(root/(str(list(sites).index(name))+'.html')).write_text(html,encoding='utf-8')
  candidates=[]
  for tag in re.findall(r'<(?:img|source|input|link)\b[^>]*>',html,re.I):
   attrs=dict((k.lower(),v) for k,_,v in re.findall(r'([\w-]+)\s*=\s*([\x22\x27])(.*?)\2',tag))
   src=attrs.get('src') or attrs.get('data-src') or attrs.get('href','')
   if not src or not re.search('logo|로고',tag,re.I):continue
   if re.search('favicon|icon|sns|award|partner|mark|lotte|spc',src,re.I) and name!='롯데리아':continue
   target=urllib.parse.urljoin(base,src)
   if target.startswith('http'):candidates.append(target)
  return name,{'site':base,'candidates':list(dict.fromkeys(candidates))[:8]}
 except Exception as e:return name,{'site':url,'error':type(e).__name__}
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:results=dict(pool.map(work,sites.items()))
pathlib.Path('artifacts/research/brand-candidates.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(results,ensure_ascii=False))
