# QA4 live deployment verification

**PASS on the verified live scope.** The first full browser report retains an instrument failure; its Japji assertion is resolved by the focused fresh-browser report described below. No candidate behavior failure or stale CDN response was observed.

## Deployed build

- Live library: https://glp001-iphone-qa.github.io/glp001-iphone-test/
- Guide/update entrance: https://glp001-iphone-qa.github.io/glp001-iphone-test/preview.html
- Pages build: https://api.github.com/repos/glp001-iphone-qa/glp001-iphone-test/pages/builds/1407136590
- Deployment commit: `63780b0a15c56a974c9dafd41d3308c0b82c1bf7`.
- Frozen application source: `389e79baff4016a2ff61d1851908de0bd66beb8f`.
- Pages completed the exact commit at 2026-11-27 01:14:14 UTC. Read-only verification started after the API reported it built.

## Evidence

| Evidence | File |
| --- | --- |
| Aggregate/current result | `summary.json` |
| Pages readiness | `pages-build-ready.json` |
| Append-only API observations | `pages-build-observations.jsonl` |
| Live asset fingerprints | `2026-11-27T01-18-59-394082Z/live-fingerprints.json` |
| Initial browser run, retained selector failure | `2026-11-27T01-18-54-956Z/live-browser.json` |
| Focused Japji correction | `2026-11-27T01-21-24-453Z/live-japji-focused.json` |

All 88 manifest entries match the local candidate bytes and declared fingerprints. The live worker and deployed verification file also match, bringing the network comparison to 90 responses. Response cache headers remain in the report. No retry was needed and no stale response was observed.

Fresh headless Chrome rendered the root, preview/update guide, Today, Read, Explore, Saved, Kabir reader, topic index and Haumai source sheet. The live QA metadata/source label matches Preview 4. All four entrances show their correct current navigation and view content; Read/Saved expose ten native destinations. No uncaught runtime errors or external application requests were recorded. Live Today and Read screenshots at 390 pixels were captured and inspected.

## Retained failure and exact correction

The initial browser run's added Japji count assertion queried `.gurbani-line`. The frozen renderer declares `article.scripture-line`, so that query returned zero even though source verification and the 385-line readiness check passed. The retained failure screenshot visibly renders the opening Gurbani.

After inspecting both source and screenshot, a focused fresh browser check queried the declared DOM elements and compared every occurrence ID and rendered text with the pinned local source. All 385 matched exactly. No application file or served data changed. The original script, console output, report and screenshot remain intact.

The corrected full reusable script is `qa4-live-browser-corrected.mjs`; it was saved for future use but was not rerun. Current coverage combines the successful initial checks with the focused correction, rather than concealing or rewriting the first report.

## Reusable scripts

- `check-pages-build.py`: one bounded read-only Pages API observation per invocation; no internal polling/sleep.
- `qa4-live-fingerprints.py`: all manifest entries plus the worker and deployed verification file.
- `qa4-live-browser.mjs`: original script, retained with its incorrect Japji selector.
- `qa4-live-browser-corrected.mjs`: corrected reusable full browser script.
- `qa4-live-japji-focused.mjs`: executed focused correction comparing every rendered occurrence.

## Limits

These are fresh, nonpersistent desktop Chrome contexts and network artifact checks. They are not physical iPhone, Safari, Home Screen, VoiceOver or actual airplane-mode acceptance. The earlier synthetic same-origin upgrade test remains a separate record. No personal profile or private notes were accessed; no application edits, git mutations, comments or deployments were performed by this verification task. Qualified review and PDF copy interoperability remain open.
