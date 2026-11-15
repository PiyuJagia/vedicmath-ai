import { useEffect, useState, type FormEvent } from 'react'
import { MessageCircle, Send } from 'lucide-react'
import type { CoachLearningContext } from '../../api/coachTypes'
import { CharacterDialogue, CoachCharacter, HummingbirdCompanion, RabbitAssistant } from '../../characters/Characters'
import type { CharacterId } from '../../characters/registry'
import { useLiveCoach } from '../../services/LiveCoachContext'
import { Button } from '../ui/Button'
import styles from './LiveCoachAsk.module.css'

function speakerFigure(speaker: CharacterId, size = 72) {
  if (speaker === 'rabbit') return <RabbitAssistant state="present" size={Math.round(size * 0.7)} hopIn={false} />
  if (speaker === 'hummingbird') return <HummingbirdCompanion size={Math.round(size * 0.6)} />
  return <CoachCharacter mood="speaking" size={size} />
}

type Props = {
  context: CoachLearningContext
  /** Compact under Theory coach row; roomier in Practice panel. */
  density?: 'compact' | 'panel'
  className?: string
}

/**
 * Persistent ask box wired through LiveCoachProvider → /coach/chat (ADK).
 * Does not drive animation playback — lesson stages stay engine-owned.
 */
export function LiveCoachAsk({ context, density = 'compact', className }: Props) {
  const { enabled, busy, error, sessionReady, history, ask, setContextPatch, clearError } = useLiveCoach()
  const [open, setOpen] = useState(density === 'panel')
  const [draft, setDraft] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    setContextPatch(context)
  }, [context, setContextPatch])

  if (!enabled) return null

  const lastCoach = [...history].reverse().find((item) => item.role === 'coach')
  const speaker: CharacterId =
    lastCoach?.characterId === 'rabbit'
      ? 'rabbit'
      : lastCoach?.characterId === 'hummingbird'
        ? 'hummingbird'
        : 'boy'

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const message = draft.trim()
    if (!message || busy) return
    setLocalError(null)
    clearError()
    setDraft('')
    const reply = await ask({
      message,
      intent: 'freeform',
      context,
    })
    if (reply.error || !reply.isLive) {
      setLocalError(reply.error ?? 'The coach could not reply. Maths practice still works — try Ask again.')
    }
  }

  const shownError = localError ?? error

  return (
    <div className={`${styles.root} ${styles[density]} ${className ?? ''}`} data-testid="live-coach-ask">
      {density === 'compact' && (
        <Button
          type="button"
          variant="secondary"
          onClick={() => setOpen((value) => !value)}
          icon={<MessageCircle size={16} aria-hidden="true" />}
          iconPosition="start"
          data-testid="live-coach-toggle"
        >
          {open ? 'Hide Rishi' : 'Ask Rishi'}
        </Button>
      )}

      {(open || density === 'panel') && (
        <div className={styles.panel} data-testid="live-coach-panel">
          {density === 'panel' && <h3 className={styles.heading}>Ask Rishi</h3>}
          <p className={styles.note}>Rishi · live AI coach · maths verified by Python tools</p>

          {lastCoach && (
            <div
              className={styles.reply}
              data-testid="live-coach-reply"
              data-reply-id={lastCoach.id}
              data-character={speaker}
            >
              <div className={styles.figure}>{speakerFigure(speaker, density === 'panel' ? 88 : 64)}</div>
              <CharacterDialogue character={speaker}>{lastCoach.text}</CharacterDialogue>
            </div>
          )}

          {shownError && (
            <p className={styles.error} role="alert">
              {shownError}
            </p>
          )}

          <form className={styles.form} onSubmit={submit}>
            <label htmlFor={`live-coach-input-${context.screen}`} className="visually-hidden">
              Ask the AI coach
            </label>
            <input
              id={`live-coach-input-${context.screen}`}
              data-testid="live-coach-input"
              className={styles.input}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={sessionReady ? 'Ask Rishi…' : 'Connecting…'}
              disabled={busy || !sessionReady}
              autoComplete="off"
            />
            <Button
              type="submit"
              disabled={busy || !sessionReady || !draft.trim()}
              data-testid="live-coach-send"
              icon={<Send size={16} aria-hidden="true" />}
            >
              {busy ? '…' : 'Ask'}
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}
