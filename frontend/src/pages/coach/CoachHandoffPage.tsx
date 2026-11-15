import { useEffect, useState } from 'react'
import { Play, Send } from 'lucide-react'
import { AnimationControls } from '../../animation/player/AnimationControls'
import { usePlayback } from '../../animation/playback'
import { SutraStage } from '../../animation/stage/SutraStage'
import type { Timeline } from '../../animation/types'
import { ApiError } from '../../api/client'
import {
  clearCoachSession,
  createCoachCalculation,
  ensureCoachSession,
  isCoachHandoffEnabled,
  loadCoachChatHistory,
  mapCoachCharacter,
  resolveCoachAnimation,
  saveCoachChatHistory,
  sendCoachChat,
} from '../../api/coachClient'
import type {
  CoachChatHistoryItem,
  CoachChatResponse,
  CoachHandoffResponse,
  UiAction,
  VerifiedCalculationRef,
} from '../../api/coachTypes'
import { resolveHandoffLesson } from '../../api/handoffLesson'
import { CharacterOrchestrator } from '../../characters/CharacterContext'
import {
  CharacterDialogue,
  CoachCharacter,
  HummingbirdCompanion,
  RabbitAssistant,
} from '../../characters/Characters'
import type { CharacterId } from '../../characters/registry'
import { Breadcrumbs } from '../../components/layout/Breadcrumbs'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Pill } from '../../components/ui/Pill'
import { useSettings } from '../../services/SettingsContext'
import styles from './CoachHandoffPage.module.css'

type StageView =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; timeline: Timeline; calculationId: string }
  | { kind: 'notice'; title: string; body: string }

function speakerFigure(speaker: CharacterId) {
  if (speaker === 'rabbit') return <RabbitAssistant state="present" size={84} hopIn={false} />
  if (speaker === 'hummingbird') return <HummingbirdCompanion size={72} />
  return <CoachCharacter mood="speaking" size={120} />
}

function applyHandoffLesson(payload: NonNullable<CoachHandoffResponse['lesson']>): StageView {
  const resolved = resolveHandoffLesson(payload)
  if (resolved.status === 'ready') {
    return { kind: 'ready', timeline: resolved.timeline, calculationId: resolved.calculationId }
  }
  if (resolved.status === 'unsupported_format') {
    return { kind: 'notice', title: 'Animation stage not ready', body: resolved.message }
  }
  return { kind: 'notice', title: 'Cannot open animation', body: resolved.message }
}

