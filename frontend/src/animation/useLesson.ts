import { useEffect, useState } from 'react'
import { ApiError, fetchLesson } from '../api/client'
import { ContractError } from '../api/parseLesson'
import type { Lesson, LessonSutraId, Problem } from '../api/types'
import { problemKey } from '../content/lessons'
import type { Difficulty } from '../types/learning'
import { buildTimeline } from './buildTimeline'
import type { Timeline } from './types'

export type LessonState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; lesson: Lesson; timeline: Timeline }

export function friendlyError(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof ContractError) return `The app could not read this lesson: ${error.message}`
  return 'Something went wrong while loading the lesson.'
}

/** Load a lesson from the backend and turn it into an animation timeline. */
export function useLesson(sutra: LessonSutraId | undefined, problem: Problem | null, difficulty: Difficulty): LessonState {
  const key = sutra && problem ? `${sutra}:${difficulty}:${problemKey(problem)}` : ''
  const [loaded, setLoaded] = useState<{ key: string; state: LessonState } | null>(null)

  useEffect(() => {
    if (!sutra || !problem) return
    let cancelled = false
    fetchLesson(sutra, problem, difficulty)
      .then((lesson) => {
        if (!cancelled) setLoaded({ key, state: { status: 'ready', lesson, timeline: buildTimeline(lesson) } })
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoaded({ key, state: { status: 'error', message: friendlyError(error) } })
      })
    return () => {
      cancelled = true
    }
    // The key captures sutra, difficulty and the operands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // Anything loaded for a different problem counts as still loading.
  return loaded && loaded.key === key ? loaded.state : { status: 'loading' }
}
