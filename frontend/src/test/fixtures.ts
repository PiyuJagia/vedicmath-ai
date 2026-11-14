/** Real responses captured from the Python backend (see src/animation/fixtures). */
import ekadhikena115 from '../animation/fixtures/ekadhikena-115.json'
import ekadhikena35 from '../animation/fixtures/ekadhikena-35.json'
import nikhilam103x104 from '../animation/fixtures/nikhilam-103x104.json'
import nikhilam90x90 from '../animation/fixtures/nikhilam-90x90.json'
import nikhilam98x103 from '../animation/fixtures/nikhilam-98x103.json'
import nikhilam98x97 from '../animation/fixtures/nikhilam-98x97.json'
import nikhilam98x98 from '../animation/fixtures/nikhilam-98x98.json'
import nikhilam998x997 from '../animation/fixtures/nikhilam-998x997.json'
import questionsNikhilam from '../animation/fixtures/questions-nikhilam-98x97.json'
import questionsUrdhva from '../animation/fixtures/questions-urdhva-23x14.json'
import urdhva1234x5678 from '../animation/fixtures/urdhva-1234x5678.json'
import urdhva23x14 from '../animation/fixtures/urdhva-23x14.json'
import urdhva87x877 from '../animation/fixtures/urdhva-87x877.json'
import urdhva99x99 from '../animation/fixtures/urdhva-99x99.json'
import { parseLesson } from '../api/parseLesson'
import type { Lesson, LessonSutraId, QuestionsResponse } from '../api/types'

export const RAW = {
  'nikhilam-98x97': nikhilam98x97,
  'nikhilam-98x103': nikhilam98x103,
  'nikhilam-90x90': nikhilam90x90,
  'nikhilam-103x104': nikhilam103x104,
  'nikhilam-98x98': nikhilam98x98,
  'nikhilam-998x997': nikhilam998x997,
  'urdhva-23x14': urdhva23x14,
  'urdhva-99x99': urdhva99x99,
  'urdhva-87x877': urdhva87x877,
  'urdhva-1234x5678': urdhva1234x5678,
  'ekadhikena-35': ekadhikena35,
  'ekadhikena-115': ekadhikena115,
} as const

export type FixtureName = keyof typeof RAW

export function lessonFixture(name: FixtureName): Lesson {
  const sutra = name.split('-')[0] as LessonSutraId
  return parseLesson(sutra, structuredClone(RAW[name]))
}

export const QUESTIONS = {
  'nikhilam-98x97': questionsNikhilam as QuestionsResponse,
  'urdhva-23x14': questionsUrdhva as QuestionsResponse,
}
