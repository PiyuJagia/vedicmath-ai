import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import rabbitArt from '../../../assets/characters/rabbit-game.png'
import { useSettings } from '../../../services/SettingsContext'
import { playCue } from '../../../services/sound'
import { MOVE_MS, createRabbitRig, webglAvailable, type RabbitMove, type RabbitRig } from './rabbitRig'
import styles from './Rabbit.module.css'

type Phase = 'away' | 'entering' | 'asking' | 'parking' | 'parked' | 'leaving'

const IDLE_MOVES: RabbitMove[] = ['blink', 'shake', 'blink', 'scratch', 'blink', 'eat']
const IDLE_GAP_MS = 2600
const ENTER_MS = 4200
const PARK_MS = 2200
const LEAVE_MS = 2600
const WIDTH = 106

/** The 3D rabbit, or the flat picture when a device cannot show 3D. */
function RabbitFigure({ rigRef, reducedMotion, onReady }: { rigRef: RefObject<RabbitRig | null>; reducedMotion: boolean; onReady: (rig: RabbitRig) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [flat, setFlat] = useState(() => !webglAvailable())

  useEffect(() => {
    if (flat || !canvasRef.current) return
    let rig: RabbitRig | null = null
    let cancelled = false
    import('three')
      .then((THREE) => createRabbitRig(THREE, canvasRef.current!, rabbitArt, reducedMotion))
      .then((made) => {
        if (cancelled) made.dispose()
        else {
          rig = made
          rigRef.current = made
          onReady(made)
        }
      })
      .catch(() => !cancelled && setFlat(true))
    return () => {
      cancelled = true
      rig?.dispose()
      rigRef.current = null
    }
  }, [flat, reducedMotion, rigRef, onReady])

  return flat ? (
    <img src={rabbitArt} alt="" className={styles.flat} draggable={false} />
  ) : (
    <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
  )
}

function maybePortal(node: ReactNode, target: HTMLElement | null | undefined) {
  return target ? createPortal(node, target) : node
}

export interface RabbitCompanionProps {
  /** Rabbit's hints for the current stage, gentlest first. */
  hints: string[]
  /** Change this number to call Rabbit in (after a slip, a long pause or a tap on "Stuck?"). */
  summon: number
  /** Change this number to send Rabbit away (the stage was solved). */
  dismiss: number
  onHint?: (shown: number) => void
  /**
   * Where the stacked hint cards go. The launch screen passes a spot under its
   * keypad, so hints never cover the answer box; without it they float above Rabbit.
   */
  hintSlot?: HTMLElement | null
}

/**
 * Rabbit hops in from the left, stops and asks whether the child wants a hint.
 * On "Yes please" it hops to the bottom right, parks and shows hint 1; each
 * new hint stacks on top. While it waits it blinks, tilts its head, scratches
 * an ear and nibbles a carrot. All of its moves are slow and small.
 */
export function RabbitCompanion({ hints, summon, dismiss, onHint, hintSlot }: RabbitCompanionProps) {
  const { settings, reducedMotion } = useSettings()
  const rigRef = useRef<RabbitRig | null>(null)
  const [phase, setPhaseState] = useState<Phase>('away')
  const [left, setLeft] = useState(-140)
  const [ms, setMs] = useState(0)
  const [right, setRight] = useState(true)
  const [shown, setShownState] = useState(0)
  const [move, setMove] = useState<RabbitMove | null>(null)
  const timers = useRef(new Set<number>())
  // The latest phase and hint count, for timers and callbacks. Only changed through the setters below.
  const phaseRef = useRef<Phase>('away')
  const shownRef = useRef(0)
  // The 3D rabbit is only built the first time Rabbit is needed.
  const [woken, setWoken] = useState(false)
  const setPhase = useCallback((next: Phase) => {
    phaseRef.current = next
    setPhaseState(next)
    if (next !== 'away') setWoken(true)
  }, [])
  const setShown = useCallback((next: number) => {
    shownRef.current = next
    setShownState(next)
  }, [])

  const later = useCallback((fn: () => void, wait: number) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id)
      fn()
    }, wait)
    timers.current.add(id)
  }, [])
  const clearAll = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id))
    timers.current.clear()
  }, [])
  useEffect(() => () => clearAll(), [clearAll])

  const viewport = () => document.documentElement.clientWidth || window.innerWidth

  // Facing and hopping as the rig should show them, also for a rig built mid-hop.
  const pose = useRef({ right: true, hopping: false })
  const onReady = useCallback((rig: RabbitRig) => {
    rig.setFacing(pose.current.right)
    rig.setHopping(pose.current.hopping)
  }, [])
  const face = useCallback((facingRight: boolean) => {
    pose.current.right = facingRight
    setRight(facingRight)
    rigRef.current?.setFacing(facingRight)
  }, [])

  const hopTo = useCallback(
    (x: number, duration: number, facingRight: boolean, then: () => void) => {
      const d = reducedMotion ? 0 : duration
      face(facingRight)
      pose.current.hopping = d > 0
      rigRef.current?.setHopping(d > 0)
      setMs(d)
      // Let the browser place the rabbit before it starts moving.
      requestAnimationFrame(() => setLeft(x))
      later(() => {
        pose.current.hopping = false
        rigRef.current?.setHopping(false)
        then()
      }, d + 40)
    },
    [face, later, reducedMotion],
  )

  const enter = useCallback(() => {
    if (phaseRef.current !== 'away') return
    setShown(0)
    setMs(0)
    setLeft(-140)
    setPhase('entering')
    hopTo(Math.max(16, viewport() * 0.36), ENTER_MS, true, () => setPhase('asking'))
  }, [hopTo, setPhase, setShown])

  const leave = useCallback(() => {
    if (phaseRef.current === 'away' || phaseRef.current === 'leaving') return
    clearAll()
    setPhase('leaving')
    hopTo(viewport() + 40, LEAVE_MS, true, () => {
      setPhase('away')
      setShown(0)
      setMs(0)
      setLeft(-140)
    })
  }, [clearAll, hopTo, setPhase, setShown])

  const showMore = useCallback(() => {
    const next = Math.min(shownRef.current + 1, hints.length)
    setShown(next)
    onHint?.(next)
  }, [hints.length, onHint, setShown])

  const yes = () => {
    if (settings.petSounds) playCue('hop')
    setPhase('parking')
    hopTo(viewport() - WIDTH - 24, PARK_MS, true, () => {
      setPhase('parked')
      face(false)
      showMore()
    })
  }

  // Calls from the launch screen.
  const firstSummon = useRef(summon)
  useEffect(() => {
    if (summon === firstSummon.current) return
    if (phaseRef.current === 'away') enter()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summon])
  const firstDismiss = useRef(dismiss)
  useEffect(() => {
    if (dismiss === firstDismiss.current) return
    leave()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dismiss])

  // Idle moves while Rabbit waits.
  const waiting = phase === 'asking' || phase === 'parked'
  useEffect(() => {
    if (!waiting || reducedMotion) return
    let i = 0
    let id = 0
    const next = () => {
      const m = IDLE_MOVES[i++ % IDLE_MOVES.length]
      rigRef.current?.play(m)
      setMove(m)
      window.setTimeout(() => setMove(null), MOVE_MS[m])
      id = window.setTimeout(next, MOVE_MS[m] + IDLE_GAP_MS)
    }
    id = window.setTimeout(next, 1800)
    return () => window.clearTimeout(id)
  }, [waiting, reducedMotion])

  const visibleHints = hints.slice(0, shown)

  return (
    <>
      <div
        className={styles.rabbit}
        style={{ transform: `translate3d(${left}px, 0, 0)`, transitionDuration: `${ms}ms` }}
        data-phase={phase}
        data-right={right}
        data-move={move ?? undefined}
        data-flat-hop={ms > 0 && (phase === 'entering' || phase === 'parking' || phase === 'leaving') ? 'true' : undefined}
        hidden={phase === 'away'}
      >
        {woken && <RabbitFigure rigRef={rigRef} reducedMotion={reducedMotion} onReady={onReady} />}
        {phase === 'asking' && (
          <div className={styles.bubble} role="dialog" aria-label="Rabbit offers a hint">
            <p>
              <b>Psst!</b> Want a hint?
            </p>
            <div className={styles.bubbleButtons}>
              <button type="button" className={styles.yes} onClick={yes} autoFocus>
                Yes please
              </button>
              <button type="button" className={styles.no} onClick={leave}>
                Not now
              </button>
            </div>
          </div>
        )}
      </div>
      {phase === 'parked' && visibleHints.length > 0 && maybePortal(
        <div className={styles.stack} data-inline={hintSlot ? 'true' : undefined} aria-live="polite">
          {shown < hints.length && (
            <button type="button" className={styles.more} onClick={showMore}>
              Another hint
            </button>
          )}
          {visibleHints
            .map((hint, index) => (
              <div key={index} className={styles.card} data-old={index < shown - 1}>
                <span className={styles.who}>
                  Rabbit · hint {index + 1} of {hints.length}
                </span>
                {hint}
              </div>
            ))
            .reverse()}
          <button type="button" className={styles.close} onClick={leave}>
            Thanks, Rabbit
          </button>
        </div>,
        hintSlot,
      )}
    </>
  )
}
