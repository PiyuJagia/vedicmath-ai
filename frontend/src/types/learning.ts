export const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const

export type Difficulty = (typeof DIFFICULTIES)[number]

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

/** Which difficulty levels of one Sutra the learner has actually passed. */
export type LevelMastery = Record<Difficulty, boolean>

export interface LearnerProfile {
  id: string
  displayName: string
  avatarInitial: string
  avatarColour?: string
  /** True for fictional development profiles; never real learner data. */
  isSample: boolean
}
