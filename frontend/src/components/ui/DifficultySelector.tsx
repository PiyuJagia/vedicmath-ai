import { useId } from 'react'
import { DIFFICULTIES, DIFFICULTY_LABELS, type Difficulty } from '../../types/learning'
import styles from './DifficultySelector.module.css'

interface DifficultySelectorProps {
  value: Difficulty
  onChange: (difficulty: Difficulty) => void
  label?: string
  /** Levels that cannot be chosen yet, for example because they are locked. */
  disabledLevels?: Difficulty[]
}

export function DifficultySelector({
  value,
  onChange,
  label = 'Difficulty',
  disabledLevels = [],
}: DifficultySelectorProps) {
  const name = useId()

  return (
    <fieldset className={styles.group}>
      <legend className="visually-hidden">{label}</legend>
      {DIFFICULTIES.map((level) => {
        const disabled = disabledLevels.includes(level)
        return (
          <label key={level} className={styles.option} data-checked={value === level} data-disabled={disabled}>
            <input
              type="radio"
              name={name}
              value={level}
              checked={value === level}
              disabled={disabled}
              onChange={() => onChange(level)}
              className={styles.input}
            />
            <span>{DIFFICULTY_LABELS[level]}</span>
          </label>
        )
      })}
    </fieldset>
  )
}
