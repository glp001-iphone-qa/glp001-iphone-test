from pathlib import Path
import subprocess, json, re, os, hashlib
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

base = Path('/tmp/glp001-iphoneqa-20261126')
src = base / 'article-engine'
out = base / 'qa3-reviewed'
source = 'acfeb0a157fc2cf38ae7ccbaeb2c53d8e97d3bec'
previous = 'c1ab5030908ea172482a5659daa4027cda82b3f8'
cache_version = 'iphone-qa3-acfeb0a-20261126'
def git(*args):
    return subprocess.check_output(['git', *args], cwd=src)
def digest(data):
    return hashlib.sha256(data).hexdigest()
assert git('rev-parse', source).decode().strip() == source
assert not out.exists(), 'Candidate output already exists; inspect instead of overwriting'
original_sw = git('show', source + ':sw.js').decode()
original_expected = json.loads(re.search(r'const EXPECTED=(\{[^\n]+\});', original_sw).group(1))
runtime = {name[2:] + ('index.html' if name.endswith('/') else '') for name in original_expected}
runtime.update({'sw.js', '.nojekyll', 'robots.txt', 'tools/build-offline.mjs'})
assert all('..' not in Path(name).parts and not name.startswith('/') for name in runtime)
out.mkdir()
for name in sorted(runtime):
    dest = out / name
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(git('show', source + ':' + name))
for url, expected in original_expected.items():
    name = url[2:] + ('index.html' if url.endswith('/') else '')
    assert digest((out / name).read_bytes()) == expected, 'Frozen source fingerprint: ' + name

(out / 'qa-banner.css').write_text('''/* QA identification in document flow; never covers reader controls. */
.glp-qa-banner{box-sizing:border-box;position:relative;width:100%;margin:0;background:#fff1ce;color:#4c271c;border-bottom:3px solid #ad4d22;padding:9px 10px;text-align:center;font:600 14px/1.55 system-ui,-apple-system,sans-serif;letter-spacing:.02em}
.glp-qa-banner strong{font-weight:800}
.glp-qa-banner small{display:block;font-weight:500;font-size:12px}
.glp-qa-banner a{color:inherit;text-decoration:underline;text-underline-offset:3px}
.qa-preview{margin:0;background:#f7f3e7;color:#24352d;font:17px/1.65 system-ui,-apple-system,sans-serif}
.qa-preview main{max-width:760px;margin:auto;padding:28px 20px 60px}
.qa-preview h1{font:600 clamp(29px,6vw,40px)/1.18 Georgia,serif;letter-spacing:-.02em;margin:10px 0 18px}
.qa-preview h2{font-size:20px;line-height:1.35;margin:0 0 10px}
.qa-preview a{color:#1d5b46;text-underline-offset:3px}
.qa-preview .qa-kicker{font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
.qa-preview .qa-section{border-top:1px solid #c8cec0;margin-top:28px;padding-top:24px}
.qa-preview .qa-open{display:inline-block;box-sizing:border-box;min-height:48px;padding:12px 20px;border-radius:10px;background:#254e3c;color:#fff;font-weight:700;text-decoration:none}
.qa-preview button{min-height:46px;padding:10px 14px;border:1px solid #54705f;background:#fffdf6;color:#254e3c;border-radius:8px;font:600 15px/1.4 system-ui;cursor:pointer;margin:5px 8px 5px 0}
.qa-preview button[hidden]{display:none}
.qa-preview a:focus-visible,.qa-preview button:focus-visible{outline:3px solid #a84816;outline-offset:4px}
.qa-preview .qa-note{font-size:15px}
.qa-preview ul{padding-left:24px}
.qa-preview li{margin:7px 0}
@media(prefers-color-scheme:dark){.glp-qa-banner{background:#3d271b;color:#ffe4b0;border-bottom-color:#e8a662}}
@media print{.glp-qa-banner{display:none}.qa-preview .qa-actions{display:none}.qa-preview{background:#fff;color:#000}}
''', encoding='utf-8')
banner = '<aside class="glp-qa-banner" role="note" aria-label="Isolated development preview"><strong>TEST COPY — DEVELOPMENT PREVIEW</strong><small id="glp-qa-build">Source build: acfeb0a · 26 Nov 2026 · Preview 3</small><small>Use made-up notes only · Qualified review pending</small><small><a href="{start}">Preview guide and update help</a></small></aside>'
html_count = 0
adaptation_records = []
for name in sorted(n for n in runtime if n.endswith('.html')):
    dest = out / name
    original = dest.read_text()
    css = os.path.relpath(out / 'qa-banner.css', dest.parent).replace(os.sep, '/')
    start = os.path.relpath(out / 'preview.html', dest.parent).replace(os.sep, '/')
    local_banner = banner.format(start=start)
    head_addition = '<meta name="robots" content="noindex,nofollow">\\n<link rel="stylesheet" href="' + css + '">\\n'
    head_addition = head_addition.replace('\\n', '\n')
    assert original.lower().count('</head>') == 1 and len(re.findall(r'<body[^>]*>', original, flags=re.I)) == 1, name
    text = re.sub('</head>', head_addition + '</head>', original, count=1, flags=re.I)
    text = re.sub(r'(<body[^>]*>)', lambda m: m.group(1) + '\n' + local_banner, text, count=1, flags=re.I)
    text = re.sub('<title>', '<title>TEST COPY · ', text, count=1, flags=re.I)
    restored = text.replace(head_addition, '').replace('\n' + local_banner, '').replace('<title>TEST COPY · ', '<title>')
    assert restored == original, 'HTML adaptation must be reversible: ' + name
    dest.write_text(text, encoding='utf-8')
    html_count += 1
    adaptation_records.append({'path': name, 'sourceSha256': digest(original.encode()), 'previewSha256': digest(text.encode()), 'contentRestoredExactly': True})
