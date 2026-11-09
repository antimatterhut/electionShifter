# Definition of done for v1

Check these on https://antimatterhut.github.io/electionShifter/ in a fresh browser window.

## Comparisons
- [ ] Any two statewide races from 2024/2026 in any state with available data can be compared.
- [ ] Margin swing, raw margin shift, and candidate vote change (raw and %) maps all work.
- [ ] Texas 2026 Senate vs 2024 President shows every county.
- [ ] Harris (2024) vs Talarico (2026) shows raw and % change per county.
- [ ] Governor 2026 vs Senate 2026 works as a ticket-splitting view.
- [ ] Bo French vs Ken Paxton works by margin and raw votes.
- [ ] Margin can be switched between total-vote and two-party.
- [ ] A turnout view exists, and a midterm vs presidential map explains the turnout effect.

## Coverage
- [ ] Every state and DC appears, and any missing race says why. None silently fails.
- [ ] Connecticut uses planning regions, Virginia shows independent cities, Alaska shows House districts.
- [ ] National view shows President, and a clearly labeled midterm mosaic.

## Accuracy
- [ ] GitHub Actions passing proves county sums match statewide totals within the documented tolerances.
- [ ] Certified races pass against an independent official total.
- [ ] Any race still unofficial is listed, and shows `pending` for independent validation.

## Groups
- [ ] Select Collin + Denton. Combined result is computed from summed votes (test-proven).
- [ ] A group with missing data says how many units are included.

## Sharing
- [ ] Copy link gives a `https://antimatterhut.github.io/electionShifter/` URL.
- [ ] That link in a private window restores races, metric, and group.
- [ ] PNG includes title, legend, races compared, data source and status.

## Honesty and readability
- [ ] Unofficial data is clearly labeled in the app and in PNGs.
- [ ] Each map says in plain English what the colors mean.
- [ ] Missing data looks different from a zero change.

## Engineering
- [ ] All code is committed and pushed to `main`.
- [ ] `npm test` passes in GitHub Actions on the latest commit, and that commit is deployed.
- [ ] README explains setup, run, test, deploy and data refresh.
- [ ] PROGRESS.md shows all phases complete, or names anything unmet.
