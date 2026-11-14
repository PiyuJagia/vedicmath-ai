import type { ReactNode } from 'react'
import { DIFFICULTIES, DIFFICULTY_LABELS, type LevelMastery } from '../../types/learning'
import styles from './MasteryRings.module.css'

interface MasteryRingsProps {
  mastery: LevelMastery
  /** Used in the accessible description, for example "Nikhilam". */
  subject: string
  size?: number
  /** Optional symbol drawn in the middle, such as a Sutra icon. */
  children?: ReactNode
}

// Outer ring is Beginner, inner ring is Advanced.
const RADII = { beginner: 46, intermediate: 38, advanced: 30 } as const

export function MasteryRings({ mastery, subject, size = 72, children }: MasteryRingsProps) {
  const description = DIFFICULTIES.map(
    (level) => `${DIFFICULTY_LABELS[level]} ${mastery[level] ? 'passed' : 'not yet passed'}`,
  ).join(', ')

  return (
    <div className={styles.rings} style={{ width: size, height: size }} role="img" aria-label={`${subject} mastery: ${description}`}>
      <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        {DIFFICULTIES.map((level) => (
          <circle
            key={level}
            cx="50"
            cy="50"
            r={RADII[level]}
            className={styles.ring}
            data-level={level}
            data-passed={mastery[level]}
          />
        ))}
      </svg>
      {children && <div className={styles.center}>{children}</div>}
    </div>
  )
}

export function MasteryLegend() {
  return (
    <ul className={styles.legend}>
      {DIFFICULTIES.map((level) => (
        <li key={level}>
          <span className={styles.swatch} data-level={level} aria-hidden="true" />
          {DIFFICULTY_LABELS[level]}
        </li>
      ))}
    </ul>
  )
}
