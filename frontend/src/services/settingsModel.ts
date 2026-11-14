export type ReduceMotionSetting = 'system' | 'on' | 'off'
export type Role = 'learner' | 'admin'

export interface Settings {
  displayName: string
  avatar: number
  age: number | null
  learningStyle: 'watch' | 'try' | 'play'
  animationSpeed: 0.75 | 1 | 1.5
  reduceMotion: ReduceMotionSetting
  soundEffects: boolean
  petSounds: boolean
  largerText: boolean
  highContrast: boolean
  dailyGoal: 5 | 10 | 15
  /** Development switch; production roles will come from the backend. */
  role: Role
}

export const DEFAULT_SETTINGS: Settings = {
  displayName: 'Arjun',
  avatar: 0,
  age: null,
  learningStyle: 'watch',
  animationSpeed: 1,
  reduceMotion: 'system',
  soundEffects: false,
  petSounds: false,
  largerText: false,
  highContrast: false,
  dailyGoal: 10,
  role: 'learner',
}

export const AVATAR_COLOURS = ['#2f9f9a', '#8e7fd6', '#d9952a', '#5b8fd6', '#d77a9c', '#6aa36f', '#573b9c', '#c76b4a']

export function resolveReducedMotion(setting: ReduceMotionSetting, systemPrefersReduced: boolean): boolean {
  if (setting === 'on') return true
  if (setting === 'off') return false
  return systemPrefersReduced
}
