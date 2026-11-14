import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react'
import type { Playback } from '../playback'
import type { Timeline } from '../types'
import styles from './Player.module.css'

const SPEEDS = [0.5, 1, 1.5, 2] as const

interface AnimationControlsProps {
  timeline: Timeline
  playback: Playback
  speed: number
  onSpeedChange: (speed: number) => void
}

export function AnimationControls({ timeline, playback, speed, onSpeedChange }: AnimationControlsProps) {
  const frame = timeline.frames[playback.index]
  const stepNumber = timeline.steps.findIndex((step) => step.id === frame.stepId) + 1
  const last = Math.min(playback.limit, playback.frameCount - 1)

  return (
    <div className={styles.controls}>
      <p className={styles.counter} aria-live="polite">
        Step {stepNumber} of {timeline.steps.length}
        <span className={styles.subCounter}>
          {' '}
          · moment {playback.index + 1} of {timeline.frames.length}
        </span>
      </p>
      <div className={styles.buttons} role="group" aria-label="Animation controls">
        <button type="button" onClick={playback.previous} disabled={playback.index === 0} aria-label="Previous">
          <SkipBack size={18} aria-hidden="true" />
        </button>
        {playback.playing ? (
          <button type="button" onClick={playback.pause} aria-label="Pause" className={styles.primary}>
            <Pause size={18} aria-hidden="true" />
          </button>
        ) : (
          <button type="button" onClick={playback.play} aria-label="Play" className={styles.primary} disabled={last === 0}>
            <Play size={18} aria-hidden="true" />
          </button>
        )}
        <button type="button" onClick={playback.next} disabled={playback.index >= last} aria-label="Next">
          <SkipForward size={18} aria-hidden="true" />
        </button>
        <button type="button" onClick={playback.restart} aria-label="Restart" disabled={last === 0}>
          <RotateCcw size={18} aria-hidden="true" />
        </button>
        <label className={styles.speed}>
          <span className="visually-hidden">Playback speed</span>
          <select value={speed} onChange={(event) => onSpeedChange(Number(event.target.value))}>
            {SPEEDS.map((value) => (
              <option key={value} value={value}>
                {value}×
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
