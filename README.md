# GLP-001 — Isolated phone preview 3

**TEST COPY — DEVELOPMENT PREVIEW.** Public, unlisted; use synthetic notes.

Open https://glp001-iphone-qa.github.io/glp001-iphone-test/preview.html.

This stages the frozen PR55 candidate, including reviewed PR54 work, for the founder's requested phone preview. It is not a production release, source-branch merge, scholarly approval or physical-device acceptance.

- Source: acfeb0a157fc2cf38ae7ccbaeb2c53d8e97d3bec.
- Independent review records: RT-006 and RT-007 on review commit 164a7e0446bb1381d153f5f1ecd3c09c44c245fc.
- Previous QA revision and rollback reference: c1ab5030908ea172482a5659daa4027cda82b3f8.
- Cache version: iphone-qa3-acfeb0a-20261126.
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

Builder staging checks and screenshots are retained separately on branch evidence/qa3-20261126 under verification/. That branch is not deployed by Pages.
