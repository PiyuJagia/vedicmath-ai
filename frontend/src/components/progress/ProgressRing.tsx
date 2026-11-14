import styles from './ProgressRing.module.css'

interface ProgressRingProps {
  value: number
  total: number
  /** Unit shown under the fraction, for example "Sutras". */
  unit: string
  size?: number
}

export function ProgressRing({ value, total, unit, size = 132 }: ProgressRingProps) {
  const stroke = 12
  const radius = (100 - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const share = total > 0 ? Math.min(Math.max(value / total, 0), 1) : 0

  return (
    <div className={styles.ring} style={{ width: size, height: size }} role="img" aria-label={`${value} of ${total} ${unit}`}>
      <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <circle cx="50" cy="50" r={radius} className={styles.track} strokeWidth={stroke} />
        <circle
          cx="50"
          cy="50"
          r={radius}
          className={styles.value}
          strokeWidth={stroke}
          strokeDasharray={`${circumference * share} ${circumference}`}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className={styles.label} aria-hidden="true">
        <span className={`${styles.fraction} numerals`}>
          {value}/{total}
        </span>
        <span className={styles.unit}>{unit}</span>
      </div>
    </div>
  )
}
