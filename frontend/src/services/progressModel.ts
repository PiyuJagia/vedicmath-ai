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

/** One finished Practice with Coach problem, as the learner first solved it. */
export interface PracticeRecord {
  /** Problem key, e.g. "98x93" or "35". */
  problem: string
  /** Wrong answers checked by the backend while solving it. */
  wrong: number
  /** Hints opened while solving it (each level counts). */
  hints: number
  /** ISO date and time. */
  at: string
}

/**
 * What it takes to pass a level in Practice with Coach. A problem is "on your
 * own" when its first completion used no hints and at most one wrong answer.
 * Only the first completion of each problem counts, so redoing a problem after
 * seeing its answer does not add evidence.
 */
export const PASS_RULE = { problems: 3, onYourOwn: 2, maxWrongOnYourOwn: 1 } as const

export function solvedOnYourOwn(record: PracticeRecord): boolean {
  return record.hints === 0 && record.wrong <= PASS_RULE.maxWrongOnYourOwn
}

export interface LevelEvidence {
  problems: number
  onYourOwn: number
  passed: boolean
}

export function levelEvidence(records: PracticeRecord[]): LevelEvidence {
  const problems = records.length
  const onYourOwn = records.filter(solvedOnYourOwn).length
  return { problems, onYourOwn, passed: problems >= PASS_RULE.problems && onYourOwn >= PASS_RULE.onYourOwn }
}

export function practiceKey(sutraId: string, difficulty: Difficulty): string {
  return `${sutraId}:${difficulty}`
}

export function practiceOf(state: ProgressState, sutraId: string, difficulty: Difficulty): PracticeRecord[] {
  return state.practice?.[practiceKey(sutraId, difficulty)] ?? []
}

/** Adds a finished problem (first completion only) and passes the level once the evidence meets PASS_RULE. */
export function withPracticeRecord(state: ProgressState, sutraId: string, difficulty: Difficulty, record: PracticeRecord): ProgressState {
  const key = practiceKey(sutraId, difficulty)
  const records = practiceOf(state, sutraId, difficulty)
  if (records.some((existing) => existing.problem === record.problem)) return state
  const next = [...records, record]
  const passed = levelEvidence(next).passed
  const mastery = masteryOf(state, sutraId)
  return {
    ...state,
    practice: { ...state.practice, [key]: next },
    mastery: passed && !mastery[difficulty] ? { ...state.mastery, [sutraId]: { ...mastery, [difficulty]: true } } : state.mastery,
  }
}

export interface ProgressState {
  /** Levels the learner has passed through Practice with Coach. */
  mastery: Record<string, LevelMastery>
  /** Finished practice problems per Sutra and level ("nikhilam:beginner"), the evidence behind mastery. */
  practice: Record<string, PracticeRecord[]>
  explored: string[]
  history: HistoryEntry[]
  streakDays: number
  /** True while the state is the fictional sample, not the learner's own activity. */
  isSample: boolean
}

export const NO_MASTERY: LevelMastery = { beginner: false, intermediate: false, advanced: false }

export const EMPTY_PROGRESS: ProgressState = {
  mastery: {},
  practice: {},
  explored: [],
  history: [],
  streakDays: 0,
  isSample: false,
}

export const SAMPLE_PROGRESS: ProgressState = {
  mastery: { nikhilam: { beginner: true, intermediate: false, advanced: false } },
  practice: {},
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

/** For now every Sutra with lessons is open to everyone. Set to false to bring back the unlock journey. */
export const ALL_LESSONS_OPEN = true

/**
 * A Sutra unlocks when at least one level of the Sutra before it has been passed.
 * The first Sutra is always unlocked. Admins bypass progression locks.
 */
export function isUnlocked(sutras: SutraInfo[], index: number, state: ProgressState, isAdmin: boolean, allOpen = ALL_LESSONS_OPEN): boolean {
  if (allOpen || isAdmin || index === 0) return true
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
