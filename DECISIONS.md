# Decisions

Format: ID, decision, reason. Changes require a new entry; don't rewrite history.

## Architecture
- D-001 Static site on GitHub Pages; no server or database. All queries are small comparisons of pre-built data.
- D-002 Commit both raw and processed data. CI stays offline and reproducible.
- D-003 `npm test` rebuilds data and byte-compares. Determinism is enforced, not assumed.
- D-004 Query-string state rather than hash or storage. Works on a static host and links are readable.
- D-005 No dynamic social preview in v1. A static host cannot produce per-URL metadata.

## Stack
- D-010 TypeScript for pipeline and UI. One language; metric and schema types are shared.
- D-011 Run pipeline with Node type stripping. Removes a runner dependency.
- D-012 Vite. Handles base path and bundling with little configuration.
- D-013 No UI framework. The app is one view with a few controls.
- D-014 SVG with d3-geo. About 3,100 counties is workable in SVG; SVG makes PNG export and per-unit accessibility simple, and needs no tile service. MapLibre rejected for this reason.
- D-015 mapshaper for shapefiles to TopoJSON. Handles simplification with shared borders.
- D-016 csv-parse. Quoted fields appear in real data.
- D-017 Vitest and Playwright. PNG export and base-path loading need a real browser.
- D-018 Node scripts only. The owner develops on Windows; CI runs Linux.
- D-019 Pin Node 26 through .nvmrc to match the owner's machine.
- D-020 Use `curl` on the public API for deploy checks. `gh` is not installed.

## Data model
- D-030 unit_id is FIPS-based, with `02Hnn` for Alaska and `ss999` for unassignable votes.
- D-031 One current comparison geography. All races roll onto it, so any two races share units.
- D-032 Census 2025 cartographic county file. Latest confirmed vintage. us-atlas rejected: 2017 edition.
- D-033 Connecticut uses planning regions for all years. Matches current Census data and 2024 compilations.
- D-034 New England towns roll up to county in v1. Keeps one national unit type; towns are kept in raw.
- D-035 Alaska uses House districts. It's how results are reported; boroughs would need allocation estimates.
- D-036 Unmatched labels are errors. Silent mismatches are the worst failure in this kind of data.
- D-037 Fusion votes sum to the candidate. Observed in Connecticut 2026.
- D-038 Write-ins go to other_votes; named candidates are preserved.
- D-039 Ranked-choice uses first-round votes. Available for all units and comparable with other races.
- D-040 Never store percentages. Prevents accidental averaging.
- D-041 Suppressed values are null, not zero.
- D-042 Candidates identified from source data only.
- D-043 Row exclusions live in a documented override file.
- D-044 Status per race; mixed comparisons are labeled unofficial.

## Metrics and design
- D-050 Default margin is (D−R)/total, with a two-party toggle.
- D-051 Change is B−A; positive margin is Democratic.
- D-052 Show an exact decomposition of raw shift into margin and turnout effects. It explains midterm/presidential differences using arithmetic rather than a model.
- D-053 Margin is unavailable without both major groups, unless an override is approved. Avoids meaningless values.
- D-054 Fixed swing bins so maps are comparable; raw bins vary by view because county sizes vary too widely.
- D-055 Red/blue only for partisan metrics. Purple/green for candidate and turnout changes.
- D-056 National midterm view is an explicitly labeled mosaic, Senate first then Governor, with no national aggregate.
- D-057 Group selection limited to one state in v1.

## Sources
- D-060 pushbuild feed for unofficial 2026, pinned. CC0, with county rows for Texas confirmed. Treated as provisional.
- D-061 Texas 2024 from the Capitol Data Portal: state agency, scripted CSV, CC BY.
- D-062 MEDSL countypres for national 2024 President: CC0; manual because of its guestbook.
- D-063 tonmcg for cross-check only: its README disclaims authority.
- D-064 OpenElections excluded in v1 pending license clarity and coverage.
- D-065 Two-tier validation: same-feed sums don't independently prove correctness.
- D-066 Tolerances: certified max(50, 0.05%); unofficial max(50, 0.10%). Observed Texas 2024 D difference between sources was about 0.002%.
- D-067 Hand-collected official files are allowed; media tallies are not official.

## Process
- D-080 Texas slice first, then features, then geographic breadth. Proves the path before scaling.
- D-081 Golden test values bind to pinned snapshots so refreshes don't break them.
- D-082 Phase 1 renames local `master` to `main`.
