# Preview-label investigation — retained evidence

Checked 27 November 2026 at 02:06–02:07 UTC (26 November in the founder's time zone).

This is an evidence-only branch. The live QA main branch remains at `63780b0a15c56a974c9dafd41d3308c0b82c1bf7`; this commit does not deploy anything.

Claude's PREV-01 finding at review head `319266054b0c805c8862af3067866007b5ce7c26` reports that a fetching tool did not show the Preview 4 label or the Today/Read/Explore/Saved navigation at the live root. The raw responses and fresh browser DOM captured here do show them, and the responses exactly match the deployed QA4 git objects.

Start with `conclusion.json`, `http-record.json` and `browser-report.json`. Raw responses, frozen comparison files, rendered DOM, screenshots and the read-only browser instrument are retained alongside them. No actual learning records or existing browser profiles were accessed; fresh-context localStorage remained empty.

This evidence does not explain the earlier extraction: its raw tool output is not available here. It does not close the independent finding by fiat or establish physical-phone acceptance. No product patch was made. Compare the two retained observations before changing the finding's status.