preview = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#f7f3e7">
<title>Latest preview · Gurbani Learning Library</title>
<link rel="stylesheet" href="qa-banner.css">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icons/icon-180.png">
</head>
<body class="qa-preview">
{banner}
<main>
<p class="qa-kicker">Read · Listen · Understand · Reflect</p>
<h1>Your latest library preview</h1>
<p>Open the readers, quiet spaces and new source reading sheets from one home page.</p>
<p><a class="qa-open" href="./">Open the library</a></p>
<p class="qa-note">This is the separate development copy for trying the work. Teaching material remains a draft awaiting qualified review. Use made-up notes while testing.</p>
<section class="qa-section" aria-labelledby="included">
<h2 id="included">Available to try</h2>
<ul>
<li><a href="full-japji.html">Japji Sahib</a>, with the reading-place return repair.</li>
<li><a href="sukhmani.html">Sukhmani Sahib</a> and <a href="nitnem/index.html">the seven Nitnem banis</a>.</li>
<li><a href="salok-mahalla9/index.html?bani=salok-mahalla9">Salok Mahalla 9</a> and <a href="salok-kabir/index.html?bani=salok-kabir">the 243-Salok Kabir collection</a>, as development readers.</li>
<li><a href="simran.html">Simran Room</a>, silent and without a visible countdown.</li>
<li><a href="breathing.html">Optional breathing tool</a>, presented separately from Simran.</li>
<li><a href="articles/index.html">Study by topic</a>, with two complete source reading sheets. Explanation spaces remain empty pending qualified review.</li>
<li><a href="gurdwaras.html">Gurdwara directory</a> with links to official destinations.</li>
</ul>
</section>
<section class="qa-section" aria-labelledby="update">
<h2 id="update">Opened an older copy before?</h2>
<p>Check for an update below. If an update is ready, select <strong>Load available update</strong>, then open the library. Finish any editing in other open reader tabs first.</p>
<p id="offline-status" role="status" aria-live="polite">Checking the offline reader. Online pages remain available.</p>
<div class="qa-actions">
<button id="check-update" type="button">Check for an update</button>
<button id="apply-update" type="button" hidden>Load available update</button>
</div>
<p class="qa-note">Do not clear website data to update. Saved learning stays on this test address. Export learning through the reader when you need a backup.</p>
<noscript><p>JavaScript is needed for the readers and update controls.</p></noscript>
</section>
<section class="qa-section" aria-labelledby="pending">
<h2 id="pending">Still being checked</h2>
<p class="qa-note">The separate knowledge pilot is not included while its review issue remains open. Daily Hukamnama and the wider history library are not part of this preview.</p>
<p class="qa-note">Phone, Home Screen and VoiceOver acceptance are still to be performed. For exact Gurmukhi text copying, use the reader; copying from printed PDFs remains under investigation.</p>
</section>
</main>
<script src="js/pwa.js"></script>
</body>
</html>
'''.replace('{banner}', banner.format(start='preview.html'))
(out / 'preview.html').write_text(preview, encoding='utf-8')
manifest = json.loads((out / 'manifest.webmanifest').read_text())
assert manifest['id'] == manifest['scope'] == manifest['start_url'] == './'
manifest.update(name='GLP-001 Preview — Test Copy', short_name='GLP QA', description='Separate development preview. Use made-up notes only. Qualified review pending.')
(out / 'manifest.webmanifest').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
(out / 'robots.txt').write_text('User-agent: *\nDisallow: /\n# Public, unlisted development copy. noindex is not access control.\n')
now = datetime.now(timezone.utc)
metadata = {
    'buildId': 'qa3-acfeb0a',
    'preparedAtUtc': now.isoformat(),
    'preparedAtPacific': now.astimezone(ZoneInfo('America/Los_Angeles')).isoformat(),
    'sourceRepository': 'sskhangura82/gurbani-learning-library',
    'sourceCommit': source,
    'sourcePullRequest': 55,
    'includedReliabilityCommit': '8917beaab7acc5770cb5a8fee682c9702a0689cb',
    'includedReaderRepairCommit': '1470477b5a27a8f975f1efce74443a0e136aa94e',
    'independentReviewCommit': '164a7e0446bb1381d153f5f1ecd3c09c44c245fc',
    'previousQaCommit': previous,
    'cacheVersion': cache_version,
    'runtimeScriptureChanges': False,
    'physicalIphoneAcceptance': 'NOT_RECORDED',
    'qualifiedHumanReview': 'PENDING',
    'pdfCopyInteroperability': 'OPEN',
    'knowledgePilotIncluded': False,
    'separateSukhmaniLinkedVisitRepairIncluded': False,
    'releaseApproval': 'NOT_CLAIMED',
    'previewAuthorization': 'Founder requested a working phone link to the current work on 26 November 2026.'
}
(out / 'qa-build.json').write_text(json.dumps(metadata, indent=2) + '\n')
(out / 'README.md').write_text('''# GLP-001 — Isolated phone preview 3

