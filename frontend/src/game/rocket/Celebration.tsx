import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import hummingbird from '../../assets/characters/hummingbird.png'
import { useSettings } from '../../services/SettingsContext'
import { playCue } from '../../services/sound'
import { WAYPOINTS } from './model'
import styles from './Celebration.module.css'

type Phase = 'pad' | 'lift' | 'zoom' | 'party'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  colour: string
}

/** A fixed, seeded galaxy so every celebration shows the same sky. */
function paintGalaxy(w: number, h: number, dpr: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')!
  let s = 7
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647
  const glow = g.createRadialGradient(w * 0.7, h * 0.28, 0, w * 0.7, h * 0.28, w * 0.6)
  glow.addColorStop(0, '#2a1d5c')
  glow.addColorStop(0.5, '#120f33')
  glow.addColorStop(1, '#070720')
  g.fillStyle = glow
  g.fillRect(0, 0, w, h)
  for (let i = 0; i < 700; i++) {
    g.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.8})`
    const z = r() * 1.6 * dpr
    g.fillRect(r() * w, r() * h, z, z)
  }
  const cx = w * 0.72
  const cy = h * 0.26
  const k = Math.min(w, h) / 900
  for (let arm = 0; arm < 2; arm++)
    for (let i = 0; i < 900; i++) {
      const t = (i / 900) * 4.2 * Math.PI
      const rr = (14 + t * 26) * k
      const a = t + arm * Math.PI + (r() - 0.5) * 0.5
      g.fillStyle = arm ? `rgba(111,214,208,${0.5 * r()})` : `rgba(182,163,245,${0.6 * r()})`
      g.beginPath()
      g.arc(cx + rr * Math.cos(a) + (r() - 0.5) * 14, cy + rr * Math.sin(a) * 0.5 + (r() - 0.5) * 8, r() * 1.8 * dpr, 0, 7)
      g.fill()
    }
  const core = g.createRadialGradient(cx, cy, 0, cx, cy, 60 * k)
  core.addColorStop(0, 'rgba(255,240,210,.9)')
  core.addColorStop(1, 'rgba(255,240,210,0)')
  g.fillStyle = core
  g.beginPath()
  g.arc(cx, cy, 60 * k, 0, 7)
  g.fill()
  return c
}

export interface CelebrationProps {
  /** The stop just reached, 1 to 6. */
  stop: number
  title: string
  sub: string
  bird: string
  onDone: () => void
}

/**
 * The take-off celebration: the rocket lifts off the pad, the sky turns to
 * space, the view zooms out to the galaxy map of the mission, a gold trail
 * draws to the new stop, and fireworks go off. With reduced motion it shows
 * the final galaxy view straight away.
 */
export function Celebration({ stop, title, sub, bird, onDone }: CelebrationProps) {
  const { settings, reducedMotion } = useSettings()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [phase, setPhase] = useState<Phase>(reducedMotion ? 'party' : 'pad')
  const partyRef = useRef(false)

  useEffect(() => {
    if (settings.soundEffects) playCue('celebrate')
    if (reducedMotion) {
      buttonRef.current?.focus()
      return
    }
    const ids = [
      window.setTimeout(() => setPhase('lift'), 60),
      window.setTimeout(() => setPhase('zoom'), 1900),
      window.setTimeout(() => {
        setPhase('party')
        partyRef.current = true
      }, 3300),
      window.setTimeout(() => buttonRef.current?.focus(), 3600),
    ]
    return () => ids.forEach((id) => window.clearTimeout(id))
    // Runs once when the celebration opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let bg: HTMLCanvasElement
    const size = () => {
      cv.width = window.innerWidth * dpr
      cv.height = window.innerHeight * dpr
      bg = paintGalaxy(cv.width, cv.height, dpr)
    }
    size()
    let parts: Particle[] = []
    const colours = ['#f2b136', '#4cc3bd', '#b6a3f5', '#ef8bb4', '#ffffff']
    const burst = () => {
      const x = (0.15 + Math.random() * 0.7) * cv.width
      const y = (0.1 + Math.random() * 0.45) * cv.height
      for (let i = 0; i < 70; i++) {
        const a = Math.random() * 7
        const v = (2 + Math.random() * 4) * dpr
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, colour: colours[i % colours.length] })
      }
    }
    const bursts = reducedMotion ? [] : [0, 350, 700, 1200, 1700, 2400, 3200]
    let started = false
    let raf = 0
    const frame = (t: number) => {
      ctx.drawImage(bg, 0, 0)
      if (!reducedMotion) {
        ctx.globalAlpha = 0.25 * ((Math.sin(t / 300) + 1) / 2)
        ctx.drawImage(bg, 1, 0)
        ctx.globalAlpha = 1
        if (partyRef.current && !started) {
          started = true
          bursts.forEach((delay) => window.setTimeout(burst, delay))
        }
        parts = parts.filter((p) => p.life > 0)
        for (const p of parts) {
          p.x += p.vx
          p.y += p.vy
          p.vy += 0.05 * dpr
          p.vx *= 0.985
          p.life -= 0.012
          ctx.globalAlpha = Math.max(p.life, 0)
          ctx.fillStyle = p.colour
          ctx.beginPath()
          ctx.arc(p.x, p.y, 2.2 * dpr, 0, 7)
          ctx.fill()
        }
        ctx.globalAlpha = 1
        raf = requestAnimationFrame(frame)
      }
    }
    raf = requestAnimationFrame(frame)
    window.addEventListener('resize', size)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', size)
    }
  }, [reducedMotion])

  const to = WAYPOINTS[stop]
  const from = WAYPOINTS[stop - 1]
  const last = WAYPOINTS.length - 1

  return createPortal(
    <div className={styles.cel} data-phase={phase} role="dialog" aria-modal="true" aria-label={title}>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      <div className={styles.sky} aria-hidden="true" />
      <div className={styles.launch} aria-hidden="true">
        <div className={styles.smoke}>
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        <svg className={styles.bigRocket} viewBox="0 0 120 230">
          <path d="M60 8 C 86 40 92 100 86 168 L 34 168 C 28 100 34 40 60 8Z" fill="#fff" stroke="#573b9c" strokeWidth="5" />
          <circle cx="60" cy="78" r="15" fill="#2f9f9a" stroke="#573b9c" strokeWidth="4" />
          <path d="M34 128 L 12 182 L 38 168Z M86 128 L 108 182 L 82 168Z" fill="#8e7fd6" />
          <path className={styles.flame} d="M42 170 Q60 236 78 170Z" fill="#f2b136" />
          <path className={styles.flame} d="M50 170 Q60 212 70 170Z" fill="#fff2c4" />
        </svg>
        <div className={styles.pad} />
      </div>
      <div className={styles.scene} aria-hidden="true">
        <svg viewBox="0 0 1000 600" className={styles.map}>
          <path
            d={`M${WAYPOINTS.map((w) => `${w.x} ${w.y}`).join(' L ')}`}
            fill="none"
            stroke="rgba(207,196,242,.35)"
            strokeWidth="4"
            strokeDasharray="3 14"
            strokeLinecap="round"
          />
          {stop > 1 && (
            <path d={`M${WAYPOINTS.slice(0, stop).map((w) => `${w.x} ${w.y}`).join(' L ')}`} fill="none" stroke="#4cc3bd" strokeWidth="5" strokeLinecap="round" />
          )}
          <path className={styles.newTrail} d={`M${from.x} ${from.y} L ${to.x} ${to.y}`} fill="none" stroke="#f2b136" strokeWidth="6" strokeLinecap="round" />
          {WAYPOINTS.map((w, i) =>
            i === 0 ? (
              <circle key={w.name} cx={w.x} cy={w.y} r="9" fill={w.colour} />
            ) : (
              <g key={w.name}>
                <circle cx={w.x} cy={w.y} r={i === last ? 34 : 22} fill={w.colour} opacity={i <= stop ? 1 : 0.45} />
                {i === stop && <circle className={styles.ring} cx={w.x} cy={w.y} r="34" fill="none" stroke="#f2b136" strokeWidth="3" />}
                <text
                  x={w.x}
                  y={w.y + (i === last ? 58 : 46)}
                  textAnchor="middle"
                  fontWeight="800"
                  fontSize="20"
                  fill={i <= stop ? '#fff' : 'rgba(255,255,255,.55)'}
                >
                  {w.name}
                </text>
              </g>
            ),
          )}
          <g className={styles.miniRocket} style={{ '--fx': `${from.x}px`, '--fy': `${from.y}px`, '--tx': `${to.x}px`, '--ty': `${to.y}px` } as CSSProperties}>
            <g transform="rotate(35) scale(.32) translate(-60,-110)">
              <path d="M60 8 C 86 40 92 100 86 168 L 34 168 C 28 100 34 40 60 8Z" fill="#fff" />
              <path d="M42 170 Q60 220 78 170Z" fill="#f2b136" />
            </g>
          </g>
        </svg>
      </div>
      <div className={styles.final}>
        <span className={styles.eyebrow}>
          Launch complete · stop {stop} of {last}
        </span>
        <h1>{title}</h1>
        <p>{sub}</p>
        <div className={styles.birdRow}>
          <img src={hummingbird} alt="" width={64} height={64} className={styles.birdImg} />
          <p className={styles.birdBubble}>
            <span className={styles.who}>Hummingbird</span>
            {bird}
          </p>
        </div>
        <button ref={buttonRef} type="button" className={styles.go} onClick={onDone}>
          Continue
        </button>
      </div>
    </div>,
    document.body,
  )
}
