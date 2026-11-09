# Progress

Last updated: 2026-11-09 by Phase 6 session

## Phase checklist
Legend: [ ] todo, [~] in progress, [x] done

- [x] 1. Repository and deploy
- [x] 2. Metrics library
- [x] 3. Texas geometry and unit registry
- [x] 4. Texas data pipeline
- [x] 5. First live map (end-to-end slice)
- [x] 6. All metrics and explanation
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
Start Phase 7 (All Texas statewide races and race picker) in a new session using KICKOFF_PROMPTS.md.

## Last session summary
- Done: Phase 6. New pure modules `src/domain/format.ts` (U+2212 minus, signed/commas), `src/domain/view.ts` (per-unit metric dispatch, per-metric scale choice, tooltip detail, turnout notice rule); `src/domain/scales.ts` extended (6-step red/blue and purple/green ramps, fixed percent edges, 1-2-5 raw edges chosen from the largest value in view). UI: `controls.ts` (metric select, All votes / Two-party toggle, race select for single-race metrics, candidate A/B selects filled from race data), `tooltip.ts` (hover, keyboard focus, click/tap, Escape), `explain.ts` (one-sentence definition per metric, color meaning), `table.ts` (sortable data table in a details element), legend now per metric. All 10 §4 metrics selectable. Turnout notice appears for this pair with a button to the Turnout view. Collin tooltip shows +23.18 pts, +112,726, +30,288, +13.64%, −11.60% (plus the +119,983 / −7,257 split and −60,049). Two-party changes Collin swing to +23.75.
- Tests: 107 vitest (14 new) and 19 Playwright e2e (one per metric, purple/green vs red/blue, two-party, candidate selectors, notice, hover tooltip, keyboard focus tooltip, tap, sortable table) pass locally via full `npm test`.
- Not done: nothing in Phase 6 scope. Tooltip, table and controls have no URL state yet (Phase 9).
- Mocked or stubbed: none. Race pair is still fixed in app.ts until Phase 7.
- Judgment calls: (1) margin and raw margin are single-race metrics, so a Race select (A or B) appears for them; default is the newer race. (2) Candidate metrics default to the D-side candidate in each race (Harris → Talarico matches §4). (3) Raw-vote scales use six 1-2-5 edges from the largest absolute value in view (the §5 table says "1-2-5 values chosen by the largest absolute value"), top edge is the largest 1-2-5 value not above the max. Candidate names are title-cased from source names for display only. (4) Turnout notice rule: one race is president and the other is in a non-presidential year, or statewide total changed more than 10%.
- Uncertain: 254 map paths are all tab stops (tabindex=0), which makes keyboard traversal long; a skip link or roving tabindex would help but is not in the plan. The tooltip is pointer-events none and positioned from the path box on focus, checked only in Chromium at desktop width, not on a real touch device.
- Deploy result: see the next line (filled in after the push).

## Waiting on the owner
- Download MEDSL county presidential file (Phase 12).

## Known issues
- First deploy (6545b76) failed: github-pages environment only allowed a different branch. Fixed by owner in Settings → Environments.
- Actions warnings: Node 20 action deprecation (checkout/setup-node/upload-pages-artifact run on Node 24 anyway); ubuntu-latest migrates to Ubuntu 26 from 2026-10-19. Not blocking.

## Blocked / needs architect
