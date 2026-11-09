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
Not yet implemented (Phase 19).

## Status
Phase 1 complete: placeholder page deployed via GitHub Actions.

Live site: https://antimatterhut.github.io/electionShifter/
