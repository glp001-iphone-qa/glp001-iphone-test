# Preview 4 — isolated staging receipt

Prepared 26 November 2026, America/Los_Angeles. This records the founder-authorized update of the separate phone test site, not a production release or source-branch merge.

## Published state

- Test library: https://glp001-iphone-qa.github.io/glp001-iphone-test/
- Existing update guide: https://glp001-iphone-qa.github.io/glp001-iphone-test/preview.html
- Isolated QA deployment: `63780b0a15c56a974c9dafd41d3308c0b82c1bf7`.
- Frozen source: PR56, `389e79baff4016a2ff61d1851908de0bd66beb8f`.
- Independent source review: RT-011 on `cf6c895f5dbe8248e0349c8ba89291c54055b688`, with its stated inherited and partial checks.
- Pages build: `1407136590`, exact deployed commit reported built.
- Visible label: **Preview 4**.
- Cache version: `iphone-qa4-389e79b-20261126`.
- Previous QA commit: `e7032867b9e4ed9bed9d302d72ecf9403f6479ca`, retained as `rollback/qa3-20261126`.
- Production source main remains `a3476ac4b9be90dde350fb35dd13ce0b672c120d`.

## Available behavior

Today, Read, Explore and Saved provide one directory for the ten existing reader destinations. Read offers bounded title/alias search. Saved opens the native saved-learning controls of each reader without replacing their storage formats. Existing source sheets, silent Simran, the separate breathing tool and the Gurdwara directory remain available.

This does not add the combined Knowledge Explorer. PR58 is a separate source-only review candidate. Daily Hukamnama, the wider history library, full-Granth coverage and rights-cleared audio are not introduced by this staging update.

## Verification and source preservation

`summary.json` identifies the successful local update, layout, offline, Saved and static-artifact checks. The update was exercised from the prior cached QA3 build on the same disposable loopback origin, using a Punjabi note and bookmark created through the ordinary UI. Both survived the explicit update. No personal browser profile or real reflection was accessed.

All ten directory source bindings remain unchanged. Every carried source/teaching/application file matches the frozen source, and the declared QA HTML additions reverse exactly. PWA identity, hostname, reader paths and storage keys are preserved. The 200% text checks measured actual font sizes, including the QA banner, and checked reachable actions.

Live observations are in `live/summary.json` and its referenced reports. All 88 cache assets plus the worker and deployment-verification file match the staged bytes. The actual published root, guide, four entrances and representative readers/source sheets were opened in fresh desktop Chrome. Japji's complete 385 rendered occurrence IDs and texts matched the unchanged local source.

The first live script used a nonexistent Japji CSS selector. Its failed report and screenshot are retained; a focused check against the declared renderer corrected the instrument. No application change was made. Earlier local static-instrument failures are also retained and explained. These records do not turn desktop simulations into phone acceptance.

## Continuing limits

Physical iPhone, Safari, Home Screen, VoiceOver and airplane-mode acceptance remain unperformed. Qualified Gurbani/Punjabi review and printed-page collation remain outstanding. Article PDF-copy interoperability remains open.

The pre-existing SRI-01 script-integrity gap and SK-01 Sukhmani reading-position observation remain open; this directory update does not claim to repair them. The separate PR47 Sukhmani linked-visit repair is not included. Existing teaching remains explicitly unreviewed.

## Rollback and review

The old QA tree is retained on its rollback branch. If rollback is required, restore that tree in a new forward QA commit, assign a new cache version and regenerate fingerprints so the existing update flow can offer it. Do not clear or migrate browser learning data. Production is a separate origin.

The published site's main branch contains only deployment files. This receipt, the preparation adapter and test evidence are retained on nondeployed branch `evidence/qa4-20261126`. No source pull request was merged, and no review or release approval is inferred from passing checks.
