import type { HTMLAttributes, ReactNode } from 'react'
import styles from './Card.module.css'

type Tone = 'white' | 'lavender' | 'blue'

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: 'div' | 'section' | 'article' | 'aside'
  tone?: Tone
  padding?: 'md' | 'lg'
  children: ReactNode
}

export function Card({ as: Element = 'div', tone = 'white', padding = 'md', className, children, ...rest }: CardProps) {
  const classes = [styles.card, styles[tone], styles[padding], className].filter(Boolean).join(' ')
  return (
    <Element className={classes} {...rest}>
      {children}
    </Element>
  )
}
