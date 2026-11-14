import { Check } from 'lucide-react'
import type { Timeline } from '../types'
import styles from './Player.module.css'

interface StepListProps {
  timeline: Timeline
  index: number
  /** Jump to the first moment of a step. Omit to make the list read-only. */
  onSelect?: (frameIndex: number) => void
  limit?: number
}

export function StepList({ timeline, index, onSelect, limit }: StepListProps) {
  const currentStep = timeline.frames[index].stepId
  const order = timeline.steps.map((step) => step.id)
  const currentPosition = order.indexOf(currentStep)

  return (
    <ol className={styles.steps}>
      {timeline.steps.map((step, position) => {
        const firstFrame = timeline.frames.findIndex((frame) => frame.stepId === step.id)
        const status = position < currentPosition ? 'done' : position === currentPosition ? 'current' : 'upcoming'
        const reachable = onSelect && firstFrame >= 0 && (limit === undefined || firstFrame <= limit)
        const content = (
          <>
            <span className={styles.stepMarker} aria-hidden="true">
              {status === 'done' ? <Check size={14} /> : position + 1}
            </span>
            <span>{step.title}</span>
            <span className="visually-hidden">{status === 'done' ? ', done' : status === 'current' ? ', current step' : ''}</span>
          </>
        )
        return (
          <li key={step.id} data-status={status} aria-current={status === 'current' ? 'step' : undefined}>
            {reachable ? (
              <button type="button" onClick={() => onSelect(firstFrame)}>
                {content}
              </button>
            ) : (
              <div>{content}</div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
