import type { Lesson } from '../api/types'
import { buildEkadhikenaTimeline } from './sutras/ekadhikena'
import { buildNikhilamTimeline } from './sutras/nikhilam'
import { buildUrdhvaTimeline } from './sutras/urdhva'
import type { Timeline } from './types'

export function buildTimeline(lesson: Lesson): Timeline {
  switch (lesson.kind) {
    case 'nikhilam':
      return buildNikhilamTimeline(lesson.data)
    case 'urdhva':
      return buildUrdhvaTimeline(lesson.data)
    case 'ekadhikena':
      return buildEkadhikenaTimeline(lesson.data)
  }
}

/** Index of the last frame belonging to a teaching step, or -1 if none. */
export function lastFrameOfStep(timeline: Timeline, stepId: number): number {
  let last = -1
  timeline.frames.forEach((frame, index) => {
    if (frame.stepId === stepId) last = index
  })
  return last
}

/** Index of the last frame that belongs to a step before the given one. */
export function lastFrameBeforeStep(timeline: Timeline, stepId: number): number {
  const order = timeline.steps.map((step) => step.id)
  const position = order.indexOf(stepId)
  let last = 0
  timeline.frames.forEach((frame, index) => {
    if (order.indexOf(frame.stepId) < position) last = index
  })
  return last
}
