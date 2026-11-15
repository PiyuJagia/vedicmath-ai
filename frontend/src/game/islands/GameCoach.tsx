import { useEffect, useRef, useState, type RefObject } from 'react'
import type { Difficulty } from '../../types/learning'
import { useLiveCoach } from '../../services/LiveCoachContext'
import { WORLD_NAMES } from './model'
import { coachInput, readGameState, type GameState } from './coachModel'
import styles from './Islands.module.css'

/** Uses the app's existing session. Agent replies never execute game actions. */
export function GameCoach({ frame, difficulty }: { frame: RefObject<HTMLIFrameElement | null>; difficulty: Difficulty }) {
  const { ask, enabled } = useLiveCoach()
  const [state, setState] = useState<GameState | null>(null)
  const current = useRef<GameState | null>(null)
  const request = useRef(0)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [reply, setReply] = useState('Ask me about your next leap. We can work through it together.')
  const [pending, setPending] = useState(false)
  const [speaker, setSpeaker] = useState('Rishi')
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== frame.current?.contentWindow) return
      const next = readGameState(event.data, difficulty)
      if (!next) return
      current.current = next
      setState(next)
      request.current++
      setPending(false)
      setReply(next.status === 'incorrect' ? 'A fresh start is another chance to learn. Ask me about the missed step.' : next.status === 'complete' ? 'You crossed the whole world! Want to talk through your method?' : 'Ask me about this step. Your next leap is yours to choose.')
    }
    window.addEventListener('message', receive)
    return () => { window.removeEventListener('message', receive); request.current++ }
  }, [difficulty, frame])
  async function send(message: string) {
    if (!state || pending || !enabled || !message.trim()) return
    const id = ++request.current
    const snapshot = current.current
    setPending(true)
    setDraft('')
    try {
      const result = await ask(coachInput(state, message.trim().slice(0, 600)))
      if (id !== request.current || snapshot !== current.current) return
      setSpeaker(result.speaker === 'rabbit' ? 'Rabbit' : result.speaker === 'hummingbird' ? 'Hummingbird' : 'Rishi')
      setReply(result.isLive && result.text ? result.text : 'Rishi could not connect right now. Try again when you are ready; you can keep playing.')
    } catch {
      if (id === request.current) setReply('Rishi could not connect right now. You can keep playing and try again.')
    } finally {
      if (id === request.current) setPending(false)
    }
  }
  return <aside className={styles.coach} aria-label="Game coach">
    <button className={styles.coachToggle} onClick={() => setOpen(!open)} aria-expanded={open}>{open ? 'Close coach' : 'Ask Rishi'}</button>
    {open && <div className={styles.coachPanel}>
      <strong>{speaker} · {WORLD_NAMES[difficulty]}</strong>
      {state && <small>Step {state.step + 1} · {state.question}</small>}
      <p role="status" aria-live="polite">{!enabled ? 'Live coaching is disabled in your app settings. You can still play.' : pending ? 'Rishi is thinking… You can keep playing.' : reply}</p>
      <button disabled={!state || pending || !enabled} onClick={() => void send('Help me understand this step without choosing an option for me.')}>Explain this step</button>
      <form onSubmit={event => { event.preventDefault(); void send(draft) }}>
        <label htmlFor="islands-coach-question">Ask your coach</label>
        <input id="islands-coach-question" value={draft} maxLength={600} onChange={event => setDraft(event.target.value)} placeholder="What would you like help with?" />
        <button disabled={!state || pending || !enabled || !draft.trim()}>Send</button>
      </form>
    </div>}
  </aside>
}
