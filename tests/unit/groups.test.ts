import { describe, expect, it } from 'vitest';
import { aggregateUnits } from '../../src/domain/aggregate.ts';
import { marginSwing, rawShift, turnoutChange } from '../../src/domain/metrics.ts';
import type { ViewSpec } from '../../src/domain/view.ts';
import { disclosure, summarizeGroup } from '../../src/ui/groups.ts';
import { COLLIN, DENTON, makeRace, raceA, raceB } from './helpers.ts';

const spec = (metric: ViewSpec['metric']): ViewSpec => ({ metric, basis: 'total', which: 'B', candA: null, candB: null });

describe('summarizeGroup', () => {
  it('Collin + Denton: +22.43, +205,151, −11.69%', () => {
    const s = summarizeGroup(spec('margin_swing'), raceA, raceB, [COLLIN, DENTON]);
    expect(s.current.value!.toFixed(2)).toBe('22.43');
    expect(s.rawShift.value).toBe(205151);
    expect(s.turnoutPct.value!.toFixed(2)).toBe('-11.69');
    expect(disclosure(s)).toBeNull();
  });

  it('matches aggregateUnits then the metric functions', () => {
    const ids = [COLLIN, DENTON];
    const ga = aggregateUnits(raceA, ids).totals;
    const gb = aggregateUnits(raceB, ids).totals;
    const s = summarizeGroup(spec('raw_shift'), raceA, raceB, ids);
    expect(s.swing).toEqual(marginSwing(ga, gb));
    expect(s.current).toEqual(rawShift(ga, gb));
    expect(s.turnoutPct).toEqual(turnoutChange(ga, gb).pct);
  });

  it('discloses a unit missing in one race and leaves it out of the sums', () => {
    const b = makeRace('b', [
      { id: COLLIN, d: 252403, r: 197096, t: 457641 },
      { id: DENTON, d: null, r: null, t: null },
    ]);
    const s = summarizeGroup(spec('margin_swing'), raceA, b, [COLLIN, DENTON]);
    expect(s.used).toEqual([COLLIN]);
    expect(s.missing).toEqual([DENTON]);
    expect(disclosure(s)).toBe('1 of 2 counties have data in both races.');
    expect(s.a!.t).toBe(517690); // Denton's race-A votes are not counted either
  });

  it('a unit absent from a race file counts as missing; all missing gives n/a', () => {
    const s = summarizeGroup(spec('margin_swing'), raceA, raceB, ['48999']);
    expect(s.current.value).toBeNull();
    expect(disclosure(s)).toBe('0 of 1 county has data in both races.');
  });
});
