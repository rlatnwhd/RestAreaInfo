import json,urllib.request,pathlib,concurrent.futures
first=json.loads(pathlib.Path('artifacts/research/brand-candidates.json').read_text(encoding='utf-8'))
render=json.loads(pathlib.Path('artifacts/research/brand-rendered.json').read_text(encoding='utf-8'))
selections={
'할리스커피':first['할리스커피']['candidates'][0], 'CU':first['CU']['candidates'][0], '던킨도너츠':first['던킨도너츠']['candidates'][0], '이마트24':first['이마트24']['candidates'][0], '달콤커피':first['달콤커피']['candidates'][0], 'JDX':first['JDX']['candidates'][0], '세븐일레븐':first['세븐일레븐']['candidates'][0], '뚜레쥬르':first['뚜레쥬르']['candidates'][0], '앤티앤스프레즐':first['앤티앤스프레즐']['candidates'][0], '스태프핫도그':first['스태프핫도그']['candidates'][0], 'BBQ':first['BBQ']['candidates'][0],
'탐앤탐스':render['탐앤탐스']['candidates'][0], '로띠번':render['로띠번']['candidates'][0], 'GS25':render['GS25']['candidates'][0], '공차':render['공차']['candidates'][0], '파리바게뜨':render['파리바게뜨']['candidates'][-1], '배스킨라빈스':render['배스킨라빈스']['candidates'][-2], 'NEPA':render['NEPA']['candidates'][0], '토스타토스트':render['토스타토스트']['candidates'][0], '성북당':render['성북당']['candidates'][0],
'스타벅스':'https://image.istarbucks.co.kr/common/img/common/logo.png',
'파스쿠찌':'https://www.pascucci.co.kr/lib/images/common/h1_logo.png',
'드롭탑(커피전문점)':'https://framerusercontent.com/assets/c4LCaj9wkY4eJ556yHHFQwWO7KM.png',
'롯데리아':'https://pbs.twimg.com/profile_images/2018504835625295872/sgd6fiNB.png',
}
root=pathlib.Path('public/brands');root.mkdir(parents=True,exist_ok=True)
def get(task):
 i,(name,url)=task
 try:
  req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Referer':(render.get(name) or first.get(name) or {}).get('site',url)})
  with urllib.request.urlopen(req,timeout=15) as r:data=r.read();ctype=r.headers.get('content-type','')
  ext='svg' if b'<svg' in data[:1000] else 'png' if data[:8]==b'\x89PNG\r\n\x1a\n' else 'gif' if data[:3]==b'GIF' else 'jpg' if data[:2]==b'\xff\xd8' else 'webp' if data[:4]==b'RIFF' else None
  if not ext: return name,{'error':'not image'}
  filename=f'brand-{i:02d}.{ext}';(root/filename).write_bytes(data)
  source=(render.get(name) or first.get(name) or {}).get('site',url)
  if name=='파스쿠찌':source='https://www.pascucci.co.kr/index.asp'
  if name=='롯데리아':source='https://x.com/lotteria_korea'
  if name=='드롭탑(커피전문점)':source='https://cafedroptop.com/'
  return name,{'logo':'/brands/'+filename,'source':source,'imageSource':url,'checkedAt':'2026-10-27'}
 except Exception as e:return name,{'error':type(e).__name__}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:result=dict(pool.map(get,enumerate(selections.items())))
pathlib.Path('artifacts/research/brand-downloads.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
manifest={k:v for k,v in result.items() if 'logo' in v}
pathlib.Path('src/data').mkdir(exist_ok=True)
pathlib.Path('src/data/brandLogos.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'downloaded':len(manifest),'failed':{k:v for k,v in result.items() if 'error' in v}},ensure_ascii=False))
