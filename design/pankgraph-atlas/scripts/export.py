"""Export portable HTML from the Git-friendly shared-source atlas (stdlib only)."""
import base64,mimetypes,re,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'dist'/'pankgraph-designer-atlas'
OUT.mkdir(parents=True,exist_ok=True)
for p in ROOT.iterdir():
 if p.name in ('dist','.gitignore','scripts'):continue
 target=OUT/p.name
 if p.is_dir():shutil.copytree(p,target,dirs_exist_ok=True)
 else:shutil.copyfile(p,target)
def uri(path):
 mime=mimetypes.guess_type(path.name)[0] or 'application/octet-stream'
 return 'data:'+mime+';base64,'+base64.b64encode(path.read_bytes()).decode()
def local(base,url):
 if url.startswith(('data:','http:','https:','blob:','#','mailto:')):return None
 p=(base/url.split('?')[0].split('#')[0]).resolve()
 return p if p.is_file() and p.is_relative_to(ROOT) else None
def css_inline(text,base):
 def replace(m):
  p=local(base,m[1]);return 'url("'+uri(p)+'")' if p else m[0]
 return re.sub(r'url\(["\']?([^\)"\']+)["\']?\)',replace,text)
for source in (ROOT/'pages').glob('*.html'):
 html=source.read_text()
 def css(m):
  p=local(source.parent,m[1]);return '<style>'+css_inline(p.read_text(),p.parent)+'</style>' if p else m[0]
 html=re.sub(r'<link rel="stylesheet" href="([^"]+)"\s*/?>',css,html)
 def js(m):
  p=local(source.parent,m[1]);return '<script>'+p.read_text().replace('</script','<\\/script')+'</script>' if p else m[0]
 html=re.sub(r'<script src="([^"]+)"></script>',js,html)
 def image(m):
  p=local(source.parent,m[2]);return m[1]+'="'+uri(p)+'"' if p else m[0]
 html=re.sub(r'(src|poster)="([^"]+)"',image,html)
 (OUT/'pages'/source.name).write_text(html)
print(f'Exported {len(list((OUT/"pages").glob("*.html")))} standalone pages to {OUT}')
