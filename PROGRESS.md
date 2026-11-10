# Progress

Last updated: 2026-11-09 by Phase 9 session

## Phase checklist
Legend: [ ] todo, [~] in progress, [x] done

- [x] 1. Repository and deploy
- [x] 2. Metrics library
- [x] 3. Texas geometry and unit registry
- [x] 4. Texas data pipeline
- [x] 5. First live map (end-to-end slice)
- [x] 6. All metrics and explanation
- [x] 7. All Texas statewide races and race picker
- [x] 8. County groups
- [x] 9. Shareable URLs
- [ ] 10. PNG export
- [ ] 11. 2026 full-county states
- [ ] 12. 2024 President and Senate everywhere
- [ ] 13. 2024 Governor and other statewide offices
- [ ] 14. Connecticut and New England rollups
- [ ] 15. Alaska
- [ ] 16. 2026 gap states, group 1
- [ ] 17. 2026 gap states, group 2
- [ ] 18. National view
- [ ] 19. Refresh and certification workflow
- [ ] 20. v1 audit

## Next steps
Start Phase 10 (PNG export) in a new session using KICKOFF_PROMPTS.md.

## Last session summary
- Phase 9 done: `src/domain/urlState.ts` (pure parse/serialize/shareUrl), `src/ui/share.ts` (Copy link button + readonly link box, replaceState), wired in `app.ts`; group panel takes restored ids/name and reports name edits. Tests: 148 vitest (5 new: round-trip over all metrics x basis x which, defaults, invalid values, garbage, live-site link) and 33 Playwright (3 new in `share.spec.ts`: full URL restores view and group and reopens in a new browser context from the copied link, replaceState adds no history entries, invalid params show a notice without page errors) via full `npm test`.
- Judgment calls: added a `which` param (not in the §Phase 9 list) so margin / raw margin restore exactly. `mode` is parsed, validated and carried through but unused until Phase 18. Candidate ids are checked against the race files after load. The URL is rewritten on every view or group change.
- Uncertain: the Copy button's clipboard write is not covered by a test (headless permissions); the link box content is. "New context" was tested with a fresh Playwright context against the local preview, not the deployed site.
- Deploy result (Phase 9): Actions run for 5933fd0 concluded success; live URL (with query) returns 200.

- Owner follow-up after Phase 9 (UI readability): (1) candidate-change legend now names the candidates ("Green counties: X did better than Y; Purple: worse") using names from race data; (2) new "Total votes" section (`src/domain/totals.ts`, `src/ui/totals.ts`) with per-candidate votes and share for both races over counties present in both, plus a head-to-head line for two chosen candidates ("X has N more votes: a to b"); its selectors share state with the metric panel's candidate selectors. Fixed a bug found on the way: the controls kept a stale copy of the spec, so changing the metric reset a candidate chosen elsewhere. Tests: 149 vitest, 34 Playwright. Outside the numbered phases; architect may want to fold into Phase 10 (PNG should include the legend text).

- Owner follow-up 2: (1) new metric `head_to_head` ("Hypothetical head-to-head"): the chosen candidate from race A vs the chosen candidate from race B, per county, as (D-side - R-side)/(D+R) points; red/blue; needs one D-side and one R-side candidate, otherwise "Not comparable". Totals panel now leads with a hypothetical table (votes, share of the two candidates' combined votes, counties won, winner and margin). This adds an 11th metric beyond MASTER_PLAN §5; architect to confirm. Shares are of the two candidates' combined votes and do not adjust for turnout differences between years. (2) Legend moved onto the map (lower-left overlay, static below the map under 40rem wide); long explanation folded into "About this scale". Tests: 152 vitest, 35 Playwright. Deploy confirmed for d795791 (success, live 200). Not checked: mobile layout of the overlay.

- Owner follow-up 3: head-to-head view now has a matchup panel beside the map (`src/ui/matchup.ts`): candidates with their colors, statewide shares and exact votes, a split bar, and the county under the pointer (hover, focus or tap) with exact votes for both candidates. The hover text in this mode shows only the two candidates' votes, shares and lead (no D vs R race table). The hypothetical table in the Total votes section was removed as redundant. Panel is hidden for other metrics and stacks under the map below 50rem. Tests: 152 vitest, 35 Playwright (the head-to-head e2e now checks the county's exact votes in the panel and hover against the data files).

### Previous session (Phase 8)
- Done: Phase 8. `src/ui/groups.ts`: pure `summarizeGroup` (sums votes over counties usable in both races via `commonUnits`/`aggregateUnits`, then applies the metric functions) and `disclosure`, plus the panel (list with Remove, optional name, Clear, chosen metric, margin swing, raw shift, turnout %, D/R/total per race). Click or Enter/Space on a county toggles it; selected counties get a black outline (`data-selected`). Missing counties are listed and disclosed as "N of M counties have data in both races"; a margin metric on a pair with no D-R contest shows the not-comparable message in the panel. The panel follows metric, basis, candidate and race-pair changes. The selection persists when the race pair changes.
- Tests: 141 vitest (4 new in `tests/unit/groups.test.ts`: Collin + Denton +22.43 / +205,151 / −11.69%, equality with `aggregateUnits` + metrics, partial-missing disclosure, all-missing) and 30 Playwright e2e (3 new in `tests/e2e/groups.spec.ts`) pass via full `npm test`.
- Not done: nothing in Phase 8 scope. Group is not in the URL (Phase 9).
- Mocked or stubbed: the real default pair gives Collin + Denton different numbers than the §4 worked example, so the e2e test mocks the two race files' Collin and Denton rows with the §4 inputs to check +22.43, +205,151 and −11.69% in the UI. The partial-missing e2e mocks Denton as null in race B.
- Judgment calls: (1) A county missing in either race is excluded from both sides of the group so the comparison is like-for-like. (2) Selection uses click on the map; the existing click-to-pin tooltip still also fires. (3) Group state is not reset when the race pair changes.
- Uncertain: not yet checked at narrow mobile widths; the panel sits below the legend.
- Follow-up (owner request, after Phase 8): raw-vote metrics (raw shift, shift from margin/turnout, raw margin, candidate change votes, turnout change votes) now use a continuous symmetric-log color ramp (`rawScale`, `continuousColor`, `gradientLegend` in `src/domain/scales.ts`; gradient legend in `src/ui/legend.ts`) instead of 8 fixed bins, because fixed bins lumped the largest counties (7 counties from +30k to +98k shared one color). `rawEdges` is removed; its tests were replaced by tests of the new behavior (continuous scale, distinct shades for the 7 largest counties and small ones, symmetry, neutral zero, darkest at max, legend gradient). Percent and point metrics keep the fixed §5 bins. This deviates from §5's "7-step ramp per side" wording for raw scales; architect to confirm. Scale is symmetric, so when changes are mostly one-signed half the legend is unused.
- Deploy result (Phase 8): Actions run for dcd078c concluded success (full npm test incl. Playwright ran in CI); live URL returns 200.

## Waiting on the owner
- Download MEDSL county presidential file (Phase 12).

## Known issues
- First deploy (6545b76) failed: github-pages environment only allowed a different branch. Fixed by owner in Settings → Environments.
- Actions warnings: Node 20 action deprecation (checkout/setup-node/upload-pages-artifact run on Node 24 anyway); ubuntu-latest migrates to Ubuntu 26 from 2026-10-19. Not blocking.

## Blocked / needs architect
