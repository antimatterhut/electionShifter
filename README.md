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
- `npm run data:reference` regenerates `data/reference/statewide_totals.csv` from the MEDSL snapshot.
- `npm run data:build` rebuilds units, geometry, race files and `manifest.json` under `public/data/v1/`.
  Never hand-edit those files. An unmatched county label fails the build: add a row to
  `data/crosswalk/aliases.csv`. Contest-to-race mapping, status and as-of date live in
  `data/overrides/race_map.csv`.
- `npm run data:verify` is the byte-compare check that `npm test` runs.

Full refresh and certification workflow: Phase 19.

## Status
Phases 1-5 complete: deploy, metrics library, Texas geometry and unit registry, Texas data pipeline
(`2024-TX-president-gen` certified, `2026-TX-us-senate-gen` unofficial), and the first live map
(Texas 2026 Senate vs 2024 President margin swing, 254 counties).

Live site: https://antimatterhut.github.io/electionShifter/
