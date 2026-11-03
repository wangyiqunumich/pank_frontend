"""Build source-pinned, per-view assets. No donor results are committed to Git."""
import argparse
import csv
import gzip
import hashlib
import io
import json
import math
import pathlib
import subprocess
import tempfile
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT / 'public/data'
PCA_COMMIT = 'bc187eb072b8719e5dd52f93199757e15db63f06'
PCA_ROOT = f'https://raw.githubusercontent.com/PanKbase/PanKbase-RNA-expression-PCA-Explorer/{PCA_COMMIT}/'
BIO = 'https://bioindex.pankbase.org'
FIELDS = {'Program': 'source', 'Description of diabetes status': 'pan_kbase_description_of_diabetes_status',
          'Age (years)': 'pan_kbase_age_years', 'Sex': 'pan_kbase_sex', 'BMI': 'pan_kbase_bmi',
          'Ethnicity': 'pan_kbase_ethnicities', 'Cause of death': 'pan_kbase_cause_of_death',
          'HbA1C percentage': 'pan_kbase_hb_a1c_percentage', 'Treatment': 'treatments', 'Chemistry': 'chemistry'}
NUMERIC = {'Age (years)', 'BMI', 'HbA1C percentage'}
RECODE = {'Description of diabetes status': {'non-diabetic': 'No diabetes', 'type 1 diabetes': 'Type 1 diabetes',
    'type 2 diabetes': 'Type 2 diabetes', 'cystic fibrosis diabetes': 'Cystic fibrosis diabetes',
    'gestational diabetes': 'Gestational diabetes', 'diabetes unspecified': 'Diabetes unspecified',
    'steroid-induced diabetes': 'Steroid-induced diabetes', 'monogenic diabetes': 'Monogenic diabetes'},
    'Ethnicity': {'African American,Black': 'African American, Black', 'Caucasian': 'White'},
    'Sex': {'female': 'Female', 'male': 'Male'}, 'Program': {'IIDP,Prodo': 'IIDP'},
    'Cause of death': {'Cerebrovascular/stroke': 'Cerebrovascular/Stroke', 'Head Trauma': 'Head trauma',
       'ICH/stroke': 'Cerebrovascular/Stroke', 'Cerebral Edema (DKA)': 'Cerebral edema (DKA)', 'IHC': 'Cerebrovascular/Stroke'}}

def digest(data):
    return hashlib.sha256(data).hexdigest()

def number(value):
    try:
        n = float(value)
        return n if math.isfinite(n) else None
    except (ValueError, TypeError):
        return None

def fetch(url, limit=80 * 1024 * 1024):
    with urllib.request.urlopen(url, timeout=90) as response:
        data = response.read(limit + 1)
    if len(data) > limit:
        raise ValueError('Source exceeds build budget: ' + url)
    return data

def write_asset(kind, payload, source_bytes):
    data = json.dumps(payload, separators=(',', ':'), allow_nan=False).encode()
    if len(data) > 4 * 1024 * 1024:
        raise ValueError('Projected view exceeds 4 MiB delivery budget')
    name = f'{kind}-{digest(data)}.json'
    (OUT / name).write_bytes(data)
    return {'asset': name, 'sha256': digest(data), 'decodedBytes': len(data),
            'gzipBytes': len(gzip.compress(data, mtime=0)), 'sourceBytes': source_bytes}

def prepare_de():
    keys_url = BIO + '/api/bio/keys/single-cell-bulk-z-norm/2'
    keys = json.loads(fetch(keys_url))['keys']
    datasets = sorted({pair[0] for pair in keys})
    result = []
    for dataset in datasets:
        if not dataset.startswith('islet_of_Langerhans_scRNA_') or not all(c.isalnum() or c in '_-.' for c in dataset):
            raise ValueError('Unexpected dataset key')
        url = BIO + '/api/raw/file/single_cell_bulk/' + dataset + '/dea.tsv.gz'
        raw = fetch(url)
        decoded = gzip.decompress(raw) if raw[:2] == b'\x1f\x8b' else raw
        groups = {}
        for row in csv.DictReader(io.StringIO(decoded.decode()), delimiter='\t'):
            if row['datasetId'] != dataset:
                raise ValueError('Cross-dataset record in DE source')
            group = groups.setdefault(row['comparison_id'], {'label': row['comparison'], 'rows': []})
            group['rows'].append([row['gene'], number(row['logFoldChange']), number(row['-log10P'])])
        for comparison, group in groups.items():
            payload = {'version': 1, 'dataset': dataset, 'comparison': comparison, 'label': group['label'],
                       'columns': ['gene', 'logFoldChange', '-log10P'], 'rows': group['rows'],
                       'source': {'url': url, 'sha256': digest(raw), 'decodedSha256': digest(decoded)}}
            meta = write_asset('de', payload, len(decoded))
            result.append(dict(meta, dataset=dataset, comparison=comparison, label=group['label'],
                               rows=len(group['rows']), sourceUrl=url, sourceGzipBytes=len(raw)))
    return result

