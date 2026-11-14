import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { MotionConfig } from 'motion/react'
import { loadStored, saveStored } from './storage'
import { DEFAULT_SETTINGS, resolveReducedMotion, type Settings } from './settingsModel'

interface SettingsContextValue {
  settings: Settings
  update: (changes: Partial<Settings>) => void
  reducedMotion: boolean
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

function useSystemReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)'
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches)
  useEffect(() => {
    const list = window.matchMedia?.(query)
    if (!list) return
    const onChange = () => setMatches(list.matches)
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [])
  return matches
}

export function SettingsProvider({ children, initial }: { children: ReactNode; initial?: Partial<Settings> }) {
  const [settings, setSettings] = useState<Settings>(() =>
    initial ? { ...DEFAULT_SETTINGS, ...initial } : loadStored('settings', DEFAULT_SETTINGS),
  )
  const systemReduced = useSystemReducedMotion()
  const reducedMotion = resolveReducedMotion(settings.reduceMotion, systemReduced)

  const update = useCallback((changes: Partial<Settings>) => {
    setSettings((current) => {
      const next = { ...current, ...changes }
      saveStored('settings', next)
      return next
    })
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.largeText = String(settings.largerText)
    root.dataset.highContrast = String(settings.highContrast)
    root.dataset.reduceMotion = String(reducedMotion)
  }, [settings.largerText, settings.highContrast, reducedMotion])

  const value = useMemo(() => ({ settings, update, reducedMotion }), [settings, update, reducedMotion])

  return (
    <SettingsContext.Provider value={value}>
      <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'}>{children}</MotionConfig>
    </SettingsContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext)
  if (!value) throw new Error('useSettings must be used inside SettingsProvider')
  return value
}
