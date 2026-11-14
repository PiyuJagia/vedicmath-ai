import { act, render, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { Providers } from '../app/Providers'
import { EMPTY_PROGRESS } from '../services/progressModel'
import { useProgress } from '../services/ProgressContext'
import { lessonFixture, type FixtureName } from '../test/fixtures'
import { buildTimeline } from './buildTimeline'
import { NikhilamStage } from './stage/NikhilamStage'
import { UrdhvaStage } from './stage/UrdhvaStage'
import type { Timeline } from './types'

/** Expected values worked out here, independently of the app's code. */
function expectedNikhilam(a: number, b: number) {
  const base = Math.max(a, b) >= 9990 ? 10000 : Math.max(a, b) >= 990 ? 1000 : 100
  const devA = base - a
  const devB = base - b
  return { base, devA, devB, left: a - devB, right: devA * devB, product: a * b }
}

const signed = (n: number) => (n > 0 ? `+${n}` : String(n).replace('-', '\u2212'))
const dash = (text: string | null) => (text ?? '').replace(/\u2212/g, '-')

function stageValues(container: HTMLElement) {
  const value = (role: string, id: string) =>
    container.querySelector(`[data-role="${role}"][data-id="${id}"]`)?.getAttribute('data-value') ?? null
  return {
    value,
    work: Array.from(container.querySelectorAll('[data-role="work-line"]')).map((line) => dash(line.textContent)),
    answer: container.querySelector('[data-role="answer"]')?.getAttribute('data-value') ?? null,
    base: container.querySelector('[data-role="base"]')?.getAttribute('data-value') ?? null,
    token: container.querySelector('[data-role="carry"]')?.getAttribute('data-value') ?? null,
    lines: Array.from(container.querySelectorAll('[data-role="math-line"]')).map((line) => line.getAttribute('data-id')),
  }
}

const NIKHILAM: FixtureName[] = [
  'nikhilam-98x97',
  'nikhilam-98x103',
  'nikhilam-90x90',
  'nikhilam-103x104',
  'nikhilam-98x98',
  'nikhilam-998x997',
]

describe('every Nikhilam frame shows the right numbers', () => {
  it.each(NIKHILAM)('%s', (name) => {
    const timeline = buildTimeline(lessonFixture(name)) as Extract<Timeline, { kind: 'nikhilam' }>
    const { a, b } = timeline.display
    const expected = expectedNikhilam(a, b)

    timeline.frames.forEach((frame) => {
      const { container, unmount } = render(
        <Providers settings={{ reduceMotion: 'on' }}>
          <NikhilamStage frame={frame} numbers={timeline.display} reducedMotion moveDuration={0} />
        </Providers>,
      )
      const shown = stageValues(container)
      const where = `${name} ${frame.id}`

      expect(shown.value('tile', 'number_a'), where).toBe(String(a))
      expect(shown.value('tile', 'number_b'), where).toBe(String(b))
      if (shown.base !== null) expect(shown.base, where).toBe(String(expected.base))
      const chipA = shown.value('chip', 'deviation_a')
      const chipB = shown.value('chip', 'deviation_b')
      if (chipA) expect(chipA, where).toBe(signed(expected.devA))
      if (chipB) expect(chipB, where).toBe(signed(expected.devB))

      if (frame.id.endsWith('-deviation-a')) expect(shown.work[0]).toBe(`${expected.base} - ${a} = ${dash(signed(expected.devA))}`)
      if (frame.id.endsWith('-cross-a')) {
        expect(shown.work[0]).toContain(`= ${expected.left}`)
        expect(shown.lines).toEqual(['cross-a'])
      }
      if (frame.id.endsWith('-cross-b')) {
        expect(shown.work[1]).toContain(`${b} - `)
        expect(shown.work[1]).toContain(`= ${expected.left}`)
        expect(shown.lines).toEqual(['cross-a', 'cross-b'])
      }
      if (frame.id.endsWith('-multiply')) expect(shown.work[0]).toMatch(new RegExp(`= ${dash(String(expected.right))}$`))
      if (frame.id.endsWith('-reveal')) expect(shown.answer, where).toBe(String(expected.product))
      if (shown.token !== null) expect(Number(shown.token), where).toBe(1)
      unmount()
    })
  })

  it('shows the borrow as a token with both parts adjusted', () => {
    const timeline = buildTimeline(lessonFixture('nikhilam-98x103')) as Extract<Timeline, { kind: 'nikhilam' }>
    const frame = timeline.frames.find((f) => f.id.endsWith('-adjust') && !f.id.endsWith('needs-adjust'))!
    const { container } = render(
      <Providers>
        <NikhilamStage frame={frame} numbers={timeline.display} reducedMotion moveDuration={0} />
      </Providers>,
    )
    const shown = stageValues(container)
    expect(shown.token).toBe('1')
    expect(shown.value('tile', 'left_part')).toBe('100')
    expect(shown.value('tile', 'right_part')).toBe('94')
    expect(shown.work).toEqual(['101 - 1 = 100', '(-6) + 100 = 94'])
  })

  it('shows the carry moving into the left part', () => {
    const timeline = buildTimeline(lessonFixture('nikhilam-90x90')) as Extract<Timeline, { kind: 'nikhilam' }>
    const frame = timeline.frames.find((f) => f.id.endsWith('-adjust') && !f.id.endsWith('needs-adjust'))!
    const { container } = render(
      <Providers>
        <NikhilamStage frame={frame} numbers={timeline.display} reducedMotion moveDuration={0} />
      </Providers>,
    )
    const shown = stageValues(container)
    expect(shown.token).toBe('1')
    expect(shown.value('tile', 'left_part')).toBe('81')
    expect(shown.value('tile', 'right_part')).toBe('0')
    expect(frame.scene.moves[0]).toMatchObject({ from: 'rightFirst', to: 'left' })
  })
})

describe('Urdhva 23 × 14 stage by stage', () => {
  const timeline = buildTimeline(lessonFixture('urdhva-23x14')) as Extract<Timeline, { kind: 'urdhva' }>

  function show(index: number) {
    const { container, unmount } = render(
      <Providers>
        <UrdhvaStage frame={timeline.frames[index]} reducedMotion moveDuration={0} />
      </Providers>,
    )
    const shown = stageValues(container)
    const active = Array.from(container.querySelectorAll('[data-role="tile"][data-state="active"]')).map((tile) => tile.getAttribute('data-id'))
    return { ...shown, active, unmount }
  }

  it('vertical stage: 3 × 4 = 12, write 2 and carry 1', () => {
    const multiply = show(1)
    expect(multiply.active).toEqual(['a-1', 'b-1'])
    expect(multiply.lines).toEqual(['pair-1-1'])
    expect(multiply.work).toEqual(['3 × 4 = 12'])
    multiply.unmount()

    const split = show(2)
    expect(split.value('tile', 'answer-1')).toBe('2')
    expect(split.value('carry', 'lane-2')).toBe('1')
    split.unmount()
  })

  it('crosswise stage: 3 × 1 + 2 × 4 + carry 1 = 12, write 2 and carry 1', () => {
    const multiply = show(3)
    expect(multiply.active.sort()).toEqual(['a-0', 'a-1', 'b-0', 'b-1'])
    expect(multiply.lines.sort()).toEqual(['pair-0-1', 'pair-1-0'])
    expect(multiply.work).toEqual(['3 × 1 = 3', '2 × 4 = 8', '3 + 8 = 11'])
    multiply.unmount()

    const carryIn = show(4)
    expect(carryIn.work[3]).toBe('11 + 1 = 12')
    expect(carryIn.value('carry', 'lane-2')).toBe('1')
    carryIn.unmount()

    const split = show(5)
    expect(split.value('tile', 'answer-2')).toBe('2')
    expect(split.value('carry', 'lane-3')).toBe('1')
    split.unmount()
  })

  it('final stage: 2 × 1 + carry 1 = 3, answer 322', () => {
    const multiply = show(6)
    expect(multiply.active).toEqual(['a-0', 'b-0'])
    expect(multiply.lines).toEqual(['pair-0-0'])
    expect(multiply.work).toEqual(['2 × 1 = 2'])
    multiply.unmount()

    const carryIn = show(7)
    expect(carryIn.work[1]).toBe('2 + 1 = 3')
    carryIn.unmount()

    const split = show(8)
    expect([split.value('tile', 'answer-3'), split.value('tile', 'answer-2'), split.value('tile', 'answer-1')]).toEqual(['3', '2', '2'])
    split.unmount()

    const reveal = show(timeline.frames.length - 1)
    expect(reveal.answer).toBe('322')
    expect(23 * 14).toBe(322)
    reveal.unmount()
  })
})

describe('mastery is only earned by passing practice', () => {
  const wrapper = ({ children }: { children: ReactNode }) => <Providers progress={EMPTY_PROGRESS}>{children}</Providers>

  it('visiting lessons never marks a level as passed', () => {
    const { result } = renderHook(() => useProgress(), { wrapper })
    act(() => {
      result.current.recordVisit('nikhilam', 'beginner', 'theory')
      result.current.recordVisit('nikhilam', 'advanced', 'learn')
      result.current.recordVisit('nikhilam', 'intermediate', 'practice')
    })
    expect(result.current.progress.mastery).toEqual({})
    expect(result.current.progress.explored).toEqual(['nikhilam'])
  })

  it('passing one level marks exactly that level', () => {
    const { result } = renderHook(() => useProgress(), { wrapper })
    act(() => result.current.passLevel('nikhilam', 'intermediate'))
    expect(result.current.progress.mastery).toEqual({ nikhilam: { beginner: false, intermediate: true, advanced: false } })
  })
})
