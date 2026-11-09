import type { Basis, MetricResult, ReasonCode, Totals } from './types.ts';

const ok = (value: number): MetricResult => ({ value, reason: null });
const fail = (reason: ReasonCode): MetricResult => ({ value: null, reason });

/** Denominator for the chosen basis. */
function denom(t: Totals, basis: Basis): number {
  return basis === 'two_party' ? t.d + t.r : t.t;
}

function hasContest(t: Totals): boolean {
  return t.hasD && t.hasR;
}

/** Raw margin D − R (votes). Positive = Democratic lead. */
export function rawMargin(t: Totals | null): MetricResult {
  if (t === null) return fail('missing_unit');
  if (!hasContest(t)) return fail('no_dr_contest');
  return ok(t.d - t.r);
}

/** Margin in percentage points: (D − R) / T, or / (D + R) on the two-party basis. */
export function margin(t: Totals | null, basis: Basis = 'total'): MetricResult {
  if (t === null) return fail('missing_unit');
  if (!hasContest(t)) return fail('no_dr_contest');
  const den = denom(t, basis);
  if (!(den > 0)) return fail('missing_total');
  return ok(((t.d - t.r) / den) * 100);
}

/** margin_B − margin_A in points. */
export function marginSwing(a: Totals | null, b: Totals | null, basis: Basis = 'total'): MetricResult {
  const ma = margin(a, basis);
  if (ma.value === null) return ma;
  const mb = margin(b, basis);
  if (mb.value === null) return mb;
  return ok(mb.value - ma.value);
}

/** rawMargin_B − rawMargin_A in votes. */
export function rawShift(a: Totals | null, b: Totals | null): MetricResult {
  const ra = rawMargin(a);
  if (ra.value === null) return ra;
  const rb = rawMargin(b);
  if (rb.value === null) return rb;
  return ok(rb.value - ra.value);
}

/** V_B − V_A for one candidate (or a mapped pair). Inputs are summed votes. */
export function candidateChange(
  vA: number | null,
  vB: number | null,
): { raw: MetricResult; pct: MetricResult } {
  if (vA === null || vB === null) return { raw: fail('missing_unit'), pct: fail('missing_unit') };
  const raw = ok(vB - vA);
  const pct = vA === 0 ? fail('zero_baseline') : ok(((vB - vA) / vA) * 100);
  return { raw, pct };
}

/** T_B − T_A, raw and percent of T_A. Percent is unavailable when T_A is 0. */
export function turnoutChange(
  a: Totals | null,
  b: Totals | null,
): { raw: MetricResult; pct: MetricResult } {
  if (a === null || b === null) return { raw: fail('missing_unit'), pct: fail('missing_unit') };
  if (!(a.t > 0) || !(b.t > 0)) return { raw: fail('missing_total'), pct: fail('missing_total') };
  return { raw: ok(b.t - a.t), pct: ok(((b.t - a.t) / a.t) * 100) };
}

/**
 * Splits raw margin shift into a margin-change part, (m_B − m_A) × T_A, and a
 * turnout part, m_B × (T_B − T_A). On the two-party basis T = D + R.
 *
 * The margin part is rounded to a whole vote and the turnout part is the
 * remainder of raw shift, so both are integers that sum exactly to rawShift.
 */
export function decomposeShift(
  a: Totals | null,
  b: Totals | null,
  basis: Basis = 'total',
): { margin: MetricResult; turnout: MetricResult } {
  const shift = rawShift(a, b);
  if (shift.value === null) return { margin: shift, turnout: shift };
  const ma = margin(a, basis);
  if (ma.value === null) return { margin: ma, turnout: ma };
  const mb = margin(b, basis);
  if (mb.value === null) return { margin: mb, turnout: mb };
  const marginPart = Math.round(((mb.value - ma.value) / 100) * denom(a!, basis));
  return { margin: ok(marginPart), turnout: ok(shift.value - marginPart) };
}
