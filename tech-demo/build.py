"""Rebuild the isolated demo using pinned upstream components, without promoting dev."""
from pathlib import Path
import hashlib,json,os,shutil,subprocess,tempfile
HERE=Path(__file__).resolve().parent
ROOT=HERE.parent
META=json.loads((HERE/'manifest.json').read_text())
def run(*args,cwd):subprocess.run(args,cwd=cwd,check=True)
with tempfile.TemporaryDirectory(prefix='pank-tech-build-') as tmp:
 work=Path(tmp)
 run('git','clone','--no-checkout','https://github.com/wangyiqunumich/pank_frontend.git',str(work/'source'),cwd=work)
 work=work/'source'
 run('git','checkout',META['source_commit'],cwd=work)
 run('git','apply',str(HERE/'source.patch'),cwd=work)
 shutil.copy(HERE/'index.js',work/'src/index.js')
 (work/'src/techDemo').mkdir()
 for name in ['run.json','result.json']:shutil.copy(HERE/name,work/'src/techDemo'/name)
 shutil.rmtree(work/'public');(work/'public').mkdir();shutil.copy(HERE/'index.html',work/'public/index.html')
 run('npm','ci','--no-audit','--no-fund',cwd=work)
 run('npm','ci','--no-audit','--no-fund',cwd=work/'single-cell-browser')
 run('npm','run','build',cwd=work/'single-cell-browser')
 subprocess.run(['node','node_modules/react-scripts/bin/react-scripts.js','build'],cwd=work,check=True,env={**os.environ,'PUBLIC_URL':'/tech_demo','GENERATE_SOURCEMAP':'false','CI':'false'})
 dest=ROOT/'public/tech_demo'
 if dest.exists():shutil.rmtree(dest)
 shutil.copytree(work/'build',dest)
 META['files']={str(f.relative_to(dest)):hashlib.sha256(f.read_bytes()).hexdigest() for f in dest.rglob('*') if f.is_file()}
 (HERE/'manifest.json').write_text(json.dumps(META,indent=2)+'\n')
