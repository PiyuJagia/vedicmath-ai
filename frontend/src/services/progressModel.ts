import type { SutraInfo } from '../content/sutras'
import { DIFFICULTIES, type Difficulty, type LevelMastery } from '../types/learning'

export type LessonSection = 'theory' | 'learn' | 'practice'

export interface HistoryEntry {
  sutraId: string
  difficulty: Difficulty
  section: LessonSection
  /** ISO date and time. */
  at: string
}

export interface ProgressState {
  /** Levels the learner has passed through Practice with Coach. */
  mastery: Record<string, LevelMastery>
  explored: string[]
  history: HistoryEntry[]
  streakDays: number
  /** True while the state is the fictional sample, not the learner's own activity. */
  isSample: boolean
}

export const NO_MASTERY: LevelMastery = { beginner: false, intermediate: false, advanced: false }

export const EMPTY_PROGRESS: ProgressState = {
  mastery: {},
  explored: [],
  history: [],
  streakDays: 0,
  isSample: false,
}

export const SAMPLE_PROGRESS: ProgressState = {
  mastery: { nikhilam: { beginner: true, intermediate: false, advanced: false } },
  explored: ['nikhilam', 'urdhva'],
  history: [
    { sutraId: 'nikhilam', difficulty: 'beginner', section: 'practice', at: '2026-11-13T17:20:00' },
    { sutraId: 'nikhilam', difficulty: 'beginner', section: 'learn', at: '2026-11-13T17:05:00' },
    { sutraId: 'nikhilam', difficulty: 'beginner', section: 'theory', at: '2026-11-13T16:50:00' },
  ],
  streakDays: 5,
  isSample: true,
}

export type SutraStatus = 'mastered' | 'in_progress' | 'available' | 'locked' | 'coming_soon'

export function masteryOf(state: ProgressState, sutraId: string): LevelMastery {
  return state.mastery[sutraId] ?? NO_MASTERY
}

export function passedAny(mastery: LevelMastery): boolean {
  return DIFFICULTIES.some((level) => mastery[level])
}

export function passedAll(mastery: LevelMastery): boolean {
  return DIFFICULTIES.every((level) => mastery[level])
}

/**
 * A Sutra unlocks when at least one level of the Sutra before it has been passed.
 * The first Sutra is always unlocked. Admins bypass progression locks.
 */
export function isUnlocked(sutras: SutraInfo[], index: number, state: ProgressState, isAdmin: boolean): boolean {
  if (isAdmin || index === 0) return true
  return passedAny(masteryOf(state, sutras[index - 1].id))
}

export function sutraStatus(sutras: SutraInfo[], index: number, state: ProgressState, isAdmin: boolean): SutraStatus {
  const sutra = sutras[index]
  if (!sutra.lessonId) return 'coming_soon'
  if (!isUnlocked(sutras, index, state, isAdmin)) return 'locked'
  const mastery = masteryOf(state, sutra.id)
  if (passedAll(mastery)) return 'mastered'
  if (passedAny(mastery)) return 'in_progress'
  return 'available'
}

/** The highest unlocked Sutra with a lesson that is not fully mastered. */
export function currentSutraIndex(sutras: SutraInfo[], state: ProgressState, isAdmin: boolean): number {
  let current = -1
  sutras.forEach((_, index) => {
    const status = sutraStatus(sutras, index, state, isAdmin)
    if (status === 'available' || status === 'in_progress') current = index
  })
  return current
}

/** Games for a Sutra and level unlock once that level's Practice is passed. */
export function isGameUnlocked(state: ProgressState, sutraId: string, difficulty: Difficulty, isAdmin: boolean): boolean {
  return isAdmin || masteryOf(state, sutraId)[difficulty]
}

export function countUnlocked(sutras: SutraInfo[], state: ProgressState, isAdmin: boolean): number {
  return sutras.filter((sutra, index) => sutra.lessonId && isUnlocked(sutras, index, state, isAdmin)).length
}

export function countPassedLevels(state: ProgressState): number {
  return Object.values(state.mastery).reduce(
    (total, mastery) => total + DIFFICULTIES.filter((level) => mastery[level]).length,
    0,
  )
}
