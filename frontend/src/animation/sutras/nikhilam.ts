import type {
  NikhilamAdjustStep,
  NikhilamBaseStep,
  NikhilamCombineStep,
  NikhilamCrossStep,
  NikhilamDeviationsStep,
  NikhilamLesson,
  NikhilamMultiplyStep,
  NikhilamStep,
} from '../../api/types'
import { nikhilamText, type NikhilamValues } from '../../content/narration'
import { ContractError } from '../../api/parseLesson'
import { fmt, paren, signed } from '../format'
import type { Narration, NikhilamFrame, NikhilamScene, Segment, Timeline, Tone } from '../types'

function find<T extends NikhilamStep['type']>(steps: NikhilamStep[], type: T) {
  return steps.find((step) => step.type === type) as Extract<NikhilamStep, { type: T }> | undefined
}

function required<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new ContractError(`The Nikhilam lesson has no ${what} step.`)
  return value
}

const t = (text: string | number, tone: Tone): Segment => ({ text: fmt(text), tone })

const EMPTY_SCENE: NikhilamScene = {
  base: 'hidden',
  numberLine: false,
  a: 'normal',
  b: 'normal',
  devA: 'hidden',
  devB: 'hidden',
  work: [],
  left: { kind: 'hidden' },
  right: { kind: 'hidden' },
  joined: null,
  lines: [],
  moves: [],
  token: null,
}

