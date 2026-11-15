import { buildTimeline } from '../animation/buildTimeline'
import type { Timeline } from '../animation/types'
import type { LessonAnimationPayload } from './coachTypes'
import { ContractError, parseLesson } from './parseLesson'
import type { Lesson, LessonSutraId } from './types'

const STAGE_SUTRAS = new Set<LessonSutraId>(['nikhilam', 'urdhva', 'ekadhikena'])

function isLessonSutraId(value: string): value is LessonSutraId {
  return STAGE_SUTRAS.has(value as LessonSutraId)
}

export type HandoffStageResult =
  | {
      status: 'ready'
      calculationId: string
      sutraId: LessonSutraId
      lesson: Lesson
      timeline: Timeline
    }
  | {
      status: 'unsupported_format'
      calculationId: string
      sutraId: string
      format: 'flat'
      message: string
    }
  | {
      status: 'unsupported_sutra'
      calculationId: string
      sutraId: string
      message: string
    }
  | {
      status: 'invalid'
      calculationId: string
      message: string
    }

/**
 * Turn a backend LessonAnimationPayload into the existing stage timeline.
 * Never invents events — only parseLesson + buildTimeline.
 */
export function resolveHandoffLesson(payload: LessonAnimationPayload): HandoffStageResult {
  const calculationId = payload.calculation_id
  const sutraId = payload.sutra_id

  if (payload.animation_format === 'flat') {
    return {
      status: 'unsupported_format',
      calculationId,
      sutraId,
      format: 'flat',
      message:
        'This Sutra still uses a flat animation format. The stage player is not ready for it yet, so the animation cannot open.',
    }
  }

  if (!isLessonSutraId(sutraId)) {
    return {
      status: 'unsupported_sutra',
      calculationId,
      sutraId,
      message: `No React stage exists yet for “${sutraId}”.`,
    }
  }

  try {
    const lesson = parseLesson(sutraId, {
      sutra: payload.sutra,
      numbers: payload.numbers,
      difficulty: payload.difficulty,
      teaching_steps: payload.teaching_steps,
      animation_steps: payload.animation_steps,
      result: payload.result,
    })
    return {
      status: 'ready',
      calculationId,
      sutraId,
      lesson,
      timeline: buildTimeline(lesson),
    }
  } catch (error) {
    const message = error instanceof ContractError ? error.message : 'The lesson payload could not be opened.'
    return { status: 'invalid', calculationId, message }
  }
}
