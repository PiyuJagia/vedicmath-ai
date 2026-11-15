import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  ensureCoachSession,
  isLiveCoachEnabled,
  loadCoachChatHistory,
  saveCoachChatHistory,
} from '../api/coachClient'
import type { CoachChatHistoryItem, CoachLearningContext } from '../api/coachTypes'
import { askLiveCoach, type LiveCoachAskInput, type LiveCoachIntent, type LiveCoachReply } from './liveCoach'
import { useSettings } from './SettingsContext'

type CoachEventKey = string

type LiveCoachContextValue = {
  enabled: boolean
  busy: boolean
  error: string | null
  sessionReady: boolean
  history: CoachChatHistoryItem[]
  lastReply: LiveCoachReply | null
  /** Conversational ask — always hits ADK when enabled. */
  ask: (input: LiveCoachAskInput) => Promise<LiveCoachReply>
  /** Proactive coaching with debounce + duplicate suppression. */
  triggerEvent: (
    eventKey: CoachEventKey,
    input: LiveCoachAskInput,
    options?: { debounceMs?: number; force?: boolean },
  ) => Promise<LiveCoachReply | null>
  setContextPatch: (patch: Partial<CoachLearningContext>) => void
  context: CoachLearningContext
  clearError: () => void
}

const LiveCoachContext = createContext<LiveCoachContextValue | null>(null)

function historyId(): string {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const DEFAULT_CONTEXT: CoachLearningContext = { screen: 'theory' }

export function LiveCoachProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings()
  const enabled = isLiveCoachEnabled(settings.role)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [history, setHistory] = useState<CoachChatHistoryItem[]>(() => loadCoachChatHistory())
  const [lastReply, setLastReply] = useState<LiveCoachReply | null>(null)
  const [context, setContext] = useState<CoachLearningContext>(DEFAULT_CONTEXT)
  const setContextPatch = useCallback((patch: Partial<CoachLearningContext>) => {
    setContext((current) => {
      const keys = Object.keys(patch) as Array<keyof CoachLearningContext>
      return keys.every((key) => Object.is(current[key], patch[key])) ? current : { ...current, ...patch }
    })
  }, [])
  const recentEvents = useRef<Map<string, number>>(new Map())
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    if (!enabled) {
      setSessionReady(false)
      return
    }
    let cancelled = false
    ensureCoachSession()
      .then(() => {
        if (!cancelled) setSessionReady(true)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Coach session unavailable.')
      })
    return () => {
      cancelled = true
    }
  }, [enabled])

  const appendHistory = useCallback((learnerText: string | null, reply: LiveCoachReply) => {
    setHistory((prev) => {
      const next = [...prev]
      if (learnerText) {
        next.push({ id: historyId(), role: 'learner', text: learnerText, at: Date.now() })
      }
      if (reply.isLive && reply.text) {
        next.push({
          id: historyId(),
          role: 'coach',
          text: reply.text,
          characterId:
            reply.speaker === 'boy' ? 'boy_coach' : reply.speaker === 'rabbit' ? 'rabbit' : 'hummingbird',
          at: Date.now(),
        })
      }
      saveCoachChatHistory(next)
      return next
    })
  }, [])

  const ask = useCallback(
    async (input: LiveCoachAskInput): Promise<LiveCoachReply> => {
      if (!enabled) {
        const disabled: LiveCoachReply = {
          speaker: 'boy',
          text: '',
          mood: 'speaking',
          isLive: false,
          toolsUsed: [],
          error: 'Live coaching is disabled.',
        }
        setLastReply(disabled)
        return disabled
      }
      setBusy(true)
      setError(null)
      const merged: LiveCoachAskInput = {
        ...input,
        context: { ...context, ...input.context },
      }
      const reply = await askLiveCoach(merged)
      setLastReply(reply)
      if (reply.error) setError(reply.error)
      appendHistory(input.intent && input.intent !== 'freeform' ? null : input.message, reply)
      setBusy(false)
      return reply
    },
    [appendHistory, context, enabled],
  )

  const triggerEvent = useCallback(
    async (
      eventKey: CoachEventKey,
      input: LiveCoachAskInput,
      options?: { debounceMs?: number; force?: boolean },
    ): Promise<LiveCoachReply | null> => {
      if (!enabled) return null
      const debounceMs = options?.debounceMs ?? 800
      const now = Date.now()
      const last = recentEvents.current.get(eventKey) ?? 0
      if (!options?.force && now - last < 12_000) {
        return null
      }
      recentEvents.current.set(eventKey, now)

      const existing = timers.current.get(eventKey)
      if (existing) clearTimeout(existing)

      return await new Promise((resolve) => {
        const timer = setTimeout(async () => {
          timers.current.delete(eventKey)
          const reply = await ask({
            ...input,
            intent: input.intent ?? (input.context.event as LiveCoachIntent | undefined) ?? 'freeform',
            context: {
              ...context,
              ...input.context,
              event: input.context.event ?? eventKey,
            },
          })
          resolve(reply)
        }, debounceMs)
        timers.current.set(eventKey, timer)
      })
    },
    [ask, context, enabled],
  )

  const value = useMemo<LiveCoachContextValue>(
    () => ({
      enabled,
      busy,
      error,
      sessionReady,
      history,
      lastReply,
      ask,
      triggerEvent,
      setContextPatch,
      context,
      clearError: () => setError(null),
    }),
    [ask, busy, context, enabled, error, history, lastReply, sessionReady, setContextPatch, triggerEvent],
  )

  return <LiveCoachContext.Provider value={value}>{children}</LiveCoachContext.Provider>
}

export function useLiveCoach(): LiveCoachContextValue {
  const value = useContext(LiveCoachContext)
  if (!value) {
    throw new Error('useLiveCoach must be used within LiveCoachProvider')
  }
  return value
}
