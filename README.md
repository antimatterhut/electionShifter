# electionShifter

Static web tool that compares two races at county level and maps the shift.
Live: https://antimatterhut.github.io/electionShifter/

See `MASTER_PLAN.md` for the plan, `CLAUDE.md` for working rules and `PROGRESS.md` for status.

## Setup
Requires Node 26 (see `.nvmrc`).

```
npm install
```

## Run
`npm run dev`

## Test
`npm test` runs the type-check, `node pipeline/cli.ts verify` (rebuilds all generated data from raw into a
temp dir and byte-compares it with the committed files; Tier 1 and Tier 2 validation run as part of the
rebuild), unit tests, the production build, and the Playwright e2e test (`playwright test`, against
`vite preview` at `/electionShifter/`). The e2e screenshot is written to `test-results/` (git-ignored).

## Deploy
Push to `main`. GitHub Actions runs the tests and publishes `dist/` to GitHub Pages
(Settings → Pages → Source must be "GitHub Actions").

## Shareable links
The address bar tracks the view with `history.replaceState`. Params: `v=1, a, b` (race ids), `metric`, `basis`, `which` (A/B, for single-race metrics), `state`, `ca`, `cb` (candidate ids), `g` (comma-separated county ids), `gname`, `mode`. Invalid values fall back to defaults and show a notice. "Copy link" always produces a `https://antimatterhut.github.io/electionShifter/?...` URL.

## Data refresh
Geometry (Phase 3):
- `npm run data:fetch:census` downloads the Census county file into a new dated snapshot under
  `data/raw/census-cb/` with SOURCE.json hashes. It refuses to overwrite an existing snapshot.
- `npm run data:build` regenerates `data/crosswalk/units.csv`, `public/data/v1/units.json` and
  `public/data/v1/geo/states/TX.topo.json` from the latest verified snapshot. Output is deterministic.

Texas results (Phase 4). Each fetch writes a new dated snapshot with SOURCE.json hashes and refuses to
overwrite an existing one. Arguments after `--` are `YYYY-MM-DD [upstream sha]`:
- `npm run data:fetch:pushbuild`: 2026 feed, pinned to an upstream commit (default is the commit that
  produced the golden values; the SHA is recorded in SOURCE.json).
- `npm run data:fetch:tlc`: Texas Capitol Data Portal 2024 VTD files (President = id 1, Senate = id 2).
- `npm run data:fetch:medsl`: MEDSL 2024 President state totals, the independent Tier 2 reference.
- `npm run data:reference` regenerates `data/reference/statewide_totals.csv` for 2024 President and Senate from the MEDSL snapshot.
- `npm run data:build` rebuilds units, geometry, race files and `manifest.json` under `public/data/v1/`.
  Never hand-edit those files. An unmatched county label fails the build: add a row to
  `data/crosswalk/aliases.csv`. Contest-to-race mapping, status and as-of date live in
  `data/overrides/race_map.csv`.
- `npm run data:verify` is the byte-compare check that `npm test` runs.

Full refresh and certification workflow: Phase 19.

## Status
Phases 1-8 complete: deploy, metrics library, Texas geometry and unit registry, Texas data pipeline
(`2024-TX-president-gen` certified, `2026-TX-us-senate-gen` unofficial), the first live map, and the
metric selector. The map offers all ten metrics (margin swing, raw margin shift, shift from margin
change, shift from turnout change, margin, raw margin, candidate change as % and votes, turnout change as
% and votes), an all-votes/two-party toggle, candidate selectors, a turnout notice, a tooltip that works on
hover, keyboard focus and tap, and a sortable data table. Red/blue is used for margin metrics only;
candidate and turnout changes use purple/green.

Phase 7 adds every Texas statewide race (2024: President, Senate, Railroad Commissioner, Supreme Court
and Court of Criminal Appeals seats; 2026: all statewide executive offices, Supreme Court, Court of Criminal
Appeals and 15th Court of Appeals) and a two-step race picker (year, then race) for each side of the
comparison. A margin metric on a pair where a race has no Democratic or no Republican candidate shows
"Not comparable: no D–R contest". To add a race, add a row to `data/overrides/race_map.csv`, run
`npm run data:build`, and commit the output. Only 2024 President and Senate are `certified`; the other 2024
offices have no independent statewide total on file yet and are labeled unofficial.

Live site: https://antimatterhut.github.io/electionShifter/

Phase 8 adds county groups: click counties on the map (or press Enter on a focused county) to select
them. The group panel lists the counties with Remove buttons, takes an optional name, and shows the chosen
metric plus margin swing, raw margin shift and turnout change, all computed from summed votes. Counties
without data in both races are left out and disclosed ("2 of 5 counties have data in both races").