function newHistoryId(): string {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function applyChatResponse(
  response: CoachChatResponse,
  setHandoff: (value: CoachHandoffResponse) => void,
  setCalculation: (value: VerifiedCalculationRef | null) => void,
  setStage: (value: StageView) => void,
) {
  const envelope: CoachHandoffResponse = {
    ok: true,
    message: response.message,
    calculation: response.calculation,
    actions: response.actions,
    lesson: response.lesson,
  }
  setHandoff(envelope)
  if (response.calculation) setCalculation(response.calculation)

  const open = response.actions.find((action) => action.type === 'open_animation')
  if (open && response.lesson) {
    setStage(applyHandoffLesson(response.lesson))
  }
}

export function CoachHandoffPage() {
  const { settings } = useSettings()
  const enabled = isCoachHandoffEnabled(settings.role)

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [history, setHistory] = useState<CoachChatHistoryItem[]>(() => loadCoachChatHistory())
  const [handoff, setHandoff] = useState<CoachHandoffResponse | null>(null)
  const [calculation, setCalculation] = useState<VerifiedCalculationRef | null>(null)
  const [stage, setStage] = useState<StageView>({ kind: 'idle' })

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    ensureCoachSession()
      .then((id) => {
        if (!cancelled) setSessionId(id)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Could not start a coach session.')
      })
    return () => {
      cancelled = true
    }
  }, [enabled])

  useEffect(() => {
    saveCoachChatHistory(history)
  }, [history])

  async function runCalculate() {
    setBusy(true)
    setError(null)
    setStage({ kind: 'idle' })
    try {
      const response = await createCoachCalculation({
        sutra: 'nikhilam',
        difficulty: 'beginner',
        a: 98,
        b: 97,
        offer_watch: true,
        character_id: 'boy_coach',
        text: 'Here is the verified product for 98 × 97.',
      })
      setSessionId(await ensureCoachSession())
      setCalculation(response.calculation)
      setHandoff(response.handoff)
      setHistory((prev) => [
        ...prev,
        {
          id: newHistoryId(),
          role: 'coach',
          text: response.handoff.message.text,
          characterId: response.handoff.message.character.id,
          calculationId: response.calculation.calculation_id,
          result: response.calculation.result,
          at: Date.now(),
        },
      ])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Calculation failed.')
    } finally {
      setBusy(false)
    }
  }

  async function sendChat(message: string, extras?: { animation_intent?: 'open_animation' | 'watch_animation'; calculation_id?: string }) {
    const trimmed = message.trim()
    if (!trimmed) return
    setBusy(true)
    setError(null)
    const learnerItem: CoachChatHistoryItem = {
      id: newHistoryId(),
      role: 'learner',
      text: trimmed,
      at: Date.now(),
    }
    setHistory((prev) => [...prev, learnerItem])
    setDraft('')
    try {
      const response = await sendCoachChat({
        message: trimmed,
        animation_intent: extras?.animation_intent ?? null,
        calculation_id: extras?.calculation_id ?? calculation?.calculation_id ?? null,
      })
      setSessionId(response.session_id)
      applyChatResponse(response, setHandoff, setCalculation, setStage)
      setHistory((prev) => [
        ...prev,
        {
          id: newHistoryId(),
          role: 'coach',
          text: response.message.text,
          characterId: response.message.character.id,
          calculationId: response.calculation?.calculation_id,
          result: response.calculation?.result,
          at: Date.now(),
        },
      ])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The coach could not reply.')
    } finally {
      setBusy(false)
    }
  }

  async function openFromAction(action: UiAction) {
    setBusy(true)
    setError(null)
    setStage({ kind: 'loading' })
    try {
      const resolved = await resolveCoachAnimation({
        calculation_id: action.calculation_id,
        intent: action.type,
        character_id: action.type === 'open_animation' ? 'rabbit' : 'boy_coach',
        text:
          action.type === 'open_animation'
            ? 'Opening the verified animation.'
            : 'Watch the verified animation.',
      })
      setHandoff(resolved)
      if (resolved.calculation) setCalculation(resolved.calculation)
      if (!resolved.lesson) {
        setStage({
          kind: 'notice',
          title: 'No lesson payload',
          body: 'The handoff did not include a verified lesson. Try calculating again.',
        })
        return
      }
      setStage(applyHandoffLesson(resolved.lesson))
    } catch (err) {
      setStage({ kind: 'idle' })
      setError(err instanceof ApiError ? err.message : 'Could not open the animation.')
    } finally {
      setBusy(false)
    }
  }

  async function requestOpenAnimation() {
    if (!calculation) {
      setError('Ask the coach to calculate a problem first so there is a verified calculation_id.')
      return
    }
    await sendChat('Please open the animation for the verified calculation.', {
      animation_intent: 'open_animation',
      calculation_id: calculation.calculation_id,
    })
  }

  if (!enabled) {
    return (
      <div className={styles.page}>
        <div className={styles.gated}>
          <Pill tone="gold">Tollgate 6A</Pill>
          <h1>Live coach chat</h1>
          <p>
            Live coaching is off (<code>VITE_COACH_LIVE=false</code>). Re-enable to use Rishi across Theory,
            Practice, Learn More, and games.
          </p>
        </div>
      </div>
    )
  }

  const watchAction = handoff?.actions.find((action) => action.type === 'watch_animation')
  const speaker = handoff ? mapCoachCharacter(handoff.message.character.id) : 'boy'

  return (
    <CharacterOrchestrator screen="coach_handoff">
      <div className={styles.page} data-testid="coach-handoff-page">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Coach chat (dev)' }]} />
        <div className={styles.header}>
          <Pill tone="purple">Tollgate 6A · live ADK chat</Pill>
          <h1>Coach conversation</h1>
          <p className={styles.lede}>
            Dev harness for Google ADK Rishi. Maths come from deterministic tools; Watch / Open actions are
            backend-authorized. Learner journeys use the same <code>/coach/chat</code> path via LiveCoach.
          </p>
        </div>

        <Card padding="lg" className={styles.chatCard} data-testid="coach-chat-panel">
          <div className={styles.transcript} aria-live="polite">
            {history.length === 0 && (
              <p className={styles.meta}>Try: “What is 98 × 97 with Nikhilam beginner?”</p>
            )}
            {history.map((item) => (
              <div
                key={item.id}
                className={item.role === 'learner' ? styles.learnerBubble : styles.coachBubble}
                data-testid={item.role === 'learner' ? 'chat-learner' : 'chat-coach'}
              >
                {item.role === 'coach' && item.characterId && (
                  <span className={styles.speakerLabel}>{item.characterId.replace('_', ' ')}</span>
                )}
                <p>{item.text}</p>
                {item.result != null && (
                  <span className={styles.meta}>
                    verified {item.result}
                    {item.calculationId ? ` · ${item.calculationId}` : ''}
                  </span>
                )}
              </div>
            ))}
          </div>

          <form
            className={styles.composer}
            onSubmit={(event) => {
              event.preventDefault()
              void sendChat(draft)
            }}
          >
            <label className="visually-hidden" htmlFor="coach-chat-input">
              Message for the coach
            </label>
            <input
              id="coach-chat-input"
              data-testid="coach-chat-input"
              value={draft}
              disabled={busy}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask the coach…"
              autoComplete="off"
            />
            <Button
              type="submit"
              disabled={busy || !draft.trim()}
              icon={<Send size={16} aria-hidden="true" />}
              iconPosition="start"
              data-testid="coach-chat-send"
            >
              Send
            </Button>
          </form>
        </Card>

        <div className={styles.controls}>
          <Button type="button" variant="secondary" onClick={() => void runCalculate()} disabled={busy}>
            Shortcut: Calculate 98 × 97
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void requestOpenAnimation()}
            disabled={busy || !calculation}
            data-testid="request-open-animation"
          >
            Request Open animation
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              clearCoachSession()
              setSessionId(null)
              setHistory([])
              setHandoff(null)
              setCalculation(null)
              setStage({ kind: 'idle' })
              setError(null)
              void ensureCoachSession().then(setSessionId)
            }}
          >
            Reset session
          </Button>
        </div>

        {sessionId && (
          <p className={styles.meta} data-testid="coach-session-id">
            Session <code>{sessionId}</code>
          </p>
        )}

        {error && (
          <p className={styles.error} role="alert" data-testid="coach-handoff-error">
            {error}
          </p>
        )}

        {handoff && (
          <Card padding="lg">
            <div className={styles.messageRow}>
              {speakerFigure(speaker)}
              <CharacterDialogue character={speaker}>{handoff.message.text}</CharacterDialogue>
            </div>
            {calculation && (
              <div className={styles.meta} data-testid="coach-calculation">
                <span>
                  Verified result <strong>{calculation.result}</strong> · {calculation.sutra_id}
                </span>
                <span>
                  calculation_id <code>{calculation.calculation_id}</code>
                </span>
              </div>
            )}
            <div className={styles.actions}>
              {watchAction && (
                <Button
                  type="button"
                  icon={<Play size={16} aria-hidden="true" />}
                  iconPosition="start"
                  disabled={busy}
                  data-testid="watch-animation-button"
                  onClick={() => void openFromAction(watchAction)}
                >
                  Watch animation
                </Button>
              )}
            </div>
          </Card>
        )}

        {stage.kind === 'loading' && <p className={styles.meta}>Opening verified animation…</p>}

        {stage.kind === 'notice' && (
          <div className={styles.notice} role="status" data-testid="coach-handoff-notice">
            <strong>{stage.title}</strong>
            <p>{stage.body}</p>
          </div>
        )}

        {stage.kind === 'ready' && (
          <HandoffStage
            key={stage.timeline.key}
            timeline={stage.timeline}
            calculationId={stage.calculationId}
          />
        )}
      </div>
    </CharacterOrchestrator>
  )
}

function HandoffStage({ timeline, calculationId }: { timeline: Timeline; calculationId: string }) {
  const { settings } = useSettings()
  const [speed, setSpeed] = useState(1)
  const playback = usePlayback({
    frameCount: timeline.frames.length,
    resetKey: timeline.key,
    speed: speed * settings.animationSpeed,
  })

  return (
    <Card padding="lg" className={styles.stageCard} data-testid="coach-handoff-stage">
      <div className={styles.stageHeading}>
        <span>{timeline.problemLabel}</span>
        <span className={styles.meta}>
          calculation_id <code>{calculationId}</code>
        </span>
      </div>
      <SutraStage timeline={timeline} index={playback.index} speed={speed} />
      <AnimationControls timeline={timeline} playback={playback} speed={speed} onSpeedChange={setSpeed} />
    </Card>
  )
}
