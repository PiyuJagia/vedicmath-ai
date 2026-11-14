import type { Difficulty } from '../types/learning'
import { parseLesson } from './parseLesson'
import type { CheckAllResponse, CheckResponse, Lesson, LessonSutraId, Problem, QuestionsResponse } from './types'

export const API_BASE = '/api'

/** A request the backend refused, or could not be reached. The message is safe to show learners. */
export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function problemParams(problem: Problem, difficulty: Difficulty): URLSearchParams {
  const params = new URLSearchParams({ difficulty })
  if ('number' in problem) {
    params.set('number', String(problem.number))
  } else {
    params.set('a', String(problem.a))
    params.set('b', String(problem.b))
  }
  return params
}

/** Turn a FastAPI error body into one friendly sentence. */
export function describeError(status: number, body: unknown): string {
  if (typeof body === 'object' && body !== null && 'detail' in body) {
    const detail = (body as { detail: unknown }).detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) return 'Please enter whole numbers only.'
  }
  if (status === 404) return 'That Sutra is not available yet.'
  return 'Something went wrong while working out the maths. Please try again.'
}

async function request(path: string, init?: RequestInit): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, init)
  } catch {
    throw new ApiError('The maths engine is not reachable. Is the Python backend running?', 0)
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    body = null
  }

  if (!response.ok) {
    if (response.status >= 500 && body === null) {
      throw new ApiError('The maths engine is not reachable. Is the Python backend running?', response.status)
    }
    throw new ApiError(describeError(response.status, body), response.status)
  }
  return body
}

export async function fetchLesson(sutra: LessonSutraId, problem: Problem, difficulty: Difficulty): Promise<Lesson> {
  const body = await request(`/sutras/${sutra}/lesson?${problemParams(problem, difficulty)}`)
  return parseLesson(sutra, body)
}

export async function fetchQuestions(
  sutra: LessonSutraId,
  problem: Problem,
  difficulty: Difficulty,
): Promise<QuestionsResponse> {
  return (await request(`/sutras/${sutra}/questions?${problemParams(problem, difficulty)}`)) as QuestionsResponse
}

export async function checkAnswer(
  sutra: LessonSutraId,
  problem: Problem,
  difficulty: Difficulty,
  question: string,
  answer: string,
): Promise<CheckResponse> {
  return (await request(`/sutras/${sutra}/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...problem, difficulty, question, answer }),
  })) as CheckResponse
}

export async function checkAllAnswers(
  sutra: LessonSutraId,
  problem: Problem,
  difficulty: Difficulty,
  answers: Record<string, string>,
): Promise<CheckAllResponse> {
  return (await request(`/sutras/${sutra}/check-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...problem, difficulty, answers }),
  })) as CheckAllResponse
}
