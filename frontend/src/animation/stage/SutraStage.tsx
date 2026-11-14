import { useSettings } from '../../services/SettingsContext'
import type { Timeline } from '../types'
import { EkadhikenaStage } from './EkadhikenaStage'
import { NikhilamStage } from './NikhilamStage'
import { UrdhvaStage } from './UrdhvaStage'

interface SutraStageProps {
  timeline: Timeline
  index: number
  /** Playback speed multiplier; values travel faster at higher speeds. */
  speed?: number
}

export function SutraStage({ timeline, index, speed = 1 }: SutraStageProps) {
  const { reducedMotion, settings } = useSettings()
  const moveDuration = 1.1 / (speed * settings.animationSpeed)

  switch (timeline.kind) {
    case 'nikhilam':
      return (
        <NikhilamStage
          frame={timeline.frames[index]}
          numbers={timeline.display}
          reducedMotion={reducedMotion}
          moveDuration={moveDuration}
        />
      )
    case 'urdhva':
      return <UrdhvaStage frame={timeline.frames[index]} reducedMotion={reducedMotion} moveDuration={moveDuration} />
    case 'ekadhikena':
      return (
        <EkadhikenaStage
          frame={timeline.frames[index]}
          previousValue={timeline.display.previous}
          lastDigit={timeline.display.lastDigit}
          nextValue={timeline.display.next}
          reducedMotion={reducedMotion}
          moveDuration={moveDuration}
        />
      )
  }
}
