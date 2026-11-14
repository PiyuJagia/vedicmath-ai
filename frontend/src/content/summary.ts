import { masteryOf, type ProgressState } from '../services/progressModel'
import { DIFFICULTIES, DIFFICULTY_LABELS } from '../types/learning'
import { SUTRAS } from './sutras'

/**
 * A learning summary of at most three sentences, built only from recorded
 * progress. A future AI summary must stay grounded in the same data.
 */
export function learningSummary(name: string, progress: ProgressState, nextName: string | undefined): string {
  const passed = SUTRAS.flatMap((sutra) =>
    DIFFICULTIES.filter((level) => masteryOf(progress, sutra.id)[level]).map((level) => `${sutra.name} ${DIFFICULTY_LABELS[level]}`),
  )
  const explored = progress.explored.length
  const first = `${name} has explored ${explored} Sutra${explored === 1 ? '' : 's'}`
  const second =
    passed.length > 0
      ? ` and passed ${passed.slice(0, 2).join(' and ')}${passed.length > 2 ? ` plus ${passed.length - 2} more` : ''}.`
      : ', with no levels passed yet.'
  return `${first}${second}${nextName ? ` Next up is ${nextName}.` : ''}`
}
