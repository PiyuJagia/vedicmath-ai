import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import styles from './Breadcrumbs.module.css'

export interface Crumb {
  label: string
  /** Omit for the current page. */
  to?: string
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className={styles.breadcrumbs}>
      <ol>
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={`${item.label}-${index}`}>
              {item.to && !isLast ? (
                <Link to={item.to}>{item.label}</Link>
              ) : (
                <span aria-current={isLast ? 'page' : undefined}>{item.label}</span>
              )}
              {!isLast && <ChevronRight size={14} aria-hidden="true" className={styles.separator} />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
