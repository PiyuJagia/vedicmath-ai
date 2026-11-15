import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { friendlyError } from '../../animation/useLesson'
import { Card } from '../../components/ui/Card'
import { Pill } from '../../components/ui/Pill'
import { useSettings } from '../../services/SettingsContext'
import { playCue } from '../../services/sound'
import { checkStage, fetchLaunch, type Engine, type LaunchDetails, type MissionLaunch, type SolutionFacts } from './api'
import type { LaunchRecord } from './model'
import { showNumber } from './format'
import { Altimeter, RocketColumn, Slot } from './parts'
import { RabbitCompanion } from './rabbit/RabbitCompanion'
import { ENGINE_NAMES, engineMiss } from './voices'
import styles from './Rocket.module.css'

const IDLE_MS = 9000

type EngineChoice = Engine | 'standard'

interface Feedback {
  tone: 'ok' | 'no'
  text: string
}

export function LaunchView({
  launch,
  launchNumber,
  totalLaunches,
  onWin,
}: {
  launch: MissionLaunch
  launchNumber: number
  totalLaunches: number
  onWin: (record: LaunchRecord) => void
}) {
  const { settings } = useSettings()
  const [details, setDetails] = useState<LaunchDetails | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [engineDone, setEngineDone] = useState(false)
  const [engineMisses, setEngineMisses] = useState<EngineChoice[]>([])
  const [engineNote, setEngineNote] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const [entry, setEntry] = useState('')
  const [filled, setFilled] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [checking, setChecking] = useState(false)
  const [summon, setSummon] = useState(0)
  const [dismiss, setDismiss] = useState(0)
  const [won, setWon] = useState(false)
  const tally = useRef({ hints: 0, slips: 0, mistakes: [] as string[] })
  const hintsThisStage = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const idleTimer = useRef(0)
  const [hintSlot, setHintSlot] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchLaunch(launch)
      .then((loaded) => !cancelled && setDetails(loaded))
      .catch((error: unknown) => !cancelled && setLoadError(friendlyError(error)))
    return () => {
      cancelled = true
    }
  }, [launch])

  const stage = details && engineDone && !won ? details.stages[index] : null

  // Rabbit offers help after about nine seconds without a tap.
  const armIdle = useCallback(() => {
    window.clearTimeout(idleTimer.current)
    if (!stage) return
    idleTimer.current = window.setTimeout(() => setSummon((n) => n + 1), IDLE_MS)
  }, [stage])
  useEffect(() => {
    armIdle()
    return () => window.clearTimeout(idleTimer.current)
  }, [armIdle])

  const solved = Object.keys(filled).length
  const total = details?.stages.length ?? 1
  const altitude = 15 + (75 * solved) / total + (engineDone ? 5 : 0)

  const pickEngine = (choice: EngineChoice) => {
    if (choice === launch.engine) {
      setEngineNote(null)
      if (settings.soundEffects) playCue('correct')
      window.setTimeout(() => {
        setEngineDone(true)
        inputRef.current?.focus()
      }, 450)
      return
    }
    setEngineMisses((misses) => (misses.includes(choice) ? misses : [...misses, choice]))
    setEngineNote(engineMiss(launch, choice))
  }

  const finish = (solution: SolutionFacts) => {
    setWon(true)
    window.clearTimeout(idleTimer.current)
    const { hints, slips, mistakes } = tally.current
    const record: LaunchRecord = {
      label: launch.label,
      sutra: launch.sutra,
      rung: launch.rung,
      hints,
      slips,
      mistakes,
      engineRight: engineMisses.length === 0,
      clean: hints === 0 && slips === 0,
      facts: solution,
      at: new Date().toISOString(),
    }
    window.setTimeout(() => onWin(record), 900)
  }

  const submit = async (event?: FormEvent) => {
    event?.preventDefault()
    if (!stage || checking) return
    armIdle()
    const answer = entry.trim()
    if (answer === '' || answer === '-' || answer === '−') {
      setFeedback({ tone: 'no', text: 'Type a number first.' })
      return
    }
    setChecking(true)
    try {
      const result = await checkStage(launch, stage.key, answer)
      if (result.is_correct) {
        if (settings.soundEffects) playCue('correct')
        setFilled((all) => ({ ...all, [stage.key]: answer.replace('−', '-') }))
        setFeedback({ tone: 'ok', text: index === total - 1 ? 'Lift-off!' : 'Stage fired!' })
        setEntry('')
        setDismiss((n) => n + 1)
        hintsThisStage.current = 0
        if (result.solution) finish(result.solution)
        else window.setTimeout(() => setIndex((i) => i + 1), 450)
      } else if (result.status === 'invalid') {
        setFeedback({ tone: 'no', text: result.message ?? 'Type a whole number.' })
      } else {
        tally.current.slips += 1
        if (result.mistake) tally.current.mistakes = [...tally.current.mistakes, result.mistake]
        if (settings.soundEffects) playCue('try-again')
        setFeedback({ tone: 'no', text: result.feedback ?? 'Not yet. Try again.' })
        window.setTimeout(() => setSummon((n) => n + 1), 900)
      }
    } catch (error) {
      setFeedback({ tone: 'no', text: friendlyError(error) })
    } finally {
      setChecking(false)
      inputRef.current?.focus()
    }
  }

  const press = (key: string) => {
    armIdle()
    if (key === 'del') setEntry((e) => e.slice(0, -1))
    else if (key === 'minus') setEntry((e) => (e.startsWith('-') ? e.slice(1) : `-${e}`))
    else setEntry((e) => (e.length < 8 ? e + key : e))
    inputRef.current?.focus()
  }

  const onHint = useCallback((shown: number) => {
    if (shown > hintsThisStage.current) {
      tally.current.hints += shown - hintsThisStage.current
      hintsThisStage.current = shown
    }
  }, [])

  const hints = useMemo(() => stage?.hints ?? [], [stage])

  if (loadError) {
    return (
      <Card padding="lg" className={styles.error} role="alert">
        {loadError}
      </Card>
    )
  }
  if (!details) {
    return <Card padding="lg">Fuelling the rocket…</Card>
  }

  const eyebrow = `Launch ${launchNumber} of ${totalLaunches} · rung ${launch.rung}${launch.review ? ' · review' : ''} · ${launch.sutra === 'nikhilam' ? 'Nikhilam' : 'Ekadhikena'} Beginner`

  return (
    <div className={styles.launch}>
      <div className={styles.launchHead}>
        <div>
          <span className={styles.eyebrow}>{eyebrow}</span>
          <h2 className={styles.problem}>{launch.label}</h2>
        </div>
        <Pill tone={launch.sutra === 'nikhilam' ? 'teal' : 'gold'}>{launch.sutra === 'nikhilam' ? `pad ${details.base}` : 'ends in 5'}</Pill>
      </div>

      <div className={styles.work}>
        <Card padding="md" className={styles.board}>
          {launch.sutra === 'nikhilam' ? <NikhilamBoard launch={launch} base={details.base ?? 100} filled={filled} current={stage?.key} /> : <BoosterBoard filled={filled} current={stage?.key} />}
        </Card>

        <RocketColumn altitude={won ? 95 : altitude} />

        <div className={styles.controls}>
          {!engineDone ? (
            <div className={styles.engines}>
              <p className={styles.prompt}>Which engine fits this launch?</p>
              {(['pad', 'booster', 'standard'] as const).map((choice) => (
                <button key={choice} type="button" className={styles.engine} data-miss={engineMisses.includes(choice) || undefined} onClick={() => pickEngine(choice)}>
                  <span className={styles.engineTitle}>{ENGINE_NAMES[choice].title}</span>
                  <span className={styles.engineSub}>{ENGINE_NAMES[choice].sub}</span>
                </button>
              ))}
              {engineNote && (
                <p className={styles.feedback} data-tone="no" role="status">
                  {engineNote}
                </p>
              )}
            </div>
          ) : won ? (
            <p className={styles.feedback} data-tone="ok" role="status">
              Lift-off! {launch.label} = {filled.result}
            </p>
          ) : (
            stage && (
              <form className={styles.stageForm} onSubmit={submit}>
                <p className={styles.prompt} id="stage-prompt">
                  {stage.prompt}
                </p>
                <input
                  ref={inputRef}
                  className={styles.entry}
                  value={entry.replace(/^-/, '−')}
                  onChange={(event) => {
                    armIdle()
                    setEntry(event.target.value.replace(/[−–]/g, '-').replace(/[^\d-]/g, '').slice(0, 9))
                  }}
                  inputMode="numeric"
                  autoComplete="off"
                  aria-labelledby="stage-prompt"
                />
                <p className={styles.feedback} data-tone={feedback?.tone} role="status">
                  {feedback?.text ?? ''}
                </p>
                <div className={styles.keypad}>
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
                    <button key={k} type="button" onClick={() => press(k)}>
                      {k}
                    </button>
                  ))}
                  <button type="button" onClick={() => press('minus')} aria-label="Minus">
                    −
                  </button>
                  <button type="button" onClick={() => press('0')}>
                    0
                  </button>
                  <button type="button" onClick={() => press('del')} aria-label="Delete">
                    ⌫
                  </button>
                  <button type="submit" className={styles.check} disabled={checking}>
                    Check
                  </button>
                </div>
                <button type="button" className={styles.stuck} onClick={() => setSummon((n) => n + 1)}>
                  Stuck? Call Rabbit
                </button>
                <div ref={setHintSlot} />
              </form>
            )
          )}
        </div>
      </div>

      <RabbitCompanion hints={hints} summon={summon} dismiss={dismiss} onHint={onHint} hintSlot={hintSlot} />
    </div>
  )
}

