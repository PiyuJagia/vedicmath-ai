import { describe, expect, it } from 'vitest'
import type { NikhilamLesson, UrdhvaColumnStep, UrdhvaLesson } from '../api/types'
import { RAW, lessonFixture, type FixtureName } from '../test/fixtures'
import { buildTimeline, lastFrameBeforeStep } from './buildTimeline'
import type { NikhilamFrame, Segment, Timeline, UrdhvaFrame, WorkLine } from './types'

const text = (lines: WorkLine[]) => lines.map((line) => line.segments.map((s: Segment) => (typeof s === 'string' ? s : s.text)).join('')).join(' / ')

function nikhilam(name: FixtureName) {
  const lesson = lessonFixture(name)
  const timeline = buildTimeline(lesson) as Extract<Timeline, { kind: 'nikhilam' }>
  return { data: lesson.data as NikhilamLesson, timeline, frames: timeline.frames as NikhilamFrame[] }
}

function urdhva(name: FixtureName) {
  const lesson = lessonFixture(name)
  const timeline = buildTimeline(lesson) as Extract<Timeline, { kind: 'urdhva' }>
  return { data: lesson.data as UrdhvaLesson, timeline, frames: timeline.frames as UrdhvaFrame[] }
}

/** Frame ids look like "nikhilam-5-adjust"; match the part after the step id exactly. */
const frame = <T extends { id: string }>(frames: T[], key: string) => {
  const found = frames.find((f) => f.id.replace(/^[a-z]+-/, '') === key || f.id.replace(/^[a-z]+-\d+-/, '') === key)
  if (!found) throw new Error(`no frame ${key}`)
  return found
}

describe('every timeline', () => {
  it.each(Object.keys(RAW) as FixtureName[])('%s reveals exactly the backend result and is deterministic', (name) => {
    const lesson = lessonFixture(name)
    const first = buildTimeline(lesson)
    const again = buildTimeline(lessonFixture(name))
    const last = first.frames[first.frames.length - 1].scene

    expect('joined' in last && last.joined).toBe(lesson.data.result)
    expect(first.result).toBe(lesson.data.result)
    expect(again).toEqual(first)
  })

  it.each(Object.keys(RAW) as FixtureName[])('%s keeps frames in teaching-step order', (name) => {
    const timeline = buildTimeline(lessonFixture(name))
    const order = timeline.steps.map((step) => step.id)
    const positions = timeline.frames.map((f) => order.indexOf(f.stepId))
    expect(positions.every((p) => p >= 0)).toBe(true)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
  })
})

describe('Nikhilam (base − number)', () => {
  it('98 × 97 follows the approved sequence', () => {
    const { frames, timeline } = nikhilam('nikhilam-98x97')

    expect(timeline.display).toMatchObject({ a: 98, b: 97, base: 100, devA: 2, devB: 3 })
    expect(text(frame(frames, 'deviation-a').scene.work)).toBe('100 − 98 = +2')
    expect(text(frame(frames, 'deviation-b').scene.work)).toBe('100 − 97 = +3')
    expect(text(frame(frames, 'cross-a').scene.work)).toBe('98 − 3 = 95')
    expect(text(frame(frames, 'cross-b').scene.work)).toBe('98 − 3 = 95 / 97 − 2 = 95')
    expect(text(frame(frames, 'multiply').scene.work)).toBe('2 × 3 = 6')
    expect(text(frame(frames, 'pad').scene.work)).toBe('6  becomes  06')
    expect(text(frame(frames, 'join').scene.work)).toBe('95 | 06')
    expect(frame(frames, 'reveal').scene.joined).toBe(9506)
  })

  it('draws both diagonals as separate lines', () => {
    const { frames } = nikhilam('nikhilam-98x97')
    expect(frame(frames, 'cross-a').scene.lines).toEqual([{ id: 'cross-a', faded: false }])
    expect(frame(frames, 'cross-b').scene.lines).toEqual([
      { id: 'cross-a', faded: true },
      { id: 'cross-b', faded: false },
    ])
  })

  it('leaves the padding place empty until the pad frame', () => {
    const { frames } = nikhilam('nikhilam-98x97')
    expect(frame(frames, 'place-right').scene.right).toEqual({ kind: 'cells', cells: [null, '6'], active: [false, true] })
    expect(frame(frames, 'pad').scene.right).toEqual({ kind: 'cells', cells: ['0', '6'], active: [true, false] })
  })

  it('numbers above the base get negative deviations and bracketed subtraction', () => {
    const { frames, timeline } = nikhilam('nikhilam-103x104')
    expect(timeline.display).toMatchObject({ devA: -3, devB: -4 })
    expect(text(frame(frames, 'deviation-a').scene.work)).toBe('100 − 103 = −3')
    expect(text(frame(frames, 'cross-a').scene.work)).toBe('103 − (−4) = 107')
    expect(text(frame(frames, 'multiply').scene.work)).toBe('(−3) × (−4) = 12')
    expect(frames.some((f) => f.id.endsWith('pad'))).toBe(false)
  })

  it('shows a borrow as its own step with the amount moved', () => {
    const { frames, data } = nikhilam('nikhilam-98x103')
    const adjustStep = data.teaching_steps.find((s) => s.type === 'adjust')!
    const before = frame(frames, 'needs-adjust')
    const adjust = frame(frames, 'adjust')

    expect(before.scene.right).toEqual({ kind: 'wide', value: -6, tone: 'warn' })
    expect(adjust.stepId).toBe(adjustStep.id)
    expect(adjust.scene.token).toEqual({ value: 1 })
    expect(adjust.scene.moves).toEqual([{ id: 'adjust', from: 'left', to: 'rightFirst', label: '1' }])
    expect(text(adjust.scene.work)).toBe('101 − 1 = 100 / (−6) + 100 = 94')
  })

  it('shows a carry moving from the right part to the left part', () => {
    const { frames } = nikhilam('nikhilam-90x90')
    const adjust = frame(frames, 'adjust')
    expect(adjust.scene.moves[0]).toMatchObject({ from: 'rightFirst', to: 'left', label: '1' })
    expect(text(adjust.scene.work)).toBe('80 + 1 = 81 / 100 − 100 = 0')
    expect(text(frame(frames, 'pad').scene.work)).toBe('0  becomes  00')
  })

  it('uses three right-hand digits for base 1000', () => {
    const { frames } = nikhilam('nikhilam-998x997')
    expect(frame(frames, 'pad').scene.right).toMatchObject({ cells: ['0', '0', '6'] })
  })

  it('keeps operand roles apart when both numbers are equal', () => {
    const { frames } = nikhilam('nikhilam-98x98')
    expect(frame(frames, 'store-a').scene.moves[0]).toMatchObject({ to: 'devA' })
    expect(frame(frames, 'deviation-b').scene.moves[0]).toMatchObject({ to: 'devB' })
    expect(text(frame(frames, 'cross-b').scene.work)).toBe('98 − 2 = 96 / 98 − 2 = 96')
  })
})

