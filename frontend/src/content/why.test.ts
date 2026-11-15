import { describe, expect, it } from 'vitest'
import { buildTimeline } from '../animation/buildTimeline'
import type { CheckResponse, MistakeTag, PracticeQuestion } from '../api/types'
import { demoCoach } from '../services/coach'
import { RAW, lessonFixture, type FixtureName } from '../test/fixtures'
import { DIFFICULTIES } from '../types/learning'
import { feedbackText, questionText } from './practice'
import { METHOD_WHY, stepWhy } from './why'

const q = (key: string): PracticeQuestion => ({ key, step_id: 0, answer_type: 'integer' }) as PracticeQuestion

const wrong = (mistake: MistakeTag | null, question: string): CheckResponse =>
  ({
    sutra: 'nikhilam',
    numbers: [98, 103],
    difficulty: 'beginner',
    question,
    step_id: 0,
    answer_type: 'integer',
    submitted_answer: '1',
    status: 'incorrect',
    is_correct: false,
    correct_answer: null,
    mistake,
    message: null,
  }) as CheckResponse

/** The value each question asks for, worked out by hand for the fixture's numbers. */
const ANSWERS: Partial<Record<FixtureName, Record<string, string>>> = {
  'nikhilam-98x103': { left_part: '101', right_part: '-6', adjusted_left_part: '100', adjusted_right_part: '94', result: '10094' },
  'nikhilam-90x90': { left_part: '80', right_part: '100', adjusted_left_part: '81', adjusted_right_part: '0', result: '8100' },
  'urdhva-23x14': { column_1_total: '12', column_1_digit: '2', column_1_carry: '1', column_2_total: '12', column_2_digit: '2', column_2_carry: '1' },
  'ekadhikena-35': { next_number: '4', left_part: '12', result: '1225' },
}

const states = (text: string, value: string) => new RegExp(`(^|[^\\d])${value.replace('-', '[-−]')}([^\\d]|$)`).test(text)

describe('why content', () => {
  it('has a reason for every Sutra at every level', () => {
    for (const sutra of ['nikhilam', 'urdhva', 'ekadhikena'] as const) {
      for (const level of DIFFICULTIES) expect(METHOD_WHY[sutra][level].length).toBeGreaterThan(80)
    }
  })

  it('has a reason for every teaching step in every lesson fixture', () => {
    for (const name of Object.keys(RAW) as FixtureName[]) {
      const lesson = lessonFixture(name)
      for (const step of buildTimeline(lesson).steps) {
        expect(stepWhy(lesson.kind, step.title), `${name}: ${step.title}`).toBeTruthy()
      }
    }
  })

  it('mistake messages never state the value the learner is asked for', () => {
    for (const [name, answers] of Object.entries(ANSWERS) as [FixtureName, Record<string, string>][]) {
      const lesson = lessonFixture(name)
      for (const [key, value] of Object.entries(answers)) {
        for (const message of Object.values(questionText(lesson, q(key)).mistakes ?? {})) {
          expect(states(message, value), `${name} ${key}: ${message}`).toBe(false)
        }
      }
    }
  })
})

describe('coach feedback', () => {
  const lesson = lessonFixture('nikhilam-98x103')

  it('names the recognised mistake instead of saying "not quite"', () => {
    const text = questionText(lesson, q('left_part'))
    const reply = feedbackText(wrong('cross_added', 'left_part'), q('left_part'), '101', 1, text)
    expect(reply).toMatch(/added a deviation/)
    expect(reply).not.toMatch(/Not quite/)
  })

  it('explains the idea of the step after a second unexplained miss', () => {
    const text = questionText(lesson, q('left_part'))
    const why = stepWhy('nikhilam', 'Cross-subtract')
    expect(feedbackText(wrong(null, 'left_part'), q('left_part'), '7', 1, text, why)).toMatch(/Not quite/)
    expect(feedbackText(wrong(null, 'left_part'), q('left_part'), '7', 2, text, why)).toContain(why)
  })

  it('"Why does this work?" gives the reason, not the procedure', () => {
    const reply = demoCoach.respond({ intent: 'why', mode: 'theory', idea: 'procedure', methodWhy: METHOD_WHY.ekadhikena.beginner })
    expect(reply.text).toBe(METHOD_WHY.ekadhikena.beginner)
  })

  it('asking to explain again never repeats the same words', () => {
    const ask = (explainCount: number) =>
      demoCoach.respond({ intent: 'explain_again', mode: 'theory', frameLine: 'line', frameState: 'state', stepWhy: 'reason', explainCount }).text
    expect(ask(1)).not.toBe(ask(2))
    expect(ask(2)).toContain('reason')
  })
})
