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
`npm test` (type-check, unit tests, production build)

## Deploy
Push to `main`. GitHub Actions runs the tests and publishes `dist/` to GitHub Pages
(Settings → Pages → Source must be "GitHub Actions").

## Data refresh
Geometry (Phase 3):
-  downloads the Census county file into a new dated snapshot under
   with SOURCE.json hashes. It refuses to overwrite an existing snapshot.
-  regenerates ,  and
   from the latest verified snapshot. Output is deterministic.

Full refresh and certification workflow: Phase 19.

## Status
Phases 1-3 complete: deploy, metrics library, Texas geometry and unit registry.

Live site: https://antimatterhut.github.io/electionShifter/
