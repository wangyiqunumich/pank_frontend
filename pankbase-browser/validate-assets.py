"""Validate every prepared record against its source; emit aggregate evidence only."""
import csv, gzip, hashlib, importlib.util, io, json, pathlib, sys
spec=importlib.util.spec_from_file_location('prepare',pathlib.Path(__file__).with_name('prepare-data.py'))
prepare=importlib.util.module_from_spec(spec);spec.loader.exec_module(prepare)
manifest=json.loads((prepare.OUT/'manifest.json').read_text())
counts={'deComparisons':0,'deRows':0,'pcaCellTypes':0,'pcaSamples':0,'pcaScores':0}
for item in manifest['de']:
    payload=json.loads((prepare.OUT/item['asset']).read_text())
    raw=prepare.fetch(item['sourceUrl'])
    assert prepare.digest(raw)==payload['source']['sha256'], 'Source changed: regenerate and review'
    decoded=gzip.decompress(raw) if raw[:2]==b'\x1f\x8b' else raw
    rows=[r for r in csv.DictReader(io.StringIO(decoded.decode()),delimiter='\t') if r['comparison_id']==item['comparison']]
    assert payload['rows']==[[r['gene'],prepare.number(r['logFoldChange']),prepare.number(r['-log10P'])] for r in rows]
    assert all(r['datasetId']==payload['dataset'] and r['comparison']==payload['label'] for r in rows)
    counts['deComparisons']+=1;counts['deRows']+=len(rows)
source=pathlib.Path(sys.argv[1])
for item in manifest['pca']:
    payload=json.loads((prepare.OUT/item['asset']).read_text())
    raw=(source/'app/outputs/PCA_results'/f"{item['cellType']}_PCA_results.csv").read_bytes()
    assert prepare.digest(raw)==payload['source']['files']['_PCA_results.csv']['sha256']
    rows=list(csv.DictReader(io.StringIO(raw.decode())))
    assert len(rows)==len(payload['rows'])
    for src,dst in zip(rows,payload['rows']):
        assert [float(src[f'PC{i}']) for i in range(1,11)]==dst['scores']
        for label,key in prepare.FIELDS.items():
            expected=prepare.number(src[key]) if label in prepare.NUMERIC else prepare.RECODE.get(label,{}).get(src[key],src[key] or 'Unknown')
            assert expected==dst['attributes'][label]
    assert len(payload['contributions'])==10 and all(len(pc)==10 for pc in payload['contributions'])
    counts['pcaCellTypes']+=1;counts['pcaSamples']+=len(rows);counts['pcaScores']+=len(rows)*10
print(json.dumps({'status':'pass','checks':counts,'payloads':manifest},indent=2))
