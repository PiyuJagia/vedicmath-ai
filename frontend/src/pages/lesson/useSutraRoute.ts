import { useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { LESSON_CONTENT, type SutraLessonContent } from '../../content/lessons'
import { SUTRAS, findSutra, type SutraInfo } from '../../content/sutras'
import { sutraStatus, type SutraStatus } from '../../services/progressModel'
import { useProgress } from '../../services/ProgressContext'
import { useSettings } from '../../services/SettingsContext'
import { DIFFICULTIES, type Difficulty } from '../../types/learning'

export interface SutraRoute {
  sutra: SutraInfo | undefined
  content: SutraLessonContent | undefined
  status: SutraStatus | undefined
  difficulty: Difficulty
  setDifficulty: (difficulty: Difficulty) => void
  levelQuery: string
}

export function useSutraRoute(): SutraRoute {
  const { sutraId } = useParams()
  const [search, setSearch] = useSearchParams()
  const { progress } = useProgress()
  const { settings } = useSettings()

  const sutra = findSutra(sutraId)
  const index = sutra ? SUTRAS.indexOf(sutra) : -1
  const status = index >= 0 ? sutraStatus(SUTRAS, index, progress, settings.role === 'admin') : undefined
  const requested = search.get('level')
  const difficulty: Difficulty = DIFFICULTIES.includes(requested as Difficulty) ? (requested as Difficulty) : 'beginner'

  const setDifficulty = useCallback(
    (level: Difficulty) =>
      setSearch(
        (current) => {
          const next = new URLSearchParams(current)
          next.set('level', level)
          return next
        },
        { replace: true },
      ),
    [setSearch],
  )

  return {
    sutra,
    content: sutra?.lessonId ? LESSON_CONTENT[sutra.lessonId] : undefined,
    status,
    difficulty,
    setDifficulty,
    levelQuery: `?level=${difficulty}`,
  }
}
