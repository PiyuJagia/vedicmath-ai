import { lastFrameBeforeStep } from '../../animation/buildTimeline'
import type { Timeline } from '../../animation/types'
import type { PracticeQuestion } from '../../api/types'

export const HINT_LEVELS = 3

/**
 * The learner sees every moment of the steps already answered, but nothing
 * from the step they are working on, so the answer is never shown early.
 */
export function revealLimit(timeline: Timeline, questions: PracticeQuestion[], current: number): number {
  if (current >= questions.length) return timeline.frames.length - 1
  return lastFrameBeforeStep(timeline, questions[current].step_id)
}

export function nextHintLevel(level: number): number {
  return Math.min(level + 1, HINT_LEVELS)
}

/** The rabbit offers help after a wrong attempt or a long pause. */
export function rabbitShouldAppear(wrongAttempts: number, idleSeconds: number, dismissed: boolean): boolean {
  if (dismissed) return false
  return wrongAttempts > 0 || idleSeconds >= 15
}
