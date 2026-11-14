import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Difficulty } from '../types/learning'
import { EMPTY_PROGRESS, NO_MASTERY, SAMPLE_PROGRESS, type LessonSection, type ProgressState } from './progressModel'
import { loadStored, saveStored } from './storage'

interface ProgressContextValue {
  progress: ProgressState
  recordVisit: (sutraId: string, difficulty: Difficulty, section: LessonSection) => void
  passLevel: (sutraId: string, difficulty: Difficulty) => void
  reset: (to: 'sample' | 'empty') => void
}

const ProgressContext = createContext<ProgressContextValue | null>(null)

export function ProgressProvider({ children, initial }: { children: ReactNode; initial?: ProgressState }) {
  const [progress, setProgress] = useState<ProgressState>(() => initial ?? loadStored('progress', SAMPLE_PROGRESS))

  const commit = useCallback((change: (state: ProgressState) => ProgressState) => {
    setProgress((current) => {
      const next = change(current)
      saveStored('progress', next)
      return next
    })
  }, [])

  const recordVisit = useCallback(
    (sutraId: string, difficulty: Difficulty, section: LessonSection) =>
      commit((state) => {
        const latest = state.history[0]
        const repeat = latest && latest.sutraId === sutraId && latest.section === section && latest.difficulty === difficulty
        if (repeat && state.explored.includes(sutraId)) return state
        return {
          ...state,
          explored: state.explored.includes(sutraId) ? state.explored : [...state.explored, sutraId],
          history: repeat ? state.history : [{ sutraId, difficulty, section, at: new Date().toISOString() }, ...state.history].slice(0, 20),
        }
      }),
    [commit],
  )

  const passLevel = useCallback(
    (sutraId: string, difficulty: Difficulty) =>
      commit((state) => ({
        ...state,
        mastery: { ...state.mastery, [sutraId]: { ...(state.mastery[sutraId] ?? NO_MASTERY), [difficulty]: true } },
      })),
    [commit],
  )

  const reset = useCallback((to: 'sample' | 'empty') => commit(() => (to === 'sample' ? SAMPLE_PROGRESS : EMPTY_PROGRESS)), [commit])

  const value = useMemo(() => ({ progress, recordVisit, passLevel, reset }), [progress, recordVisit, passLevel, reset])
  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProgress(): ProgressContextValue {
  const value = useContext(ProgressContext)
  if (!value) throw new Error('useProgress must be used inside ProgressProvider')
  return value
}
