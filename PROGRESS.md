# Progress

Last updated: 2026-11-09 by Phase 5 session

## Phase checklist
Legend: [ ] todo, [~] in progress, [x] done

- [x] 1. Repository and deploy
- [x] 2. Metrics library
- [x] 3. Texas geometry and unit registry
- [x] 4. Texas data pipeline
- [x] 5. First live map (end-to-end slice)
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
Start Phase 6 (All metrics and explanation) in a new session using KICKOFF_PROMPTS.md.

## Last session summary
- Done: Phase 5. `src/domain/scales.ts` (fixed ±1/3/6/10/15/25 bins, symmetric, neutral center), `src/ui/{data,map,legend,app}.ts`, `src/main.ts`, styles. d3-geo and topojson-client added; @playwright/test as dev dependency. Map uses geoConicEqualArea (rotate 100, parallels 27.5/35) fit to the 254 counties. Title, subtitle, amber UNOFFICIAL badge (mixed-status rule), legend with Missing hatch, source line for both races. `npm test` now ends with `playwright test` against `vite preview` at the base path; the workflow installs chromium before tests. 93 vitest tests plus 1 e2e pass locally. e2e checks: 254 paths, legend, UNOFFICIAL, Collin fill is the +15 to +25 bin with label +23.18, no console errors, no 4xx or failed requests. Screenshot is in test-results only (git-ignored).
- Follow-up (owner request): the +25 top bin held 53 of 254 counties including the whole RGV. Margin bins extended to 1, 3, 6, 10, 15, 25, 40, 60 (17 colors); MASTER_PLAN §5 table updated to match. Collin stays in +15 to +25. Arrow map and a vs-state-average view were offered and not built (new visualization/metric needing an architect decision).
- Bug found by a test: binIndex returned -0 for small negatives; fixed in code.
- Not done: nothing in Phase 5. Tooltips are only the SVG title and aria-label (out of scope).
- Mocked or stubbed: none. Race pair, state and name are fixed constants in app.ts until Phase 7.
- Uncertain: vite.config.ts now imports from vitest/config and excludes tests/e2e from vitest. Every Texas county swings toward D in this pair (midterm vs presidential); the Phase 6 turnout notice is not built yet.
- Deploy result: Actions run for 07835f0 concluded success (CI installed chromium and ran the full npm test including Playwright); live URL returns 200 and serves the built JS/CSS and TX.topo.json. (The earlier push f8ec644 was superseded and cancelled.)

## Waiting on the owner
- Download MEDSL county presidential file (Phase 12).

## Known issues
- First deploy (6545b76) failed: github-pages environment only allowed a different branch. Fixed by owner in Settings → Environments.
- Actions warnings: Node 20 action deprecation (checkout/setup-node/upload-pages-artifact run on Node 24 anyway); ubuntu-latest migrates to Ubuntu 26 from 2026-10-19. Not blocking.

## Blocked / needs architect
