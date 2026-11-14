import { Link, useLocation } from 'react-router'
import { NAV_ITEMS, isNavItemActive } from './navigation'
import styles from './MobileTabBar.module.css'

export function MobileTabBar() {
  const { pathname } = useLocation()

  return (
    <nav aria-label="Main" className={styles.bar}>
      <ul>
        {NAV_ITEMS.map((item) => {
          const active = isNavItemActive(item, pathname)
          const Icon = item.icon
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                className={styles.tab}
                data-active={active}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
                <span>{item.shortLabel}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
