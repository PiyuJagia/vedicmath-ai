import { useEffect, useState, type FormEvent } from 'react'
import { MessageCircle, Send } from 'lucide-react'
import { ApiError } from '../../api/client'
import {
  ensureCoachSession,
  loadCoachChatHistory,
  mapCoachCharacter,
  saveCoachChatHistory,
  sendCoachChat,
} from '../../api/coachClient'
import type { CoachChatHistoryItem, CoachLearningContext } from '../../api/coachTypes'
import { CharacterDialogue, CoachCharacter, HummingbirdCompanion, RabbitAssistant } from '../../characters/Characters'
import type { CharacterId } from '../../characters/registry'
import { Button } from '../ui/Button'
import styles from './LiveCoachAsk.module.css'

function newHistoryId(): string {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

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
 * Feature-flagged live ADK ask box. Reuses CharacterDialogue + personas.
 * Does not drive animation playback — Theory/Practice stages stay lesson-owned.
 */
export function LiveCoachAsk({ context, density = 'compact', className }: Props) {
  const [open, setOpen] = useState(density === 'panel')
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [history, setHistory] = useState<CoachChatHistoryItem[]>(() => loadCoachChatHistory())

  useEffect(() => {
    let cancelled = false
    ensureCoachSession()
      .then(() => {
        if (!cancelled) setSessionReady(true)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Coach session unavailable.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const lastCoach = [...history].reverse().find((item) => item.role === 'coach')
  const speaker: CharacterId = lastCoach?.characterId ? mapCoachCharacter(lastCoach.characterId) : 'boy'

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const message = draft.trim()
    if (!message || busy) return
    setBusy(true)
    setError(null)
    const learnerItem: CoachChatHistoryItem = {
      id: newHistoryId(),
      role: 'learner',
      text: message,
      at: Date.now(),
    }
    setHistory((prev) => {
      const next = [...prev, learnerItem]
      saveCoachChatHistory(next)
      return next
    })
    setDraft('')
    try {
      const response = await sendCoachChat({ message, context })
      const coachItem: CoachChatHistoryItem = {
        id: newHistoryId(),
        role: 'coach',
        text: response.message.text,
        characterId: response.message.character.id,
        calculationId: response.calculation?.calculation_id,
        result: response.calculation?.result,
        at: Date.now(),
      }
      setHistory((prev) => {
        const next = [...prev, coachItem]
        saveCoachChatHistory(next)
        return next
      })
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'The coach could not reply. Try again.')
    } finally {
      setBusy(false)
    }
  }

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
          <p className={styles.note}>
            Live tutor · same session across Theory &amp; Practice · maths verified by Python tools
          </p>

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

          {error && (
            <p className={styles.error} role="alert">
              {error}
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
            <Button type="submit" disabled={busy || !sessionReady || !draft.trim()} data-testid="live-coach-send" icon={<Send size={16} aria-hidden="true" />}>
              {busy ? '…' : 'Ask'}
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}
