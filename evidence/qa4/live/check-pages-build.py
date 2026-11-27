# Reusable bounded Pages readiness check; appends observations without polling internally.
from pathlib import Path
import subprocess, json, datetime, shutil, sys
out=Path('/tmp/glp001-iphoneqa-20261126/qa4-verification/live')
out.mkdir(parents=True,exist_ok=True)
wanted='63780b0a15c56a974c9dafd41d3308c0b82c1bf7'
api='repos/glp001-iphone-qa/glp001-iphone-test/pages/builds/latest'
observation={'atUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'api':api}
try:
    gh=shutil.which('gh') or '/opt/homebrew/bin/gh'
    p=subprocess.run([gh,'api',api],capture_output=True,text=True,timeout=30)
    if p.returncode:
        observation.update(status='API_ERROR',error=p.stderr.strip())
    else:
        data=json.loads(p.stdout)
        observation.update({k:data.get(k) for k in ['url','status','commit','duration','created_at','updated_at','error']})
except Exception as e:
    observation.update(status='API_ERROR',error=str(e))
with (out/'pages-build-observations.jsonl').open('a') as f:
    f.write(json.dumps(observation)+'\n')
ready=observation.get('status')=='built' and observation.get('commit')==wanted
if ready:
    (out/'pages-build-ready.json').write_text(json.dumps(observation,indent=2)+'\n')
print(json.dumps(observation,indent=2))
sys.exit(0 if ready else 2)
