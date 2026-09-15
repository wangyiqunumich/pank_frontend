"""Refresh generated atlas indexes after editing metadata or message sources."""
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
meta={p.stem.removesuffix('.meta'):json.loads(p.read_text()) for p in (ROOT/'pages').glob('*.meta.json')}
file=ROOT/'atlas-data.js';current=json.loads(file.read_text().split('=',1)[1].strip().removesuffix(';'))
ordered=[meta.pop(p['id']) for p in current['pages'] if p['id'] in meta]+[meta[k] for k in sorted(meta)]
current['pages']=ordered
catalog=json.loads((ROOT/'inventories/error-catalog.json').read_text());current['messages']=len(catalog['errors'])
file.write_text('const ATLAS = '+json.dumps(current,ensure_ascii=False,indent=2).replace('</','<\\/')+';\n')
(ROOT/'inventories/screens.json').write_text(json.dumps(ordered,ensure_ascii=False,indent=2)+'\n')
(ROOT/'page-index.js').write_text('window.PAGE_IDS = '+json.dumps([p['id'] for p in ordered],indent=2)+';\n')
file=ROOT/'errors.html';html=file.read_text();payload=json.dumps(catalog,ensure_ascii=False,indent=2).replace('</','<\\/')
html,n=re.subn(r'(<script\b[^>]*id="catalog-data"[^>]*>)[\s\S]*?(</script>)',lambda m:m[1]+'\n'+payload+'\n'+m[2],html,count=1)
assert n==1,'Expected catalog-data script block'
file.write_text(html)
usage={}
for p in (ROOT/'pages').glob('*.html'):
 for ref in re.findall(r'href="\.\./(styles/[^\"]+)"',p.read_text()):usage.setdefault(ref,[]).append(p.name)
(ROOT/'inventories/style-usage.json').write_text(json.dumps(usage,indent=2)+'\n')
print(f'Synced {len(ordered)} screens and {len(catalog["errors"])} messages.')
