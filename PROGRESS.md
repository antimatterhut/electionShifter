# Progress

Last updated: 2026-11-09 by Phase 4 session

## Phase checklist
Legend: [ ] todo, [~] in progress, [x] done

- [x] 1. Repository and deploy
- [x] 2. Metrics library
- [x] 3. Texas geometry and unit registry
- [x] 4. Texas data pipeline
- [ ] 5. First live map (end-to-end slice)
- [ ] 6. All metrics and explanation
- [ ] 7. All Texas statewide races and race picker
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
Start Phase 5 (First live map) in a new session using KICKOFF_PROMPTS.md.

## Last session summary
- Done: Phase 4. Snapshots (all dated 2026-11-09, sha256 in SOURCE.json): `pushbuild-2026` (tx.csv, upstream commit 56b4b499507f5b8fce9433640de34a56df4ad619, the 2026-11-06 11:32 PM ET results), `tlc-2024` (office ids 1 and 2), `medsl-2024` (2024-president-state.csv, upstream commit df531089c78e6d0098db1a6bfb3849a066a06995). Adapters, normalize, validate, emit/build and `verify` are in `pipeline/`. `npm test` now runs `node pipeline/cli.ts verify` (rebuild into a temp dir, byte-compare, fail on stale or extra files under public/data/v1). Both races have 254 units, no nulls, units equal the TX topology ids. Golden values all match (Collin/Denton both races; 2024 Harris 4,835,134, Trump 6,393,403, total 11,404,528; 2026 Talarico 5,444,982, Paxton 4,249,373, total 9,889,704). 87 tests pass.
- Validation: 2026 Senate Tier 1 pass (county sums equal the feed statewide rows exactly), Tier 2 `pending` (plan §6: unofficial Tier 2 is reported only). 2024 President Tier 1 `na` (TLC has no statewide row), Tier 2 pass against MEDSL, max diff 0.0036% (tolerance max(50, 0.05%)). So "Tier 1 and Tier 2 pass" holds per race only where §6 defines them; no race has both.
- Not done: nothing in Phase 4.
- Mocked or stubbed: none. `data/reference/statewide_totals.csv` is generated from the MEDSL snapshot by `npm run data:reference`.
- Design notes: `race_map.csv` has extra columns `source_file` and `source_label`/`method_note` pass-through (not a §3 schema change). Aliases: one row added, `pushbuild-2026,TX,Lasalle,48283`. Ambiguous unit names (e.g. Baltimore) only fail when a source uses them without an alias. Write-in-party candidates in the feed (party W, e.g. the quoted-name candidate) go to `other_votes`. `candidate_match` in the reference file is a surname matched case-insensitively against candidate names; it is data, not code.
- Uncertain: (1) 2024 `as_of` is 2026-11-09, the TLC retrieval date, because I did not find an official canvass date; the Texas SoS archive blocks automated fetch, so no number from the SoS itself was used. "Certified" rests on TLC (state agency) plus the MEDSL cross-check. (2) TLC total 11,404,528 vs MEDSL total 11,388,674 (0.14%) differs mostly in write-ins/other (TLC other_votes 24,730); candidate counts agree within 0.004%. Totals are not a tolerance item in §6 so this is recorded, not enforced. (3) TLC VTD keys include non-numeric forms (e.g. `0050010A`, `10903-3`); only the first 3 digits are used, and every key resolved to one of 254 counties.
- Deploy result: Actions run for f7701b7 concluded success (Linux CI ran verify and the full suite); live URL returns 200 and serves data/v1/manifest.json and the 2026 race file.

## Waiting on the owner
- Download MEDSL county presidential file (Phase 12).

## Known issues
- First deploy (6545b76) failed: github-pages environment only allowed a different branch. Fixed by owner in Settings → Environments.
- Actions warnings: Node 20 action deprecation (checkout/setup-node/upload-pages-artifact run on Node 24 anyway); ubuntu-latest migrates to Ubuntu 26 from 2026-10-19. Not blocking.

## Blocked / needs architect
