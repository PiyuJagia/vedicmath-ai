import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildTimeline } from '../../animation/buildTimeline'
import { questionText } from '../../content/practice'
import { Providers } from '../../app/Providers'
import { EMPTY_PROGRESS } from '../../services/progressModel'
import { QUESTIONS, RAW, lessonFixture } from '../../test/fixtures'
import { HINT_LEVELS, nextHintLevel, rabbitShouldAppear, revealLimit } from './practiceLogic'
import { PracticePage } from './PracticePage'

describe('practice logic', () => {
  const timeline = buildTimeline(lessonFixture('nikhilam-98x97'))
  const questions = QUESTIONS['nikhilam-98x97'].questions

  it('never reveals frames from the step being asked', () => {
    questions.forEach((question, current) => {
      const limit = revealLimit(timeline, questions, current)
      const order = timeline.steps.map((step) => step.id)
      const revealed = timeline.frames.slice(0, limit + 1)
      expect(revealed.every((frame) => order.indexOf(frame.stepId) < order.indexOf(question.step_id))).toBe(true)
    })
  })

  it('reveals everything once all questions are answered', () => {
    expect(revealLimit(timeline, questions, questions.length)).toBe(timeline.frames.length - 1)
  })

  it('hints grow one level at a time up to three', () => {
    expect([0, 1, 2, 3].map(nextHintLevel)).toEqual([1, 2, 3, 3])
    expect(HINT_LEVELS).toBe(3)
  })

  it('the rabbit appears after a wrong answer or a long pause, unless dismissed', () => {
    expect(rabbitShouldAppear(0, 3, false)).toBe(false)
    expect(rabbitShouldAppear(1, 0, false)).toBe(true)
    expect(rabbitShouldAppear(0, 15, false)).toBe(true)
    expect(rabbitShouldAppear(2, 30, true)).toBe(false)
  })

  it('hints describe the calculation without stating the answer', () => {
    const lesson = lessonFixture('nikhilam-98x97')
    const answers: Record<string, string> = { deviation_a: '2', deviation_b: '3', left_part: '95', right_part: '6', padded_right_part: '06', result: '9506' }
    for (const question of questions) {
      for (const hint of questionText(lesson, question).hints) {
        expect(hint).not.toMatch(new RegExp(`(^|[^\\d])${answers[question.key]}([^\\d]|$)`))
      }
    }
  })
})

describe('Practice with Coach screen', () => {
  const checks: { question: string; answer: string }[] = []

  beforeEach(() => {
    checks.length = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string, init?: RequestInit) => {
        const url = String(input)
        const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
        if (url.includes('/sutras/nikhilam/lesson')) return json(RAW['nikhilam-98x97'])
        if (url.includes('/sutras/nikhilam/questions')) return json(QUESTIONS['nikhilam-98x97'])
        if (url.includes('/sutras/nikhilam/check')) {
          const body = JSON.parse(String(init?.body)) as { question: string; answer: string }
          checks.push(body)
          // Stands in for the Python check: only "2" is accepted for deviation_a here.
          const correct = body.question === 'deviation_a' && body.answer === '2'
          const sign = body.question === 'deviation_a' && body.answer === '-2'
          return json({
            sutra: 'nikhilam',
            numbers: [98, 97],
            difficulty: 'beginner',
            question: body.question,
            step_id: 2,
            answer_type: 'integer',
            submitted_answer: body.answer,
            status: correct ? 'correct' : 'incorrect',
            is_correct: correct,
            correct_answer: correct ? null : '2',
            mistake: sign ? 'sign' : null,
            message: null,
          })
        }
        return new Response('{}', { status: 404 })
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function renderPractice() {
    return render(
      <Providers settings={{ reduceMotion: 'on' }} progress={EMPTY_PROGRESS}>
        <MemoryRouter initialEntries={['/sutras/nikhilam/practice?level=beginner']}>
          <Routes>
            <Route path="/sutras/:sutraId/practice" element={<PracticePage />} />
          </Routes>
        </MemoryRouter>
      </Providers>,
    )
  }

  it('asks one question at a time and relies on the backend to judge answers', async () => {
    renderPractice()
    const input = await screen.findByLabelText('Deviation of 98')
    expect(screen.getAllByText(/What is the deviation of 98\?/).length).toBeGreaterThan(0)

    fireEvent.change(input, { target: { value: '-2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Check' }))
    await screen.findByText(/Check the sign/)
    expect(checks).toHaveLength(1)
    expect(checks[0]).toMatchObject({ question: 'deviation_a', answer: '-2' })
    // A wrong answer keeps the same question.
    expect(screen.getByLabelText('Deviation of 98')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Deviation of 98'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Check' }))
    // The mocked lesson is 98 × 97, so the next question is about 97.
    await screen.findByLabelText('Deviation of 97')
  })

  it('gives hints level by level from the Hint button', async () => {
    renderPractice()
    await screen.findByLabelText('Deviation of 98')

    fireEvent.click(screen.getByRole('button', { name: 'Hint' }))
    expect(screen.getByText('Hint 1 of 3')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Hint' }))
    expect(screen.getByText('Hint 2 of 3')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Hint' }))
    expect(screen.getByText('Hint 3 of 3')).toBeTruthy()
    expect(screen.getByText('Work out 100 − 98.')).toBeTruthy()
  })

  it('the rabbit offers a hint after a wrong answer', async () => {
    renderPractice()
    const input = await screen.findByLabelText('Deviation of 98')
    expect(screen.queryByRole('button', { name: 'Ask the rabbit for a hint' })).toBeNull()

    fireEvent.change(input, { target: { value: '7' } })
    fireEvent.click(screen.getByRole('button', { name: 'Check' }))
    const rabbit = await screen.findByRole('button', { name: 'Ask the rabbit for a hint' })
    fireEvent.click(rabbit)
    await waitFor(() => expect(screen.getByText('Hint 1 of 3')).toBeTruthy())
  })
})
