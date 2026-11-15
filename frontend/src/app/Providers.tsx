import type { ReactNode } from 'react'
import { LiveCoachProvider } from '../services/LiveCoachContext'
import { ProgressProvider } from '../services/ProgressContext'
import { SettingsProvider } from '../services/SettingsContext'
import type { Settings } from '../services/settingsModel'
import type { ProgressState } from '../services/progressModel'

export function Providers({
  children,
  settings,
  progress,
}: {
  children: ReactNode
  /** Tests pass fixed values so nothing is read from the browser. */
  settings?: Partial<Settings>
  progress?: ProgressState
}) {
  return (
    <SettingsProvider initial={settings}>
      <ProgressProvider initial={progress}>
        <LiveCoachProvider>{children}</LiveCoachProvider>
      </ProgressProvider>
    </SettingsProvider>
  )
}
