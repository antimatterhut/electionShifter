import { describe, expect, it } from 'vitest';
import { LIVE_URL, parseUrlState, serializeUrlState, shareUrl, type UrlKnown, type UrlState } from '../../src/domain/urlState.ts';
import { METRIC_IDS } from '../../src/domain/view.ts';

const known: UrlKnown = {
  races: ['r-a', 'r-b', 'r-c'],
  units: ['48001', '48003', '48085', '48121'],
  states: ['TX'],
  defaults: { a: 'r-a', b: 'r-b', state: 'TX' },
};

const base: UrlState = {
  a: 'r-a', b: 'r-c', metric: 'margin_swing', basis: 'total', which: 'B', state: 'TX',
  candA: null, candB: null, group: [], groupName: '', mode: null,
};

describe('urlState', () => {
  it('round-trips every metric, basis and which', () => {
    for (const metric of METRIC_IDS) {
      for (const basis of ['total', 'two_party'] as const) {
        for (const which of ['A', 'B'] as const) {
          const s: UrlState = { ...base, metric, basis, which, candA: 'c1', candB: 'c 2&x', group: ['48085', '48121'], groupName: 'North, "Metro" & more', mode: 'president' };
          const { state, notices } = parseUrlState('?' + serializeUrlState(s), known);
          expect(notices).toEqual([]);
          expect(state).toEqual(s);
        }
      }
    }
  });

  it('empty query gives defaults and no notice', () => {
    const { state, notices } = parseUrlState('', known);
    expect(notices).toEqual([]);
    expect(state.a).toBe('r-a');
    expect(state.b).toBe('r-b');
    expect(state.metric).toBe('margin_swing');
  });

  it('invalid values fall back with a notice and never throw', () => {
    const q = 'v=9&a=nope&b=r-c&metric=bogus&basis=x&which=Z&state=ZZ&mode=weird&g=48085,99999,48085,&ca=';
    const { state, notices } = parseUrlState(q, known);
    expect(state.a).toBe('r-a');
    expect(state.b).toBe('r-c');
    expect(state.metric).toBe('margin_swing');
    expect(state.basis).toBe('total');
    expect(state.which).toBe('B');
    expect(state.state).toBe('TX');
    expect(state.mode).toBeNull();
    expect(state.group).toEqual(['48085']);
    expect(state.candA).toBeNull();
    expect(notices.length).toBeGreaterThanOrEqual(8);
  });

  it('survives garbage', () => {
    for (const q of ['%', '?%E0%A4%A', '&&&=', 'g=,,,', 'metric=' + 'x'.repeat(5000), 'gname=' + 'y'.repeat(500)]) {
      expect(() => parseUrlState(q, known)).not.toThrow();
    }
    expect(parseUrlState('gname=' + 'y'.repeat(500), known).state.groupName.length).toBe(60);
  });

  it('share link always uses the live site', () => {
    expect(shareUrl(base).startsWith(LIVE_URL + '?v=1&')).toBe(true);
    expect(shareUrl(base)).not.toContain('localhost');
  });
});
