import coachBoy from '../assets/characters/coach-boy.png'
import hummingbird from '../assets/characters/hummingbird.png'
import rabbit from '../assets/characters/rabbit.png'

export type CharacterId = 'boy' | 'rabbit' | 'hummingbird'

export interface CharacterIdentity {
  id: CharacterId
  name: string
  role: string
  image: string
  alt: string
}

/** Artwork is cut from the approved designs in design-references/. */
export const CHARACTERS: Record<CharacterId, CharacterIdentity> = {
  boy: {
    id: 'boy',
    name: 'Coach',
    role: 'Main teacher',
    image: coachBoy,
    alt: 'The coach: a young boy with dark hair, a cream outfit and a lavender sash, sitting cross-legged in front of a soft golden halo',
  },
  rabbit: {
    id: 'rabbit',
    name: 'Rabbit',
    role: 'Visual helper and hints',
    image: rabbit,
    alt: 'A soft white rabbit',
  },
  hummingbird: {
    id: 'hummingbird',
    name: 'Hummingbird',
    role: 'Progress companion',
    image: hummingbird,
    alt: 'A teal and lavender hummingbird',
  },
}

export type ScreenId = 'onboarding' | 'home' | 'theory' | 'learn' | 'practice' | 'play' | 'progress' | 'explore' | 'overview' | 'settings'

/** Who speaks on each screen. Only the primary speaker shows dialogue. */
export const SCREEN_ROLES: Record<ScreenId, { primary: CharacterId; secondary: CharacterId[] }> = {
  onboarding: { primary: 'boy', secondary: ['rabbit'] },
  home: { primary: 'boy', secondary: ['hummingbird'] },
  theory: { primary: 'boy', secondary: [] },
  learn: { primary: 'rabbit', secondary: ['hummingbird'] },
  practice: { primary: 'boy', secondary: ['rabbit'] },
  play: { primary: 'hummingbird', secondary: ['rabbit'] },
  progress: { primary: 'hummingbird', secondary: [] },
  explore: { primary: 'hummingbird', secondary: [] },
  overview: { primary: 'boy', secondary: ['hummingbird'] },
  settings: { primary: 'hummingbird', secondary: [] },
}
