import { Outlet } from 'react-router'
import { SAMPLE_PROFILE } from '../../content/sampleProfile'
import { useSettings } from '../../services/SettingsContext'
import { AVATAR_COLOURS } from '../../services/settingsModel'
import { LotusLogo } from '../brand/LotusLogo'
import { Landscape } from './Landscape'
import { MobileTabBar } from './MobileTabBar'
import { TopNav } from './TopNav'
import styles from './AppShell.module.css'

export function AppShell() {
  const { settings } = useSettings()
  const name = settings.displayName.trim() || SAMPLE_PROFILE.displayName
  const profile = {
    ...SAMPLE_PROFILE,
    displayName: name,
    avatarInitial: name.charAt(0).toUpperCase(),
    avatarColour: AVATAR_COLOURS[settings.avatar],
  }

  return (
    <div className={styles.shell}>
      <a href="#main-content" className={styles.skipLink}>
        Skip to content
      </a>
      <TopNav profile={profile} />
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