function NikhilamBoard({ launch, base, filled, current }: { launch: MissionLaunch & { sutra: 'nikhilam' }; base: number; filled: Record<string, string>; current?: string }) {
  const { a, b } = launch
  const left = filled.adjusted_left_part ?? filled.left_part
  const right = filled.padded_right_part ?? filled.adjusted_right_part ?? filled.right_part
  const leftOld = filled.adjusted_left_part ? filled.left_part : undefined
  const rightOld = filled.adjusted_right_part ? filled.right_part : undefined
  const is = (...keys: string[]) => Boolean(current && keys.includes(current))
  return (
    <div className={styles.nikBoard}>
      <Altimeter a={a} b={b} base={base} devA={showNumber(filled.deviation_a)} devB={showNumber(filled.deviation_b)} />
      <div className={styles.slots}>
        <Slot filled>{a}</Slot>
        <span className={styles.op}>deviation</span>
        <Slot active={is('deviation_a')} filled={filled.deviation_a !== undefined}>
          {showNumber(filled.deviation_a) ?? '?'}
        </Slot>
        <Slot filled>{b}</Slot>
        <span className={styles.op}>deviation</span>
        <Slot active={is('deviation_b')} filled={filled.deviation_b !== undefined}>
          {showNumber(filled.deviation_b) ?? '?'}
        </Slot>
        <Slot active={is('left_part', 'adjusted_left_part')} filled={left !== undefined}>
          {leftOld && <s className={styles.old}>{leftOld}</s>} {left ?? 'left'}
        </Slot>
        <span className={styles.op}>|</span>
        <Slot active={is('right_part', 'adjusted_right_part', 'padded_right_part')} filled={right !== undefined}>
          {rightOld && <s className={styles.old}>{showNumber(rightOld)}</s>} {showNumber(right) ?? 'right'}
        </Slot>
        <Slot active={is('result')} filled={filled.result !== undefined} wide>
          {filled.result ?? 'answer'}
        </Slot>
      </div>
    </div>
  )
}

const BOOSTER_STAGES: [string, string][] = [
  ['result', 'Capsule · join'],
  ['right_part', 'Stage 4 · 5 × 5'],
  ['left_part', 'Stage 3 · multiply'],
  ['next_number', 'Stage 2 · one more'],
  ['previous_number', 'Stage 1 · cover the 5'],
]

function BoosterBoard({ filled, current }: { filled: Record<string, string>; current?: string }) {
  return (
    <div className={styles.boosterBoard}>
      <p className={styles.small}>Booster stack, fired from the bottom up</p>
      <div className={styles.stack}>
        {BOOSTER_STAGES.map(([key, title]) => (
          <div key={key} className={styles.stageBox} data-lit={filled[key] !== undefined || undefined} data-active={current === key || undefined}>
            <span className={styles.eyebrow}>{title}</span>
            <span className={styles.stageValue}>{filled[key] ?? '?'}</span>
          </div>
        ))}
      </div>
      <p className={styles.small}>Why it flies: (10a + 5)² = 100 · a · (a + 1) + 25</p>
    </div>
  )
}
