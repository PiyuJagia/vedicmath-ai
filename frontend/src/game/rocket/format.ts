/** Show a number the way children read it, with a real minus sign. */
export function showNumber(text: string | undefined): string | undefined {
  return text === undefined ? undefined : text.replace(/^-/, '\u2212')
}
