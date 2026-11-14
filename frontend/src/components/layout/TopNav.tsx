import { ChevronDown } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import type { LearnerProfile } from '../../types/learning'
import { LotusLogo } from '../brand/LotusLogo'
import { NAV_ITEMS, isNavItemActive } from './navigation'
import styles from './TopNav.module.css'

interface TopNavProps {
  profile: LearnerProfile
}

export function TopNav({ profile }: TopNavProps) {
  const { pathname } = useLocation()

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand}>
          <LotusLogo className={styles.logo} />
          <span>VedicMath AI</span>
        </Link>

        <nav aria-label="Main" className={styles.nav}>
          <ul>
            {NAV_ITEMS.map((item) => {
              const active = isNavItemActive(item, pathname)
              const Icon = item.icon
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={styles.link}
                    data-active={active}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <Link
          to="/settings"
          className={styles.profile}
          title={profile.isSample ? 'Sample profile for development' : undefined}
        >
          <span className={styles.avatar} style={profile.avatarColour ? { background: profile.avatarColour } : undefined} aria-hidden="true">
            {profile.avatarInitial}
          </span>
          <span className={styles.name}>{profile.displayName}</span>
          <ChevronDown size={16} aria-hidden="true" className={styles.chevron} />
          <span className="visually-hidden">, open profile settings</span>
        </Link>
      </div>
    </header>
  )
}