describe('Urdhva Tiryagbhyam', () => {
  it('23 × 14 writes each digit in its column and moves each carry', () => {
    const { frames } = urdhva('urdhva-23x14')

    const split1 = frame(frames, '2-split')
    expect(split1.scene.written).toEqual({ 1: 2 })
    expect(split1.scene.lane).toEqual({ 2: 1 })

    const carryIn2 = frame(frames, '3-carry-in')
    expect(carryIn2.scene.laneGhost).toEqual({ 2: 1 })
    expect(carryIn2.scene.moves[0]).toMatchObject({ from: { kind: 'lane', column: 2 }, to: { kind: 'work' }, tone: 'carry' })
    expect(text(carryIn2.scene.work)).toContain('11 + 1 = 12')

    const split3 = frame(frames, '4-split')
    expect(split3.scene.written).toEqual({ 1: 2, 2: 2, 3: 3 })
    expect(split3.scene.lane).toEqual({})
    expect(frame(frames, 'reveal').scene.joined).toBe(322)
  })

  it('links exactly the digit positions the backend names', () => {
    const { frames, data } = urdhva('urdhva-23x14')
    const column2 = data.teaching_steps.find((s): s is UrdhvaColumnStep => s.id === 3)!
    expect(frame(frames, '3-multiply').scene.pairs).toEqual(
      column2.products.map((p) => ({ positionA: p.position_a, positionB: p.position_b })),
    )
  })

  it('carries values larger than 9 as one token', () => {
    const { frames } = urdhva('urdhva-99x99')
    expect(frame(frames, '3-split').scene.lane).toEqual({ 3: 17 })
    expect(frame(frames, '5-final').scene.written[4]).toBe(9)
  })

  it('handles numbers of different lengths', () => {
    const { frames } = urdhva('urdhva-87x877')
    const intro = frames[0].scene
    expect(intro.digitsA).toEqual(['8', '7'])
    expect(intro.digitsB).toEqual(['8', '7', '7'])
    expect(intro.columns).toBe(5)
  })

  it('scales to four-digit numbers with seven columns of carries', () => {
    const { frames } = urdhva('urdhva-1234x5678')
    expect(frames[0].scene.columns).toBe(7)
    expect(frames.filter((f) => f.id.endsWith('carry-in'))).toHaveLength(6)
    expect(frame(frames, 'reveal').scene.joined).toBe(7006652)
  })
})

describe('Ekadhikena Purvena', () => {
  it('35² builds the answer from backend values and explanations', () => {
    const timeline = buildTimeline(lessonFixture('ekadhikena-35')) as Extract<Timeline, { kind: 'ekadhikena' }>
    expect(timeline.display).toEqual({ previous: 3, lastDigit: 5, next: 4 })
    expect(timeline.frames.map((f) => f.stepTitle)).toEqual([
      'Identify the number',
      'Separate the last digit',
      'Add one to the preceding part',
      'Multiply the two numbers',
      'Append 25',
      'Final answer',
    ])
    expect(timeline.frames[3].coach).toBe('3 × 4 = 12.')
    expect(timeline.frames[5].scene.joined).toBe(1225)
  })

  it('handles a three-digit number', () => {
    const timeline = buildTimeline(lessonFixture('ekadhikena-115')) as Extract<Timeline, { kind: 'ekadhikena' }>
    expect(timeline.display).toEqual({ previous: 11, lastDigit: 5, next: 12 })
    expect(timeline.frames[5].scene.joined).toBe(13225)
  })
})

describe('lastFrameBeforeStep', () => {
  it('stops before the requested step', () => {
    const timeline = buildTimeline(lessonFixture('nikhilam-98x97'))
    const index = lastFrameBeforeStep(timeline, 3)
    expect(timeline.frames[index].stepId).toBe(2)
    expect(timeline.frames[index + 1].stepId).toBe(3)
  })
})
