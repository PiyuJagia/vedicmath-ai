import { describe, expect, it } from 'vitest'
import { SUTRAS } from '../content/sutras'
import { EMPTY_PROGRESS, currentSutraIndex, isGameUnlocked, isUnlocked, sutraStatus, type ProgressState } from './progressModel'

const withMastery = (mastery: ProgressState['mastery']): ProgressState => ({ ...EMPTY_PROGRESS, mastery })
const index = (id: string) => SUTRAS.findIndex((sutra) => sutra.id === id)

describe('journey order', () => {
  it('starts with Nikhilam, then Urdhva, then Ekadhikena', () => {
    expect(SUTRAS.slice(0, 3).map((sutra) => sutra.id)).toEqual(['nikhilam', 'urdhva', 'ekadhikena'])
    expect(SUTRAS).toHaveLength(16)
  })
})

describe('unlocking', () => {
  it('only the first Sutra is open at the start', () => {
    expect(isUnlocked(SUTRAS, 0, EMPTY_PROGRESS, false)).toBe(true)
    expect(isUnlocked(SUTRAS, index('urdhva'), EMPTY_PROGRESS, false)).toBe(false)
  })

  it('passing one level of the previous Sutra unlocks the next', () => {
    const state = withMastery({ nikhilam: { beginner: false, intermediate: true, advanced: false } })
    expect(isUnlocked(SUTRAS, index('urdhva'), state, false)).toBe(true)
    expect(isUnlocked(SUTRAS, index('ekadhikena'), state, false)).toBe(false)
  })

  it('viewing lessons is not the same as passing', () => {
    const viewedOnly: ProgressState = { ...EMPTY_PROGRESS, explored: ['nikhilam'], history: [{ sutraId: 'nikhilam', difficulty: 'beginner', section: 'theory', at: '' }] }
    expect(sutraStatus(SUTRAS, 0, viewedOnly, false)).toBe('available')
    expect(isUnlocked(SUTRAS, index('urdhva'), viewedOnly, false)).toBe(false)
  })

  it('reports in progress and mastered states', () => {
    const state = withMastery({ nikhilam: { beginner: true, intermediate: true, advanced: true }, urdhva: { beginner: true, intermediate: false, advanced: false } })
    expect(sutraStatus(SUTRAS, 0, state, false)).toBe('mastered')
    expect(sutraStatus(SUTRAS, index('urdhva'), state, false)).toBe('in_progress')
    expect(sutraStatus(SUTRAS, index('ekadhikena'), state, false)).toBe('available')
    expect(currentSutraIndex(SUTRAS, state, false)).toBe(index('ekadhikena'))
  })

  it('Sutras without a lesson are always coming soon', () => {
    expect(sutraStatus(SUTRAS, index('paravartya'), EMPTY_PROGRESS, true)).toBe('coming_soon')
  })

  it('admins bypass progression locks', () => {
    expect(sutraStatus(SUTRAS, index('ekadhikena'), EMPTY_PROGRESS, true)).toBe('available')
  })
})

describe('games', () => {
  it('unlock per Sutra and level only after that practice is passed', () => {
    const state = withMastery({ nikhilam: { beginner: true, intermediate: false, advanced: false } })
    expect(isGameUnlocked(state, 'nikhilam', 'beginner', false)).toBe(true)
    expect(isGameUnlocked(state, 'nikhilam', 'intermediate', false)).toBe(false)
    expect(isGameUnlocked(state, 'urdhva', 'beginner', false)).toBe(false)
    expect(isGameUnlocked(EMPTY_PROGRESS, 'urdhva', 'advanced', true)).toBe(true)
  })
})
