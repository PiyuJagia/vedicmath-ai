import { API_BASE, ApiError, describeError } from '../../api/client'

/** Number Rocket talks only to the game endpoints; every number and check comes from the Python engines. */

export type RocketSutra = 'nikhilam' | 'ekadhikena'
export type Engine = 'pad' | 'booster'
export type RungId = 'N1' | 'N2' | 'N3' | 'N4' | 'E1' | 'E2'

export type LaunchProblem =
  | { sutra: 'nikhilam'; a: number; b: number }
  | { sutra: 'ekadhikena'; number: number }

export type MissionLaunch = LaunchProblem & {
  rung: RungId
  review: boolean
  engine: Engine
  label: string
}

export interface Stage {
  key: string
  answer_type: 'integer' | 'digits'
  digits?: number
  prompt: string
  hints: string[]
}

export interface LaunchDetails {
  sutra: RocketSutra
  rung: RungId
  base: number | null
  engine: Engine
  label: string
  stages: Stage[]
}

export interface NikhilamFacts {
  sutra: 'nikhilam'
  a: number
  b: number
  base: number
  deviations: [number, number]
  cross: number
  product: number
  adjustment: 'none' | 'borrow' | 'carry'
  left_part: number
  right_part: number
  formatted_right: string
  result: number
  rung: RungId
  label: string
}

export interface EkadhikenaFacts {
  sutra: 'ekadhikena'
  number: number
  previous: number
  next: number
  left_part: number
  right_part: number
  formatted_right: string
  result: number
  rung: RungId
  label: string
}

export type SolutionFacts = NikhilamFacts | EkadhikenaFacts

export interface StageCheck {
  stage: string
  status: 'correct' | 'incorrect' | 'invalid'
  is_correct: boolean
  mistake: string | null
  message: string | null
  feedback: string | null
  solution: SolutionFacts | null
}

export interface RungInfo {
  id: RungId
  sutra: RocketSutra
  name: string
  skill: string
  example: string
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
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
      throw new ApiError('The maths engine is waking up. Please try again in a moment.', response.status)
    }
    throw new ApiError(describeError(response.status, body), response.status)
  }
  return body as T
}

export function problemParams(problem: LaunchProblem): Record<string, string> {
  return problem.sutra === 'nikhilam'
    ? { sutra: problem.sutra, a: String(problem.a), b: String(problem.b) }
    : { sutra: problem.sutra, number: String(problem.number) }
}

export function fetchRungs(): Promise<{ rungs: RungInfo[] }> {
  return call('/game/rocket/rungs')
}

export function fetchMission(seed: number, rungs: { nikhilam?: RungId; ekadhikena?: RungId }): Promise<{ seed: number; launches: MissionLaunch[] }> {
  const params = new URLSearchParams({ seed: String(seed) })
  if (rungs.nikhilam) params.set('nikhilam_rung', rungs.nikhilam)
  if (rungs.ekadhikena) params.set('ekadhikena_rung', rungs.ekadhikena)
  return call(`/game/rocket/mission?${params}`)
}

export function fetchLaunch(problem: LaunchProblem): Promise<LaunchDetails> {
  return call(`/game/rocket/launch?${new URLSearchParams(problemParams(problem))}`)
}

export function checkStage(problem: LaunchProblem, stage: string, answer: string): Promise<StageCheck> {
  const body = problem.sutra === 'nikhilam' ? { sutra: 'nikhilam', a: problem.a, b: problem.b } : { sutra: 'ekadhikena', number: problem.number }
  return call('/game/rocket/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, stage, answer }),
  })
}
