/** Display helpers only; they format values and never calculate them. */

const MINUS = '\u2212'

/** Show a proper minus sign instead of a hyphen. */
export function fmt(value: number | string): string {
  return String(value).replace('-', MINUS)
}

/** Deviations carry an explicit sign, for example +2 or −3. */
export function signed(value: number): string {
  return value > 0 ? `+${value}` : fmt(value)
}

/** Negative values are bracketed when subtracted or multiplied: 103 − (−4). */
export function paren(value: number): string {
  return value < 0 ? `(${fmt(value)})` : String(value)
}

/** Absolute value as text, used to describe how much is moved in a borrow or carry. */
export function magnitude(value: number): string {
  return String(value).replace('-', '')
}