def prepare_pca(source):
    result = []
    cells = ['Acinar', 'Active Stellate', 'Alpha', 'Beta', 'Cycling Alpha', 'Delta', 'Ductal',
             'Endothelial', 'Gamma + Epsilon', 'Immune (Macrophages)', 'MUC5B+ Ductal', 'Quiescent Stellate']
    with tempfile.TemporaryDirectory() as tmp:
        tmp = pathlib.Path(tmp)
        for cell in cells:
            base = 'app/outputs/PCA_results/' + cell
            files = {}
            for suffix in ['_PCA_results.csv', '_all_PCA_results.rds']:
                relative = base + suffix
                data = (source / relative).read_bytes() if source else fetch(PCA_ROOT + urllib.parse.quote(relative))
                local = tmp / ('scores.csv' if suffix.endswith('.csv') else 'rotation.rds')
                local.write_bytes(data)
                files[suffix] = {'url': PCA_ROOT + urllib.parse.quote(relative), 'sha256': digest(data), 'bytes': len(data)}
            # Same prcomp contribution definition used by factoextra::fviz_contrib:
            # square loadings, normalize each PC over all variables, retain top 10.
            rcode = '''x <- readRDS(commandArgs(TRUE)[1]); out <- commandArgs(TRUE)[2]
stopifnot(inherits(x, "prcomp"), ncol(x$rotation) >= 10)
contrib <- sweep(x$rotation[,1:10,drop=FALSE]^2, 2, colSums(x$rotation[,1:10,drop=FALSE]^2), "/") * 100
rows <- do.call(rbind,lapply(1:10,function(pc) {i<-order(contrib[,pc],decreasing=TRUE)[1:10];data.frame(pc=pc,gene=rownames(contrib)[i],contribution=contrib[i,pc])}))
write.csv(rows,out,row.names=FALSE)
'''
            (tmp / 'extract.R').write_text(rcode)
            subprocess.run(['Rscript', str(tmp / 'extract.R'), str(tmp / 'rotation.rds'), str(tmp / 'contributions.csv')], check=True)
            rows = []
            for row in csv.DictReader((tmp / 'scores.csv').open()):
                scores = [number(row[f'PC{i}']) for i in range(1, 11)]
                if any(v is None for v in scores):
                    raise ValueError('Invalid PCA score')
                attributes = {}
                for label, key in FIELDS.items():
                    value = row[key]
                    attributes[label] = number(value) if label in NUMERIC else RECODE.get(label, {}).get(value, value or 'Unknown')
                rows.append({'scores': scores, 'attributes': attributes})
            contributions = [[] for _ in range(10)]
            for row in csv.DictReader((tmp / 'contributions.csv').open()):
                contributions[int(row['pc']) - 1].append([row['gene'], float(row['contribution'])])
            payload = {'version': 1, 'cellType': cell, 'release': 'v3.3', 'fields': list(FIELDS),
                       'numericFields': sorted(NUMERIC), 'rows': rows, 'contributions': contributions,
                       'source': {'repository': 'PanKbase/PanKbase-RNA-expression-PCA-Explorer', 'commit': PCA_COMMIT, 'files': files}}
            meta = write_asset('pca', payload, files['_PCA_results.csv']['bytes'])
            result.append(dict(meta, cellType=cell, rows=len(rows), sourceRdsBytes=files['_all_PCA_results.rds']['bytes']))
    return result

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--pca-source', type=pathlib.Path)
    parser.add_argument('--if-valid', action='store_true', help='Reuse locally verified prepared assets')
    args = parser.parse_args()
    if args.if_valid and (OUT / 'manifest.json').exists():
        manifest = json.loads((OUT / 'manifest.json').read_text())
        valid = manifest.get('version') == 1 and len(manifest.get('de', [])) == 6 and len(manifest.get('pca', [])) == 12
        for group in ['de', 'pca']:
            for asset in manifest.get(group, []):
                path = OUT / asset['asset']
                valid = valid and path.is_file() and digest(path.read_bytes()) == asset['sha256']
        if valid:
            print('Verified 18 existing prepared source assets.')
            raise SystemExit(0)
    if args.pca_source:
        commit = subprocess.check_output(['git', '-C', str(args.pca_source), 'rev-parse', 'HEAD'], text=True).strip()
        if commit != PCA_COMMIT:
            raise ValueError('PCA source is not the pinned commit')
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {'version': 1, 'de': prepare_de(), 'pca': prepare_pca(args.pca_source)}
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps({'deComparisons': len(manifest['de']), 'pcaCellTypes': len(manifest['pca']),
        'decodedBytes': sum(x['decodedBytes'] for group in ['de','pca'] for x in manifest[group])}))
