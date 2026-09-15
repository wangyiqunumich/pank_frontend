"""Check the offline source handoff without network access or dependencies."""
import json,re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote
ROOT=Path(__file__).resolve().parent.parent
class Links(HTMLParser):
 def __init__(self):super().__init__();self.refs=[]
 def handle_starttag(self,tag,attrs):
  for key,value in attrs:
   if key in ('href','src','poster') and value:self.refs.append(value)
missing=[];private=[];count=0
for p in ROOT.rglob('*'):
 if not p.is_file() or 'dist' in p.relative_to(ROOT).parts:continue
 if p.suffix in ('.html','.css','.js','.json','.md','.py'):
  text=p.read_text()
  if p.name != 'check.py' and re.search(r'/Users/[^/\s]+/|/private/tmp/|/var/local/serviceuser/',text):private.append(str(p.relative_to(ROOT)))
  refs=[]
  if p.suffix=='.html':
   count+=1;parser=Links();parser.feed(text);refs=parser.refs
  if p.suffix=='.css':refs+=re.findall(r'url\(["\']?([^\)"\']+)',text)
  for ref in refs:
   if ref.startswith(('http:','https:','mailto:','tel:','data:','blob:','#','javascript:')):continue
   target=unquote(ref.split('#')[0].split('?')[0])
   if target and not (p.parent/target).is_file():missing.append((str(p.relative_to(ROOT)),ref))
screens=json.loads((ROOT/'inventories/screens.json').read_text())
ids={s['id'] for s in screens};assert len(ids)==len(screens),'Duplicate screen IDs'
for s in screens:
 for suffix in ('.html','.meta.json'):assert (ROOT/'pages'/(s['id']+suffix)).is_file(),s['id']
 assert (ROOT/'screenshots'/(s['id']+'.png')).is_file(),s['id']
 assert not s.get('parent') or s['parent'] in ids,s['id']
assert not missing,missing
assert not private,private
print(f'PASS: {len(screens)} screens, {count} HTML files, local assets/links, parent links and private-path scan.')
