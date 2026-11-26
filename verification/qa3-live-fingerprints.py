from pathlib import Path
import json, re, hashlib, urllib.request, concurrent.futures, sys
base = Path('/tmp/glp001-iphoneqa-20261126')
stage = base / 'qa3-stage'
url_base = 'https://glp001-iphone-qa.github.io/glp001-iphone-test/'
sw = (stage/'sw.js').read_text()
expected = json.loads(re.search(r'const EXPECTED=(\{[^\n]+\});', sw).group(1))
expected['./sw.js'] = hashlib.sha256((stage/'sw.js').read_bytes()).hexdigest()
expected['./qa-verification.json'] = hashlib.sha256((stage/'qa-verification.json').read_bytes()).hexdigest()
def check(item):
    name, wanted = item
    url = url_base + name[2:] + '?qa_verify=qa3-acfeb0a'
    try:
        req = urllib.request.Request(url, headers={'Cache-Control': 'no-cache'})
        with urllib.request.urlopen(req, timeout=40) as response:
            data = response.read()
            actual = hashlib.sha256(data).hexdigest()
            return {'path':name, 'status':response.status, 'bytes':len(data), 'expected':wanted, 'actual':actual, 'match':actual==wanted}
    except Exception as exc:
        return {'path':name, 'match':False, 'error':str(exc)}
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    results = list(pool.map(check, expected.items()))
report = {'url':url_base, 'sourceCommit':'acfeb0a157fc2cf38ae7ccbaeb2c53d8e97d3bec', 'checked':len(results), 'allMatch':all(r['match'] for r in results), 'results':results, 'kind':'Network artifact verification; not physical phone acceptance'}
out = base/'builder-crosscheck'/'qa3-evidence'
out.mkdir(exist_ok=True)
(out/'live-fingerprints.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'url':url_base,'checked':len(results),'allMatch':report['allMatch'],'failed':[r for r in results if not r['match']],'totalBytes':sum(r.get('bytes',0) for r in results)},indent=2))
sys.exit(0 if report['allMatch'] else 1)
