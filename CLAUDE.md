# electionShifter: working rules

Live: https://antimatterhut.github.io/electionShifter/ (served from `/electionShifter/`)
Repo: https://github.com/antimatterhut/electionShifter (branch `main`)
Test command: `npm test`

## Every session
1. Read CLAUDE.md, PROGRESS.md, and the current phase in MASTER_PLAN.md before doing anything.
2. Work only on the assigned phase. Don't refactor unrelated code or add unrequested features.
3. If the plan is wrong or unworkable, stop and record it in PROGRESS.md under
   "Blocked / needs architect". Don't improvise a redesign.

## Tests
- Write tests alongside each feature. Run them and show the real output.
- Never delete, skip, or weaken a test to make it pass.
- For bugs, write a failing test first.
- Run the full `npm test`, not only new tests, before every commit.
- Build and run after each major change. Fix errors before continuing.

## Git and deploy
- Commit AND push to `main` on antimatterhut/electionShifter after each working step, with a clear message.
- Never push with failing tests.
- Never leave finished work uncommitted or unpushed at the end of a session.
- After pushing, confirm the deploy succeeded. `gh` may be missing, so use:
  `curl -s "https://api.github.com/repos/antimatterhut/electionShifter/actions/runs?branch=main&per_page=1"`
  Check `status` and `conclusion` for the commit you pushed, then curl the live URL.
- If the deploy failed, fixing it is the next task.

## Ask first
Ask before deleting files, changing the schema in MASTER_PLAN.md §3, or adding a major dependency.
Dependencies named in a phase are already approved.

## Secrets
No hardcoded secrets. Use `.env`, and list names in `.env.example`.

## Documentation
Keep README.md updated with setup, run, test, deploy and data-refresh instructions.

## End every session
Update PROGRESS.md, commit and push it, and summarize: what's done, what's not, what was mocked or
stubbed, and anything uncertain. If unsure something works, say so.

## Project conventions

### Data
- `data/raw/**` is immutable. Never edit a raw file. A refresh creates a new snapshot directory.
- Every raw snapshot has a SOURCE.json with sha256 hashes.
- Pipeline output must be deterministic: sorted keys and rows, no timestamps, no absolute paths.
- Never hand-edit `public/data/**`. Regenerate it with the pipeline.
- Never hardcode a candidate name in `src/` or `pipeline/`. Names appear only in raw data, processed
  data, fixtures, and tests.
- Unmatched geography labels are errors. Add an `aliases.csv` row; never fuzzy match.
- Validation tolerances are in MASTER_PLAN.md §6. Never widen one to pass a test.
- Don't enter numbers from media or Wikipedia as official.
- Store votes as integers. Compute percentages only in `src/domain`.

### Metrics
- Group results sum raw votes first. Never average percentages.
- Change is always B minus A. Positive margin means Democratic lead.
- Partisan red/blue is for margin metrics only. Candidate and turnout changes use purple/green.

### Paths and portability
- Fetch data with `import.meta.env.BASE_URL`. Never use a root-relative `/...` URL.
- Share links always use the full live site URL.
- Scripts must work on Windows and Linux: Node only, no bash in npm scripts.
- Import local TypeScript with explicit `.ts` extensions in `pipeline/`.

### Status honesty
- Any view involving unofficial data shows the unofficial label, including PNG exports.
- A race is `certified` only with a recorded source and date and a passing Tier 2 check.
