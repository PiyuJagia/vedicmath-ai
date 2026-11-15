import { DIFFICULTIES, type Difficulty } from '../../types/learning'

export const WORLD_NAMES: Record<Difficulty, string> = {
  beginner: 'Sapphire Sea',
  intermediate: 'Ember Keep',
  advanced: 'Sky Citadel',
}

export type WorldWins = Partial<Record<Difficulty, number>>

export function islandLevel(value: string | null): Difficulty {
  return DIFFICULTIES.find((level) => level === value) ?? 'beginner'
}

/** Validate the same-origin game's completion before recording its local badge. */
export function isWorldCompletion(value: unknown, level: Difficulty): boolean {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  return data.type === 'islands:complete'
    && data.difficulty === level
    && ['a', 'b', 'base', 'result', 'leaps'].every((key) => Number.isSafeInteger(data[key]))
    && (data.a as number) > 0
    && (data.b as number) > 0
    && [100, 1000].includes(data.base as number)
    && data.result === (data.a as number) * (data.b as number)
    && data.leaps === (level === 'advanced' ? 8 : 6)
}

export function worldWins(wins: WorldWins, level: Difficulty): number {
  const value = wins[level]
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : 0
}