**TEST COPY — DEVELOPMENT PREVIEW.** Public, unlisted; use synthetic notes.

Open https://glp001-iphone-qa.github.io/glp001-iphone-test/preview.html.

This stages the frozen PR55 candidate, including reviewed PR54 work, for the founder's requested phone preview. It is not a production release, source-branch merge, scholarly approval or physical-device acceptance.

- Source: ''' + source + '''.
- Independent review records: RT-006 and RT-007 on review commit 164a7e0446bb1381d153f5f1ecd3c09c44c245fc.
- Previous QA revision and rollback reference: ''' + previous + '''.
- Cache version: ''' + cache_version + '''.
- Provenance: qa-build.json. Staging verification: qa-verification.json.
- Source scripture, teaching, application JavaScript and source contracts are byte-identical to the frozen candidate.
- Adaptations: normal-flow QA banner, page title/noindex, QA PWA name, preview/update guide using the existing pwa.js handler, robots, provenance and regenerated offline fingerprints.
- PWA id, scope, start_url, hostname, reader paths and storage identities remain unchanged.
- No saved learning is read, migrated or cleared by staging. Tests use synthetic records in fresh browser contexts.
- Claude independently reviewed the exact source candidate, with stated omissions; no approval is attributed to him. Builder verification remains builder verification.
- Source sheets deliberately carry no explanation claims. Qualified review remains pending.
- PDF copy interoperability remains OPEN; existing failures are not erased or hidden by a newer extraction library.
- Knowledge pilot / RB-01 and separate PR47 linked-visit repair are not integrated. Daily Hukamnama and the wider history library are not included.
- Physical iPhone, Home Screen, VoiceOver and airplane-mode acceptance remain unperformed.
- Production is a separate origin and remains unchanged.
- Rollback: create a new QA commit restoring the recorded previous tree; use a new cache version and regenerated hashes so an update can be offered. Never delete device storage or reset production.
- This deployment repository is not the source for a production merge.
''')
sw = out / 'sw.js'
text = sw.read_text()
match = re.search(r'const EXPECTED=(\{[^\n]+\});', text)
expected = json.loads(match.group(1))
for name in ['./qa-banner.css', './qa-build.json', './preview.html']:
    expected[name] = 'REGENERATE'
text = text[:match.start(1)] + json.dumps(expected, separators=(',', ':')) + text[match.end(1):]
sw.write_text(text)
builder = out / 'tools/build-offline.mjs'
text = builder.read_text()
assert text.count('0.18-article-source-print-review-20261126-1') == 1
builder.write_text(text.replace('0.18-article-source-print-review-20261126-1', cache_version))
subprocess.run(['node', 'tools/build-offline.mjs'], cwd=out, check=True)
changed = {'sw.js', 'manifest.webmanifest', 'robots.txt', 'tools/build-offline.mjs', *[p for p in runtime if p.endswith('.html')]}
unchanged = sorted(runtime - changed)
for name in unchanged:
    assert (out / name).read_bytes() == git('show', source + ':' + name), name
rebuilt = json.loads(re.search(r'const EXPECTED=(\{[^\n]+\});', sw.read_text()).group(1))
for url, expected in rebuilt.items():
    name = url[2:] + ('index.html' if url.endswith('/') else '')
    assert digest((out / name).read_bytes()) == expected, name
assert cache_version in sw.read_text()
verification = {
    'sourceCommit': source,
    'previousQaCommit': previous,
    'allSourceBytesVerifiedBeforeAdaptation': True,
    'unchangedRuntimeFiles': unchanged,
    'unchangedRuntimeCount': len(unchanged),
    'htmlAdaptations': adaptation_records,
    'cacheAssetCount': len(rebuilt),
    'cacheFingerprintsMatch': True,
    'manifestIdentityPreserved': True,
    'browserStagingChecks': 'PENDING',
    'physicalPhoneChecks': 'NOT_PERFORMED'
}
(out / 'qa-verification.json').write_text(json.dumps(verification, indent=2) + '\n')
deploy_files = sorted(str(p.relative_to(out)) for p in out.rglob('*') if p.is_file())
(base / 'qa3-reviewed-deploy-files.json').write_text(json.dumps(deploy_files, indent=2) + '\n')
(base / 'builder-crosscheck' / 'qa3-adapter-summary.json').write_text(json.dumps({
    'buildId': metadata['buildId'], 'source': source, 'htmlPages': html_count,
    'byteIdenticalRuntimeFiles': len(unchanged), 'deployFiles': len(deploy_files),
    'cacheAssets': len(rebuilt), 'candidate': str(out)}, indent=2) + '\n')
print((base / 'builder-crosscheck' / 'qa3-adapter-summary.json').read_text())
