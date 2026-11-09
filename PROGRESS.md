# Progress

Last updated: 2026-11-09 by Phase 7 session

## Phase checklist
Legend: [ ] todo, [~] in progress, [x] done

- [x] 1. Repository and deploy
- [x] 2. Metrics library
- [x] 3. Texas geometry and unit registry
- [x] 4. Texas data pipeline
- [x] 5. First live map (end-to-end slice)
- [x] 6. All metrics and explanation
- [x] 7. All Texas statewide races and race picker
- [ ] 8. County groups
- [ ] 9. Shareable URLs
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
Start Phase 8 (County groups) in a new session using KICKOFF_PROMPTS.md.

## Last session summary
- Done: Phase 7. 27 Texas statewide races now in the manifest. 2026 (pushbuild feed, all Tier 1 pass): Senate, Governor, Lt. Governor, Attorney General, Comptroller, Land, Agriculture, Railroad Commissioner, Supreme Court (Chief Justice, Places 2 unexpired, 7, 8), Court of Criminal Appeals (Places 3, 4, 9), 15th Court of Appeals (Chief Justice, Places 2, 3; that court has statewide jurisdiction). 2024 (TLC portal): President, Senate, Railroad Commissioner, Supreme Court Places 2/4/6, CCA Presiding Judge and Places 7/8. TLC office ids come from the portal's Offices list (https://ted.capitol.texas.gov/api/Offices); statewide offices not on the 2024 ballot return HTTP 500. District-level contests (US/State House, State Senate, DAs, other appeals courts) are not in race_map.csv. UI: `src/ui/racepicker.ts` (year then race, for A and B; changing year keeps the same office when it exists), `src/domain/races.ts` (sort/filter helpers), `app.ts` now loads any pair from the manifest (race files cached; metric and basis kept; candidate selectors reset). Title says "voted differently" when both races are the same year. Margin-based metrics on a pair with a race lacking a D or R candidate show "Not comparable: no D–R contest (<race>)" with a hatched map; candidate and turnout metrics still work.
- New data: raw snapshots `tlc-2024/2026-11-09b` (9 office files) and `medsl-2024/2026-11-09b` (president and senate state files). The same-day suffix "b" is because snapshots are immutable and the earlier one already used 2026-11-09. Old snapshots are untouched. `fill-reference` now writes Tier 2 rows for 2024 President and 2024 Senate (MEDSL senate file lists names as "FIRST LAST", so surname = last word when there is no comma).
- Tests: 137 vitest (new: races/not-comparable unit tests, texas-races data tests incl. Governor vs Senate and French vs Paxton goldens, no-names grep test over src/, pipeline/ and index.html) and 27 Playwright e2e (8 new: picker defaults, Railroad Commissioner vs Senate 2026 by margin swing, raw shift, raw margin, Governor vs Senate, French vs Paxton, year change, status badges, uncontested race via a mocked race file) pass via full `npm test`. Two older tx.test.ts assertions were updated because the manifest and reference file grew (they now check all races and both reference files); none weakened.
- Not done: nothing in Phase 7 scope. Picker state is not in the URL (Phase 9).
- Mocked or stubbed: the uncontested-race e2e test mocks a race file with the Democratic candidates removed, because every real Texas statewide race in the data has both a D and an R. The unit tests cover the same logic with fixtures.
- Judgment calls: (1) 2024 down-ballot races (Railroad Commissioner, courts) are `unofficial` with a method_note: the source is a state agency, but there is no independent statewide total on file, and CLAUDE.md requires a passing Tier 2 check for `certified`. 2024 President and Senate are `certified` (Tier 2 vs MEDSL, max diff 0.0036% and 0.0356%, tolerance 0.05%). The unofficial badge therefore shows for any pair with a 2024 down-ballot race; as_of for those is the retrieval date 2026-11-09. (2) Included the 15th Court of Appeals as statewide judicial. (3) TLC candidate names are surname only ("Allred"), as in the source; names are not altered. (4) The no-names test checks full names and every name part of 4+ letters, with an allowlist of one bare word ("field", used by mapshaper's id-field option).
- Uncertain: a Tier 2 source for the 2024 down-ballot races could be MEDSL's `individual_states/tx24.zip` precinct file (3.9 MB zip, not fetched); architect to decide if that is acceptable as "independent" of TLC or whether the official SOS canvass should be used. Deploy: see below.

## Waiting on the owner
- Download MEDSL county presidential file (Phase 12).

## Known issues
- First deploy (6545b76) failed: github-pages environment only allowed a different branch. Fixed by owner in Settings → Environments.
- Actions warnings: Node 20 action deprecation (checkout/setup-node/upload-pages-artifact run on Node 24 anyway); ubuntu-latest migrates to Ubuntu 26 from 2026-10-19. Not blocking.

## Blocked / needs architect
