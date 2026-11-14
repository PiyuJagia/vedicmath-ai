import { describe, expect, it } from 'vitest'
import { RAW, lessonFixture, type FixtureName } from '../test/fixtures'
import { describeError } from './client'
import { ContractError, parseLesson } from './parseLesson'

describe('parseLesson', () => {
  it.each(Object.keys(RAW) as FixtureName[])('accepts the real backend response %s', (name) => {
    const lesson = lessonFixture(name)
    expect(lesson.kind).toBe(name.split('-')[0])
  })

  it('rejects an animation event it does not know', () => {
    const body = structuredClone(RAW['nikhilam-98x97']) as unknown as { animation_steps: { events: { action: string }[] }[] }
    body.animation_steps[1].events[0].action = 'teleport_digit'
    expect(() => parseLesson('nikhilam', body)).toThrow(ContractError)
    expect(() => parseLesson('nikhilam', body)).toThrow(/teleport_digit/)
  })

  it('rejects Nikhilam data that uses the old number − base convention', () => {
    const body = structuredClone(RAW['nikhilam-98x97']) as unknown as { teaching_steps: { type: string; convention?: string }[] }
    const deviations = body.teaching_steps.find((step) => step.type === 'deviations')!
    deviations.convention = 'number - base'
    expect(() => parseLesson('nikhilam', body)).toThrow(/base - number/)
  })

  it('rejects teaching and animation steps that do not line up', () => {
    const body = structuredClone(RAW['urdhva-23x14']) as unknown as { animation_steps: { step_id: number }[] }
    body.animation_steps[2].step_id = 99
    expect(() => parseLesson('urdhva', body)).toThrow(/line up/)
  })

  it('rejects an Ekadhikena event it does not know', () => {
    const body = structuredClone(RAW['ekadhikena-35']) as unknown as { animation_steps: { action: string }[] }
    body.animation_steps.push({ action: 'square_root' })
    expect(() => parseLesson('ekadhikena', body)).toThrow(/square_root/)
  })

  it('rejects a response without a result', () => {
    const body = { ...structuredClone(RAW['urdhva-23x14']), result: 'lots' }
    expect(() => parseLesson('urdhva', body)).toThrow(ContractError)
  })
})

describe('describeError', () => {
  it('passes on the backend validation message', () => {
    expect(describeError(400, { detail: 'beginner requires numbers between 90 and 109.' })).toBe(
      'beginner requires numbers between 90 and 109.',
    )
  })

  it('turns FastAPI field errors into one friendly sentence', () => {
    expect(describeError(422, { detail: [{ loc: ['query', 'a'], msg: 'Input should be a valid integer' }] })).toBe(
      'Please enter whole numbers only.',
    )
  })

  it('explains an unavailable Sutra', () => {
    expect(describeError(404, null)).toBe('That Sutra is not available yet.')
  })
})
