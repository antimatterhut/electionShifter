// Number formatting for the UI. Pure; negatives use U+2212 (−), never a hyphen.
import type { MetricId } from './types.ts';

const MINUS = '−';

function body(n: number, decimals: number): { text: string; zero: boolean } {
  const text = Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return { text, zero: Number(Math.abs(n).toFixed(decimals)) === 0 };
}

/** "+23.18", "−11.60", "0.00". */
export function signed(n: number, decimals = 0): string {
  const { text, zero } = body(n, decimals);
  if (zero) return text;
  return (n < 0 ? MINUS : '+') + text;
}

/** "112,726" or "−60,049" (sign only when negative). */
export function plainSigned(n: number, decimals = 0): string {
  const { text, zero } = body(n, decimals);
  return !zero && n < 0 ? MINUS + text : text;
}

export const fmtPts = (n: number): string => `${signed(n, 2)} pts`;
export const fmtPct = (n: number): string => `${signed(n, 2)}%`;
export const fmtVotes = (n: number): string => signed(n, 0);
export const fmtCount = (n: number): string => plainSigned(n, 0);

/** Title-case an ALL-CAPS source name for display. Display only; identity is the candidate_id. */
export function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/(^|[\s\-'.])([a-z])/g, (_m, p: string, c: string) => p + c.toUpperCase());
}

/** Value text for a metric, with units. */
export function fmtMetric(metric: MetricId, v: number): string {
  switch (metric) {
    case 'margin':
    case 'margin_swing':
      return fmtPts(v);
    case 'candidate_change_pct':
    case 'turnout_change_pct':
      return fmtPct(v);
    default:
      return `${signed(v, 0)} votes`;
  }
}
