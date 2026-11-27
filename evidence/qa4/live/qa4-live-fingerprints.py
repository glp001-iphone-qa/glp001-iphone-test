# QA4 adaptation of builder-crosscheck/qa3-live-fingerprints.py.
# Read-only network validation. Each run retains its own evidence.
from pathlib import Path
import json, re, hashlib, urllib.request, concurrent.futures, sys, datetime, subprocess
base=Path('/tmp/glp001-iphoneqa-20261126')
candidate=base/'qa4-reviewed'
stage=base/'qa4-stage'
evidence=base/'qa4-verification/live'
run_id=datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H-%M-%S-%fZ')
out=evidence/run_id
out.mkdir(parents=True,exist_ok=True)
url_base='https://glp001-iphone-qa.github.io/glp001-iphone-test/'
deployment='63780b0a15c56a974c9dafd41d3308c0b82c1bf7'
ready=json.loads((evidence/'pages-build-ready.json').read_text())
assert ready['status']=='built' and ready['commit']==deployment
assert subprocess.check_output(['git','-C',str(stage),'rev-parse','HEAD'],text=True).strip()==deployment
sw=(candidate/'sw.js').read_text()
expected=json.loads(re.search(r'const EXPECTED=(\{[^\n]+\});',sw).group(1))
assert len(expected)==88
entries=[]
for name,pin in expected.items():
    local=candidate/(name+'index.html' if name.endswith('/') else name)
    digest=hashlib.sha256(local.read_bytes()).hexdigest()
    assert digest==pin, name+' local candidate does not match its fingerprint'
    entries.append((name,digest,'manifest'))
for name,local in [('./sw.js',candidate/'sw.js'),('./qa-verification.json',stage/'qa-verification.json')]:
    entries.append((name,hashlib.sha256(local.read_bytes()).hexdigest(),'supplement'))
def check(item):
    name,wanted,kind=item
    url=url_base+name[2:]+'?qa_verify=qa4-63780b0-'+run_id
    entry={'path':name,'kind':kind,'url':url,'expected':wanted}
    try:
        req=urllib.request.Request(url,headers={'Cache-Control':'no-cache','User-Agent':'GLP-001-QA4-artifact-check'})
        with urllib.request.urlopen(req,timeout=30) as response:
            data=response.read()
            actual=hashlib.sha256(data).hexdigest()
            entry.update(status=response.status,bytes=len(data),actual=actual,match=actual==wanted,finalUrl=response.url,
                responseHeaders={k:response.headers.get(k) for k in ['Date','Last-Modified','ETag','Age','Cache-Control','X-Cache','X-Cache-Hits','X-GitHub-Request-Id']})
    except Exception as e:
        entry.update(match=False,error=str(e))
    return entry
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    results=list(pool.map(check,entries))
report={'schema':'glp.qa4-live-fingerprints.v1','runId':run_id,'url':url_base,
    'deploymentCommit':deployment,'sourceCommit':'389e79baff4016a2ff61d1851908de0bd66beb8f',
    'pagesBuild':ready,'manifestAssets':88,'checked':len(results),'allMatch':all(r['match'] for r in results),
    'results':results,'kind':'Read-only live network artifact verification; not physical phone acceptance',
    'finishedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat()}
(out/'live-fingerprints.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'url':url_base,'checked':len(results),'allMatch':report['allMatch'],
    'failed':[r for r in results if not r['match']],'totalBytes':sum(r.get('bytes',0) for r in results),
    'report':str(out/'live-fingerprints.json')},indent=2))
sys.exit(0 if report['allMatch'] else 1)
