# Progress

Last updated: 2026-11-09 by Phase 2 session

## Phase checklist
Legend: [ ] todo, [~] in progress, [x] done

- [x] 1. Repository and deploy
- [x] 2. Metrics library
- [ ] 3. Texas geometry and unit registry
- [ ] 4. Texas data pipeline
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
Start Phase 3 (Texas geometry and unit registry) in a new session using KICKOFF_PROMPTS.md.

## Last session summary
- Done: Phase 2. `src/domain/{types,aggregate,metrics}.ts`; 35 tests passing (`npm test`), covering every §4 row and edge case. Collin + Denton swing = +22.43 (test also shows averaging county swings gives 22.37).
- Not done: nothing in Phase 2.
- Mocked or stubbed: none. Tests use in-memory fixtures built from the §4 worked example.
- Design notes: metrics take summed `Totals` (aggregate first, then metric) and return `{value, reason}`; reason codes are in `types.ts`. `decomposeShift` rounds the margin part to a whole vote and gives the turnout part as the remainder, so the two integers sum exactly to raw shift (turnout part may differ from the unrounded formula by under 0.5 vote).
- Uncertain: percent metrics are returned in points (x100). A unit counts as missing if its total or any D/R-side candidate vote is null.
- Deploy result: see below.

## Waiting on the owner
- Download MEDSL county presidential file (Phase 12).

## Known issues
- First deploy (6545b76) failed: github-pages environment only allowed a different branch. Fixed by owner in Settings → Environments.
- Actions warnings: Node 20 action deprecation (checkout/setup-node/upload-pages-artifact run on Node 24 anyway); ubuntu-latest migrates to Ubuntu 26 from 2026-10-19. Not blocking.

## Blocked / needs architect
