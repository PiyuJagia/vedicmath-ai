import type { ReactNode } from 'react'
import styles from './Pill.module.css'

export type PillTone = 'neutral' | 'lavender' | 'purple' | 'teal' | 'gold' | 'locked'

interface PillProps {
  tone?: PillTone
  icon?: ReactNode
  children: ReactNode
  className?: string
}

export function Pill({ tone = 'neutral', icon, children, className }: PillProps) {
  return (
    <span className={[styles.pill, styles[tone], className].filter(Boolean).join(' ')}>
      {icon && <span className={styles.icon}>{icon}</span>}
      {children}
    </span>
  )
}
