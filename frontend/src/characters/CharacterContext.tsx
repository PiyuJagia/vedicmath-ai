import { createContext, useContext, type ReactNode } from 'react'
import { SCREEN_ROLES, type CharacterId, type ScreenId } from './registry'

interface CharacterStage {
  screen: ScreenId
  primary: CharacterId
  secondary: CharacterId[]
  /** True only for the one character allowed to speak on this screen. */
  canSpeak: (character: CharacterId) => boolean
}

const CharacterContext = createContext<CharacterStage | null>(null)

/** Declares which screen is showing, so characters know who may speak. */
export function CharacterOrchestrator({ screen, children }: { screen: ScreenId; children: ReactNode }) {
  const roles = SCREEN_ROLES[screen]
  const value: CharacterStage = {
    screen,
    primary: roles.primary,
    secondary: roles.secondary,
    canSpeak: (character) =>
      screen === 'coach_handoff'
        ? character === roles.primary || roles.secondary.includes(character)
        : character === roles.primary,
  }
  return <CharacterContext.Provider value={value}>{children}</CharacterContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCharacterStage(): CharacterStage {
  const value = useContext(CharacterContext)
  if (!value) throw new Error('Characters must be placed inside a CharacterOrchestrator')
  return value
}