export function buildNikhilamTimeline(lesson: NikhilamLesson): Extract<Timeline, { kind: 'nikhilam' }> {
  const steps = lesson.teaching_steps
  const baseStep = required<NikhilamBaseStep>(find(steps, 'base'), 'base')
  const deviations = required<NikhilamDeviationsStep>(find(steps, 'deviations'), 'deviations')
  const cross = required<NikhilamCrossStep>(find(steps, 'cross_subtract'), 'cross-subtract')
  const multiply = required<NikhilamMultiplyStep>(find(steps, 'multiply_deviations'), 'multiply')
  const combine = required<NikhilamCombineStep>(find(steps, 'combine'), 'combine')
  const adjust = find(steps, 'adjust') as NikhilamAdjustStep | undefined

  const byOperand = <T extends { operand: string }>(list: T[], operand: string) => {
    const item = list.find((entry) => entry.operand === operand)
    if (!item) throw new ContractError(`The Nikhilam lesson has no value for ${operand}.`)
    return item
  }

  const [a, b] = baseStep.numbers
  const calcA = byOperand(deviations.calculations, 'number_a')
  const calcB = byOperand(deviations.calculations, 'number_b')
  const crossA = byOperand(cross.cross_calculations, 'number_a')
  const crossB = byOperand(cross.cross_calculations, 'number_b')

  const v: NikhilamValues = {
    a,
    b,
    base: baseStep.base,
    rightDigits: baseStep.right_digits,
    devA: calcA.deviation,
    devB: calcB.deviation,
    crossA: { number: crossA.number, deviation: crossA.deviation, value: crossA.value },
    crossB: { number: crossB.number, deviation: crossB.deviation, value: crossB.value },
    left: cross.left_part,
    right: multiply.right_part,
  }

  const sA = signed(v.devA)
  const sB = signed(v.devB)
  const crossTextA = `${crossA.number} − ${paren(crossA.deviation)} = `
  const crossTextB = `${crossB.number} − ${paren(crossB.deviation)} = `
  const productText = `${paren(v.devA)} × ${paren(v.devB)} = `

  const digits = combine.formatted_right.split('')
  const padCount = combine.padding_zeros
  const emptyCells = digits.map(() => null)
  const allFalse = digits.map(() => false)
  const allTrue = digits.map(() => true)

  const frames: NikhilamFrame[] = []
  const add = (step: { id: number; title: string }, key: string, narration: Narration, scene: Partial<NikhilamScene>) => {
    frames.push({
      id: `nikhilam-${step.id}-${key}`,
      stepId: step.id,
      stepTitle: step.title,
      ...narration,
      scene: { ...EMPTY_SCENE, ...scene },
    })
  }

  // Step: choose a base
  add(baseStep, 'numbers', nikhilamText.intro(v), {})
  add(baseStep, 'base', nikhilamText.base(v), { base: 'active', numberLine: true })

  // Step: deviations (base − number)
  add(deviations, 'deviation-a', nikhilamText.deviationA(v), {
    base: 'active',
    a: 'active',
    b: 'muted',
    devA: 'empty',
    devB: 'empty',
    work: [{ segments: [`${v.base} − ${a} = `, t(sA, 'dev')] }],
  })
  add(deviations, 'store-a', nikhilamText.storeA(v), {
    base: 'normal',
    a: 'active',
    b: 'muted',
    devA: 'active',
    devB: 'empty',
    work: [{ segments: [`${v.base} − ${a} = `, t(sA, 'ghost')] }],
    moves: [{ id: 'dev-a', from: 'work', to: 'devA', label: sA }],
  })
  add(deviations, 'deviation-b', nikhilamText.deviationB(v), {
    base: 'active',
    a: 'muted',
    b: 'active',
    devA: 'normal',
    devB: 'active',
    work: [{ segments: [`${v.base} − ${b} = `, t(sB, 'ghost')] }],
    moves: [{ id: 'dev-b', from: 'work', to: 'devB', label: sB }],
  })

  // Step: cross-subtract (both diagonals)
  const resultSlots = { left: { kind: 'empty' } as const, right: { kind: 'cells', cells: emptyCells, active: allFalse } as const }
  add(cross, 'cross-a', nikhilamText.crossA(v), {
    base: 'normal',
    a: 'active',
    b: 'muted',
    devA: 'muted',
    devB: 'active',
    ...resultSlots,
    work: [{ segments: [crossTextA, t(crossA.value, 'write')] }],
    lines: [{ id: 'cross-a', faded: false }],
  })
  add(cross, 'cross-b', nikhilamText.crossB(v), {
    base: 'normal',
    a: 'muted',
    b: 'active',
    devA: 'active',
    devB: 'muted',
    ...resultSlots,
    work: [
      { segments: [`${crossTextA}${crossA.value}`], faded: true },
      { segments: [crossTextB, t(crossB.value, 'write')] },
    ],
    lines: [
      { id: 'cross-a', faded: true },
      { id: 'cross-b', faded: false },
    ],
  })
  add(cross, 'left', nikhilamText.left(v), {
    base: 'normal',
    devA: 'normal',
    devB: 'normal',
    left: { kind: 'value', value: v.left, active: true },
    right: { kind: 'cells', cells: emptyCells, active: allFalse },
    work: [
      { segments: [crossTextA, t(crossA.value, 'write')] },
      { segments: [crossTextB, t(crossB.value, 'write')] },
    ],
    moves: [{ id: 'left', from: 'work', to: 'left', label: String(v.left) }],
  })

  // Step: multiply deviations
  add(multiply, 'multiply', nikhilamText.multiply(v), {
    base: 'normal',
    a: 'muted',
    b: 'muted',
    devA: 'active',
    devB: 'active',
    left: { kind: 'value', value: v.left, active: false },
    right: { kind: 'cells', cells: emptyCells, active: allFalse },
    work: [{ segments: [productText, t(v.right, 'write')] }],
    lines: [{ id: 'multiply', faded: false }],
  })

  if (adjust) {
    const borrowing = adjust.adjustment === 'borrow'
    add(multiply, 'needs-adjust', nikhilamText.needsAdjust(v, borrowing), {
      base: 'normal',
      devA: 'normal',
      devB: 'normal',
      left: { kind: 'value', value: adjust.left_before, active: false },
      right: { kind: 'wide', value: adjust.right_before, tone: 'warn' },
      work: [{ segments: [`${adjust.left_before} | `, t(adjust.right_before, 'carry')] }],
      moves: [{ id: 'right-raw', from: 'work', to: 'rightLast', label: fmt(v.right) }],
    })

    const leftSign = borrowing ? ' − ' : ' + '
    const rightChange = adjust.right_change < 0 ? ` − ${String(adjust.right_change).slice(1)}` : ` + ${adjust.right_change}`
    add(adjust, 'adjust', nikhilamText.adjust(v, {
      borrowing,
      amount: adjust.amount,
      leftBefore: adjust.left_before,
      leftAfter: adjust.left_after,
      rightBefore: adjust.right_before,
      rightAfter: adjust.right_after,
      rightChange: adjust.right_change,
    }), {
      base: 'active',
      devA: 'normal',
      devB: 'normal',
      left: { kind: 'value', value: adjust.left_after, active: true },
      right: { kind: 'wide', value: adjust.right_after, tone: 'active' },
      work: [
        { segments: [`${adjust.left_before}${leftSign}`, t(adjust.amount, 'carry'), ' = ', t(adjust.left_after, 'write')] },
        { segments: [`${paren(adjust.right_before)}${rightChange} = `, t(adjust.right_after, 'write')] },
      ],
      moves: [
        borrowing
          ? { id: 'adjust', from: 'left', to: 'rightFirst', label: String(adjust.amount) }
          : { id: 'adjust', from: 'rightFirst', to: 'left', label: String(adjust.amount) },
      ],
      token: { value: adjust.amount },
    })
  } else {
    const cellsBefore = digits.map((digit, index) => (index < padCount ? null : digit))
    const activeBefore = digits.map((_, index) => index >= padCount)
    add(multiply, 'place-right', nikhilamText.placeRight(v, padCount), {
      base: 'active',
      devA: 'normal',
      devB: 'normal',
      left: { kind: 'value', value: v.left, active: false },
      right: { kind: 'cells', cells: cellsBefore, active: activeBefore },
      work: [{ segments: [productText, t(v.right, 'ghost')] }],
      moves: [{ id: 'right', from: 'work', to: 'rightLast', label: String(v.right) }],
    })
  }

  // Step: combine (padding, join, reveal)
  if (padCount > 0) {
    add(combine, 'pad', nikhilamText.pad(v, combine.right_part, combine.formatted_right, padCount), {
      base: 'normal',
      devA: 'normal',
      devB: 'normal',
      left: { kind: 'value', value: combine.left_part, active: false },
      right: { kind: 'cells', cells: digits, active: digits.map((_, index) => index < padCount) },
      work: [{ segments: [`${combine.right_part}  becomes  `, t(combine.formatted_right, 'write')] }],
    })
  }
  add(combine, 'join', nikhilamText.join(combine.left_part, combine.formatted_right), {
    base: 'normal',
    a: 'muted',
    b: 'muted',
    devA: 'muted',
    devB: 'muted',
    left: { kind: 'value', value: combine.left_part, active: true },
    right: { kind: 'cells', cells: digits, active: allTrue },
    work: [{ segments: [`${combine.left_part} | ${combine.formatted_right}`] }],
  })
  add(combine, 'reveal', nikhilamText.reveal(v, lesson.result), {
    base: 'normal',
    devA: 'normal',
    devB: 'normal',
    joined: lesson.result,
    work: [{ segments: [`${a} × ${b} = `, t(lesson.result, 'write')] }],
  })

  return {
    kind: 'nikhilam',
    key: `nikhilam:${lesson.difficulty}:${a}x${b}`,
    problemLabel: `${a} × ${b}`,
    steps: steps.map((step) => ({ id: step.id, title: step.title })),
    result: lesson.result,
    frames,
    display: { a, b, base: v.base, devA: v.devA, devB: v.devB },
  }
}
