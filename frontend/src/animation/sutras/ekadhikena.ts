import type { AnimationEvent, EkadhikenaLesson } from '../../api/types'
import { ContractError } from '../../api/parseLesson'
import { ekadhikenaText } from '../../content/narration'
import type { EkadhikenaFrame, EkadhikenaScene, Narration, Segment, Timeline, Tone } from '../types'

const t = (text: string | number, tone: Tone): Segment => ({ text: String(text), tone })

function numberField(event: AnimationEvent, field: string): number {
  const value = event[field]
  if (typeof value !== 'number') throw new ContractError(`Ekadhikena event "${event.action}" has no number "${field}".`)
  return value
}

export function buildEkadhikenaTimeline(lesson: EkadhikenaLesson): Extract<Timeline, { kind: 'ekadhikena' }> {
  const events = new Map(lesson.animation_steps.map((event) => [event.action, event]))
  const event = (action: string) => {
    const found = events.get(action)
    if (!found) throw new ContractError(`The Ekadhikena lesson has no "${action}" event.`)
    return found
  }

  const number = numberField(event('show_number'), 'number')
  const split = event('highlight_last_digit')
  const previous = numberField(split, 'previous')
  const lastDigit = numberField(split, 'digit')
  const next = numberField(event('show_next_number'), 'next_number')
  const product = event('multiply_previous')
  const factorA = numberField(product, 'a')
  const factorB = numberField(product, 'b')
  const leftPart = numberField(product, 'value')
  const append = event('append_25')
  const rightText = String(append.right_part ?? '')
  const result = numberField(event('reveal_result'), 'result')

  const teaching = lesson.teaching_steps
  if (teaching.length < 6) throw new ContractError('The Ekadhikena lesson has fewer than six teaching steps.')
  const step = (index: number) => ({ id: teaching[index].step, title: teaching[index].title })

  const base: EkadhikenaScene = {
    number,
    split: true,
    previous: 'normal',
    lastDigit: 'normal',
    next: 'hidden',
    link: false,
    plusOne: false,
    work: [],
    left: { kind: 'hidden' },
    right: { kind: 'hidden' },
    joined: null,
    moves: [],
  }

  const frames: EkadhikenaFrame[] = []
  const add = (index: number, key: string, narration: Narration, scene: Partial<EkadhikenaScene>) => {
    const s = step(index)
    frames.push({ id: `ekadhikena-${s.id}-${key}`, stepId: s.id, stepTitle: s.title, ...narration, scene: { ...base, ...scene } })
  }

  add(0, 'number', ekadhikenaText.intro(number, teaching[0].explanation), { split: false })
  add(1, 'split', ekadhikenaText.split(number, previous, lastDigit, teaching[1].explanation), { lastDigit: 'active' })
  add(2, 'next', ekadhikenaText.next(previous, next, teaching[2].explanation), {
    previous: 'active',
    lastDigit: 'muted',
    next: 'active',
    plusOne: true,
    work: [{ segments: [`${previous} + 1 = `, t(next, 'write')] }],
    moves: [{ id: 'next', from: 'previous', to: 'next', label: String(previous) }],
  })
  add(3, 'multiply', ekadhikenaText.multiply(factorA, factorB, leftPart, teaching[3].explanation), {
    previous: 'active',
    lastDigit: 'muted',
    next: 'active',
    link: true,
    left: { kind: 'value', value: leftPart, active: true },
    right: { kind: 'empty' },
    work: [{ segments: [`${factorA} × ${factorB} = `, t(leftPart, 'write')] }],
    moves: [{ id: 'left', from: 'work', to: 'left', label: String(leftPart) }],
  })
  add(4, 'append', ekadhikenaText.append(leftPart, rightText, teaching[4].explanation), {
    previous: 'muted',
    lastDigit: 'active',
    next: 'muted',
    left: { kind: 'value', value: leftPart, active: false },
    right: { kind: 'value', value: Number(rightText), active: true },
    work: [{ segments: [`${leftPart} | `, t(rightText, 'write')] }],
  })
  add(5, 'reveal', ekadhikenaText.reveal(number, result, teaching[5].explanation), {
    previous: 'muted',
    lastDigit: 'muted',
    next: 'muted',
    joined: result,
    work: [{ segments: [teaching[5].explanation] }],
  })

  return {
    kind: 'ekadhikena',
    key: `ekadhikena:${lesson.difficulty}:${number}`,
    problemLabel: `${number}²`,
    steps: teaching.map((s) => ({ id: s.step, title: s.title })),
    result,
    frames,
    display: { previous, lastDigit, next },
  }
}
