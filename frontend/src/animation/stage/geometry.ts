export interface Point {
  x: number
  y: number
}

/** Baseline of a line in a working panel. */
export function workLineY(panelY: number, index: number, gap = 28) {
  return panelY + 50 + index * gap
}
