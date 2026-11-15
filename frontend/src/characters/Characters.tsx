import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { useSettings } from '../services/SettingsContext'
import { useCharacterStage } from './CharacterContext'
import { CHARACTERS, type CharacterId } from './registry'
import styles from './Characters.module.css'

export type CoachMood = 'idle' | 'speaking' | 'thinking' | 'listening' | 'encouraging' | 'celebrating' | 'correcting'

const MOOD_LABEL: Record<CoachMood, string> = {
  idle: '',
  speaking: 'speaking',
  thinking: 'thinking',
  listening: 'listening',
  encouraging: 'encouraging you',
  celebrating: 'celebrating',
  correcting: 'helping you fix a step',
}

/** Gentle float for the coach; small mood changes on top of it. */
function coachMotion(mood: CoachMood, reduced: boolean) {
  if (reduced) return { y: 0, rotate: 0, scale: 1 }
  switch (mood) {
    case 'celebrating':
      return { y: [0, -14, 0, -8, 0], rotate: 0, scale: [1, 1.03, 1] }
    case 'thinking':
      return { y: [0, -4, 0], rotate: [0, -2, 0], scale: 1 }
    case 'correcting':
      return { y: [0, -3, 0], rotate: [0, 2, -1, 0], scale: 1 }
    case 'encouraging':
      return { y: [0, -6, 0], rotate: 0, scale: [1, 1.02, 1] }
    default:
      return { y: [0, -6, 0], rotate: 0, scale: 1 }
  }
}

export function CoachCharacter({ mood = 'idle', size = 240, className }: { mood?: CoachMood; size?: number; className?: string }) {
  const { reducedMotion } = useSettings()
  const character = CHARACTERS.boy
  return (
    <figure className={`${styles.figure} ${className ?? ''}`} style={{ width: size }} data-mood={mood}>
      <motion.img
        src={character.image}
        alt={`${character.alt}${MOOD_LABEL[mood] ? `, ${MOOD_LABEL[mood]}` : ''}`}
        className={`${styles.art} ${styles.coachArt}`}
        animate={coachMotion(mood, reducedMotion)}
        transition={{ duration: mood === 'celebrating' ? 1.4 : 4, repeat: mood === 'celebrating' || reducedMotion ? 0 : Infinity, ease: 'easeInOut' }}
        draggable={false}
      />
      {mood === 'thinking' && (
        <span className={styles.thinking} aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      )}
      {mood === 'celebrating' && <span className={styles.sparkle} aria-hidden="true" />}
    </figure>
  )
}

export function HummingbirdCompanion({ size = 96, celebrating = false, className }: { size?: number; celebrating?: boolean; className?: string }) {
  const { reducedMotion } = useSettings()
  const character = CHARACTERS.hummingbird
  return (
    <motion.img
      src={character.image}
      alt={character.alt}
      style={{ width: size }}
      className={`${styles.art} ${styles.bird} ${className ?? ''}`}
      animate={reducedMotion ? { y: 0, x: 0 } : celebrating ? { y: [0, -18, 0, -10, 0], x: [0, 12, 0] } : { y: [0, -5, 0] }}
      transition={{ duration: celebrating ? 1.6 : 2.2, repeat: reducedMotion || celebrating ? 0 : Infinity, ease: 'easeInOut' }}
      draggable={false}
    />
  )
}

export type RabbitState = 'hidden' | 'present'

/**
 * The rabbit hops into its own reserved space, so it never shifts the layout
 * or covers numbers and answer fields.
 */
export function RabbitAssistant({
  state,
  size = 92,
  onSelect,
  label = 'Ask the rabbit for a hint',
  hopIn = true,
}: {
  state: RabbitState
  size?: number
  onSelect?: () => void
  label?: string
  /** False when the rabbit is simply part of the screen from the start. */
  hopIn?: boolean
}) {
  const { reducedMotion } = useSettings()
  const character = CHARACTERS.rabbit
  const image = <img src={character.image} alt="" className={styles.art} draggable={false} />

  return (
    <div className={styles.rabbitSpace} style={{ width: size, height: size * 1.4 }}>
      <AnimatePresence initial={hopIn}>
        {state === 'present' && (
          <motion.div
            key="rabbit"
            className={styles.rabbit}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 70, y: 0 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, x: [70, 35, 0], y: [0, -28, 0] }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: [0, 35, 70], y: [0, -28, 0] }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            {onSelect ? (
              <button type="button" className={styles.rabbitButton} onClick={onSelect} aria-label={label}>
                {image}
              </button>
            ) : (
              <img src={character.image} alt={character.alt} className={styles.art} draggable={false} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** A speech bubble that only renders for the screen's primary speaker. */
export function CharacterDialogue({
  character,
  children,
  tail = 'left',
  live = true,
  demo = false,
}: {
  character: CharacterId
  children: ReactNode
  tail?: 'left' | 'bottom' | 'none'
  live?: boolean
  demo?: boolean
}) {
  const stage = useCharacterStage()
  if (!stage.canSpeak(character)) return null
  const identity = CHARACTERS[character]
  return (
    <div className={styles.bubble} data-tail={tail} data-character={character}>
      <span className="visually-hidden">{identity.name} says: </span>
      <div aria-live={live ? 'polite' : undefined}>{children}</div>
      {demo && <span className={styles.demoTag}>Lesson coach (scripted) · Ask Rishi for live help</span>}
    </div>
  )
}

/** The rabbit's hint bubble in Practice; it is a requested hint, not conversation. */
export function HintBubble({ level, total, children, onClose }: { level: number; total: number; children: ReactNode; onClose: () => void }) {
  return (
    <div className={styles.hint} role="status">
      <div className={styles.hintHeader}>
        <span>
          Hint {level} of {total}
        </span>
        <button type="button" onClick={onClose} aria-label="Close hint">
          ×
        </button>
      </div>
      <p>{children}</p>
    </div>
  )
}