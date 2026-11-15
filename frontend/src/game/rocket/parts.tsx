import type { ReactNode } from 'react'
import styles from './Rocket.module.css'

/** A small rocket on a sky column; it climbs as stages fire. */
export function RocketColumn({ altitude, label }: { altitude: number; label?: string }) {
  const lift = Math.max(0, Math.min(altitude, 95)) * 2.4
  return (
    <div className={styles.rcol}>
      <svg viewBox="0 0 90 300" role="img" aria-label={`Rocket altitude ${Math.round(altitude)} percent`}>
        <defs>
          <linearGradient id="rocket-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#dcd4f7" />
            <stop offset="1" stopColor="#eef5fc" />
          </linearGradient>
        </defs>
        <rect width="90" height="300" rx="14" fill="url(#rocket-sky)" />
        {[40, 90, 140, 190, 240].map((y) => (
          <line key={y} x1="6" x2="16" y1={y} y2={y} stroke="var(--color-lavender-300)" strokeWidth="2" />
        ))}
        <circle cx="70" cy="22" r="10" fill="#f4eed0" />
        <rect x="20" y="282" width="50" height="10" rx="3" fill="var(--color-purple)" />
        <g className={styles.rocketBody} style={{ transform: `translateY(${-lift}px)` }}>
          <path d="M45 222 C 55 236 56 256 54 276 L 36 276 C 34 256 35 236 45 222Z" fill="var(--color-surface)" stroke="var(--color-purple)" strokeWidth="2.5" />
          <circle cx="45" cy="248" r="5" fill="var(--color-teal)" />
          <path d="M36 262 L 28 280 L 37 276Z M54 262 L 62 280 L 53 276Z" fill="var(--color-lavender)" />
          <path className={styles.flame} d="M39 278 Q45 296 51 278Z" fill="var(--color-gold)" />
        </g>
      </svg>
      {label && <span className={styles.rcolLabel}>{label}</span>}
    </div>
  )
}

/** The Nikhilam board: an altimeter around the launch pad at 100, with each number's deviation drawn once it is found. */
export function Altimeter({ a, b, base, devA, devB }: { a: number; b: number; base: number; devA?: string; devB?: string }) {
  const lo = Math.min(a, b, base) - 2
  const hi = Math.max(a, b, base) + 2
  const H = 260
  const y = (v: number) => 20 + ((hi - v) * (H - 40)) / (hi - lo)
  // Deviation lines start at the edge of the pad label, so they never cross its text.
  const edge = (v: number) => y(base) + (v < base ? 12 : v > base ? -12 : 0)
  const ticks = Array.from({ length: hi - lo + 1 }, (_, k) => lo + k)
  const mark = (v: number, colour: string, side: 1 | -1) => (
    <>
      <circle cx="120" cy={y(v)} r="8" fill={colour} />
      <text x={side > 0 ? 136 : 104} y={y(v) + 5} textAnchor={side > 0 ? 'start' : 'end'} fontWeight="800" fontSize="15" fill="var(--color-navy)">
        {v}
      </text>
    </>
  )
  return (
    <svg viewBox={`0 0 300 ${H}`} className={styles.altimeter} role="img" aria-label={`Altimeter: launch pad at ${base}, ${a} and ${b} marked`}>
      <line x1="120" x2="120" y1="14" y2={H - 14} stroke="var(--color-lavender-300)" strokeWidth="3" />
      {ticks.map((v) => (
        <g key={v}>
          <line x1={v % 5 ? 114 : 110} x2={v % 5 ? 126 : 130} y1={y(v)} y2={y(v)} stroke="var(--color-lavender-300)" strokeWidth="2" />
          {v % 5 === 0 && v !== base && v !== a && v !== b && (
            <text x="104" y={y(v) + 4} textAnchor="end" fontSize="12" fill="var(--color-muted)">
              {v}
            </text>
          )}
        </g>
      ))}
      <rect x="40" y={y(base) - 12} width="160" height="24" rx="8" fill="var(--color-purple)" />
      <text x="120" y={y(base) + 5} textAnchor="middle" fill="var(--color-on-primary)" fontWeight="800" fontSize="13">
        launch pad {base}
      </text>
      {devA !== undefined && (
        <g>
          <line x1="165" x2="165" y1={edge(a)} y2={y(a)} stroke="var(--color-teal)" strokeWidth="4" />
          <text x="173" y={(y(base) + y(a)) / 2 + 5} fontWeight="800" fill="var(--color-teal-strong)">
            {devA}
          </text>
        </g>
      )}
      {devB !== undefined && (
        <g>
          <line x1="235" x2="235" y1={edge(b)} y2={y(b)} stroke="var(--color-gold)" strokeWidth="4" />
          <text x="243" y={(y(base) + y(b)) / 2 + 5} fontWeight="800" fill="var(--color-amber)">
            {devB}
          </text>
        </g>
      )}
      {mark(a, 'var(--color-teal)', -1)}
      {mark(b, 'var(--color-gold)', 1)}
    </svg>
  )
}

export function Slot({ children, active, filled, wide }: { children: ReactNode; active?: boolean; filled?: boolean; wide?: boolean }) {
  return (
    <span className={styles.slot} data-active={active || undefined} data-filled={filled || undefined} data-wide={wide || undefined}>
      {children}
    </span>
  )
}
