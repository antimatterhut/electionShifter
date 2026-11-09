# Kickoff prompts

Each prompt ends with the same required closing instruction.

## Phase 1
Execute Phase 1 (Repository and deploy) per the MASTER_PLAN.md section of plan.md. Split plan.md into its files first, then rename the local branch to main and add the remote. Done means: `npm test` passes; the latest Actions run on main succeeds; https://antimatterhut.github.io/electionShifter/ returns 200 with the placeholder and correct asset paths; all planning files are committed. Ask me to set Pages source to GitHub Actions when needed. Do no data work. Run the full test suite, commit and push to main, confirm the deploy succeeded, and update PROGRESS.md before finishing.

## Phase 2
Execute Phase 2 (Metrics library) per MASTER_PLAN.md. Done means: every §4 metric and edge case is a tested pure function, and Collin + Denton gives +22.43, not 22.37. Run the full test suite, commit and push to main, confirm the deploy succeeded, and update PROGRESS.md before finishing.

## Phase 3
Execute Phase 3 (Texas geometry and unit registry) per MASTER_PLAN.md. Done means: Census raw snapshot has verified hashes; units.csv covers all states; TX has 254 units matching its topology; CT has 9 planning regions; builds are byte-identical. Run the full test suite, commit and push to main, confirm the deploy succeeded, and update PROGRESS.md before finishing.

## Phase 4
Execute Phase 4 (Texas data pipeline) per MASTER_PLAN.md. Done means: both races have 254 units with no nulls; golden values match; Tier 1 and Tier 2 pass; `verify` is part of npm test. If Tier 2 can't be satisfied, stop and record it. Run the full test suite, commit and push to main, confirm the deploy succeeded, and update PROGRESS.md before finishing.

## Phase 5
Execute Phase 5 (First live map) per MASTER_PLAN.md. Done means: the live site shows Texas 2026 Senate vs 2024 President margin swing with 254 counties, legend, source line, and UNOFFICIAL label, and Playwright runs in npm test. Run the full test suite, commit and push to main, confirm the deploy succeeded, and update PROGRESS.md before finishing.

## Phase 6
Execute Phase 6 (All metrics and explanation) per MASTER_PLAN.md. Done means: all metrics are selectable; the Collin tooltip shows +23.18, +112,726, +30,288, +13.64%, and −11.60%; the turnout notice appears; keyboard tooltip works. Run the full test suite, commit and push to main, confirm the deploy succeeded, and update PROGRESS.md before finishing.

## Phase 7
Execute Phase 7 (All Texas statewide races and race picker) per MASTER_PLAN.md. Done means: any two Texas statewide races are comparable, including Railroad Commissioner vs Senate by margin and raw votes; no candidate names exist in src. Run the full test suite, commit and push to main, confirm the deploy succeeded, and update PROGRESS.md before finishing.

## Phase 8
Execute Phase 8 (County groups) per MASTER_PLAN.md. Done means: selecting Collin + Denton shows +22.43, +205,151, and −11.69%; missing units are disclosed. Run the full test suite, commit and push to main, confirm the deploy succeeded, and update PROGRESS.md before finishing.

## Phase 9
Execute Phase 9 (Shareable URLs) per MASTER_PLAN.md. Done means: a copied live-site link restores races, metric, basis, candidates and group in a new context; invalid params do not crash. Run the full test suite, commit and push to main, confirm the deploy succeeded, and update PROGRESS.md before finishing.

## Phase 10
Execute Phase 10 (PNG export) per MASTER_PLAN.md. Done means: downloaded PNG has correct dimensions and includes title, map, legend, races, source and status, proven by automated tests. Run the full test suite, commit and push to main, confirm the deploy succeeded, and update PROGRESS.md before finishing.

## Phase 11
Execute Phase 11 (2026 full-county states) per MASTER_PLAN.md. Done means: listed states are ingested with no unmatched labels; all pass Tier 1 or are marked partial; Virginia has 133 units; the coverage matrix is accurate. Run the full test suite, commit and push to main, confirm the deploy succeeded, and update PROGRESS.md before finishing.

## Phase 12
Execute Phase 12 (2024 President and Senate everywhere) per MASTER_PLAN.md. First confirm the MEDSL files are in data/inbox/, and ask me if not. Done means: 2024 President and Senate are available wherever geography is valid; Tier 2 passes; no counties are dropped by mode handling; a cross-check report exists. Run the full test suite, commit and push to main, confirm the deploy succeeded, and update PROGRESS.md before finishing.

## Phase 13
Execute Phase 13 (2024 Governor and other statewide offices) per MASTER_PLAN.md. Confirm the licensing decision in §9 item 6 first. Done means: statewide offices are aggregated to county; suppressed values remain null; the coverage matrix lists all gaps. Run the full test suite, commit and push to main, confirm the deploy succeeded, and update PROGRESS.md before finishing.

## Phase 14
Execute Phase 14 (Connecticut and New England rollups) per MASTER_PLAN.md. Done means: 169 CT towns map to 9 regions; fusion votes combine; CT Governor 2026 vs President 2024 renders; other town rollups are done where data exists. Run the full test suite, commit and push to main, confirm the deploy succeeded, and update PROGRESS.md before finishing.

## Phase 15
Execute Phase 15 (Alaska) per MASTER_PLAN.md. Verify the same House plan applies to 2024 and 2026, and stop if not. Done means: 40 units; no blank-row double counting; Alaska 2026 Governor and Senate render with a first-round note. Run the full test suite, commit and push to main, confirm the deploy succeeded, and update PROGRESS.md before finishing.

## Phase 16
Execute Phase 16 (2026 gap states, group 1) per MASTER_PLAN.md for AL, CA, DE, NE, NM, SD, VT, KS, MI, NJ, WI. Done means: each state is ok with validation, or pending with a written reason; nothing is sourced from media as official. Run the full test suite, commit and push to main, confirm the deploy succeeded, and update PROGRESS.md before finishing.

## Phase 17
Execute Phase 17 (2026 gap states, group 2) per MASTER_PLAN.md for IL, MA, NV, NY, WY, HI, KY, ME, MS, MT, ND, NH, OR, TN, WV, DC. Done means: each is ok with validation, or pending with a written reason; nothing is sourced from media as official. Run the full test suite, commit and push to main, confirm the deploy succeeded, and update PROGRESS.md before finishing.

## Phase 18
Execute Phase 18 (National view) per MASTER_PLAN.md. Done means: President and Mosaic modes are live and shareable; Mosaic is labeled and has no national aggregate; render time is under 3 seconds in the test. Run the full test suite, commit and push to main, confirm the deploy succeeded, and update PROGRESS.md before finishing.

## Phase 19
Execute Phase 19 (Refresh and certification workflow) per MASTER_PLAN.md. Done means: refresh adds a new snapshot and diff report; certifying without Tier 2 fails; docs/REFRESH.md is enough to certify Texas. Run the full test suite, commit and push to main, confirm the deploy succeeded, and update PROGRESS.md before finishing.

## Phase 20
Execute Phase 20 (v1 audit) per MASTER_PLAN.md. Done means: docs/V1_AUDIT.md gives evidence for every Definition of Done item and states plainly anything unmet. Run the full test suite, commit and push to main, confirm the deploy succeeded, and update PROGRESS.md before finishing.
