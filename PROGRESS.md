# Progress

Last updated: 2026-11-09 by Phase 1 session

## Phase checklist
Legend: [ ] todo, [~] in progress, [x] done

- [x] 1. Repository and deploy
- [ ] 2. Metrics library
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
Start Phase 2 (Metrics library) in a new session using KICKOFF_PROMPTS.md.

## Last session summary
- Done: Phase 1. Planning files split from plan.md; branch renamed to main; remote added; Vite/TS/Vitest scaffold; placeholder page; deploy workflow; Pages live.
- Not done: nothing in Phase 1.
- Mocked or stubbed: placeholder page only ("Coming soon").
- Uncertain: .nvmrc "26" resolved fine in setup-node (run succeeded).
- Last commit: dc3e92a (code); PROGRESS.md update follows.
- Deploy result: Actions run for dc3e92a concluded success; live URL returns 200, JS asset at /electionShifter/assets/ contains "Coming soon".

## Waiting on the owner
- Download MEDSL county presidential file (Phase 12).

## Known issues
- First deploy (6545b76) failed: github-pages environment only allowed a different branch. Fixed by owner in Settings → Environments.
- Actions warnings: Node 20 action deprecation (checkout/setup-node/upload-pages-artifact run on Node 24 anyway); ubuntu-latest migrates to Ubuntu 26 from 2026-10-19. Not blocking.

## Blocked / needs architect
