import { Outlet } from 'react-router'
import { SAMPLE_PROFILE } from '../../content/sampleProfile'
import { LotusLogo } from '../brand/LotusLogo'
import { Landscape } from './Landscape'
import { MobileTabBar } from './MobileTabBar'
import { TopNav } from './TopNav'
import styles from './AppShell.module.css'

export function AppShell() {
  return (
    <div className={styles.shell}>
      <a href="#main-content" className={styles.skipLink}>
        Skip to content
      </a>
      <TopNav profile={SAMPLE_PROFILE} />
      <Landscape />
      <main id="main-content" className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>
      <MobileTabBar />
    </div>
  )
}

/** Layout for screens without the main navigation, such as onboarding. */
export function MinimalShell() {
  return (
    <div className={styles.shell}>
      <header className={styles.minimalHeader}>
        <span className={styles.minimalBrand}>
          <LotusLogo className={styles.logo} />
          VedicMath AI
        </span>
      </header>
      <Landscape />
      <main id="main-content" className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  )
}
