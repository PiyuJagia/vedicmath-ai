import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router'
import styles from './Button.module.css'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'md' | 'lg'

interface CommonProps {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  iconPosition?: 'start' | 'end'
  children: ReactNode
  className?: string
}

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & { to?: undefined }

type ButtonAsLink = CommonProps & { to: string }

export type ButtonProps = ButtonAsButton | ButtonAsLink

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'end',
  children,
  className,
  ...rest
}: ButtonProps) {
  const classes = [styles.button, styles[variant], styles[size], className].filter(Boolean).join(' ')
  const content = (
    <>
      {icon && iconPosition === 'start' && <span className={styles.icon}>{icon}</span>}
      <span>{children}</span>
      {icon && iconPosition === 'end' && <span className={styles.icon}>{icon}</span>}
    </>
  )

  if (rest.to !== undefined) {
    return (
      <Link to={rest.to} className={classes}>
        {content}
      </Link>
    )
  }

  const buttonProps = rest as ButtonHTMLAttributes<HTMLButtonElement>
  return (
    <button {...buttonProps} type={buttonProps.type ?? 'button'} className={classes}>
      {content}
    </button>
  )
}
