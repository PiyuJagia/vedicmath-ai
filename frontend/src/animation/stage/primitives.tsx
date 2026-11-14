import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { fmt } from '../format'
import type { Segment, WorkLine } from '../types'
import { workLineY, type Point } from './geometry'
import styles from './Stage.module.css'

type TileVisual = 'normal' | 'active' | 'muted' | 'empty' | 'warn'

export function Tile({
  x,
  y,
  label,
  state = 'normal',
  width = 56,
  height = 46,
  size = 26,
}: Point & { label: string | number; state?: TileVisual; width?: number; height?: number; size?: number }) {
  return (
    <motion.g
      className={styles.tile}
      data-state={state}
      initial={false}
      animate={{ opacity: state === 'muted' ? 0.38 : 1 }}
      transition={{ duration: 0.35 }}
    >
      <rect x={x - width / 2} y={y - height / 2} width={width} height={height} rx={10} />
      {state !== 'empty' && label !== '' && (
        <text x={x} y={y} fontSize={size} className={styles.number} textAnchor="middle" dominantBaseline="central">
          {fmt(label)}
        </text>
      )}
    </motion.g>
  )
}

export function Chip({ x, y, label, state }: Point & { label: string; state: 'empty' | 'normal' | 'active' | 'muted' }) {
  return (
    <motion.g
      className={styles.chip}
      data-state={state}
      initial={false}
      animate={{ opacity: state === 'muted' ? 0.38 : 1 }}
      transition={{ duration: 0.35 }}
    >
      <rect x={x - 32} y={y - 18} width={64} height={36} rx={18} />
      {state !== 'empty' && (
        <text x={x} y={y} fontSize={20} className={styles.chipText} textAnchor="middle" dominantBaseline="central">
          {label}
        </text>
      )}
    </motion.g>
  )
}

export function CarryToken({ x, y, value, ghost = false }: Point & { value: number | string; ghost?: boolean }) {
  const label = String(value)
  const width = 30 + (label.length - 1) * 9
  return (
    <g className={styles.carry} data-ghost={ghost}>
      <rect x={x - width / 2} y={y - 15} width={width} height={30} rx={15} />
      <text x={x} y={y} fontSize={16} textAnchor="middle" dominantBaseline="central">
        {label}
      </text>
    </g>
  )
}

export function Caption({ x, y, children, anchor = 'middle' }: Point & { children: ReactNode; anchor?: 'start' | 'middle' | 'end' }) {
  return (
    <text x={x} y={y} className={styles.caption} textAnchor={anchor} dominantBaseline="central">
      {children}
    </text>
  )
}

export function BasePill({ x, y, value, active }: Point & { value: number; active: boolean }) {
  return (
    <g className={styles.base} data-active={active}>
      <rect x={x - 78} y={y - 17} width={156} height={34} rx={17} />
      <text x={x} y={y} fontSize={18} textAnchor="middle" dominantBaseline="central">
        Base = {value}
      </text>
    </g>
  )
}

export function MathLine({ from, to, faded = false, arrow = false }: { from: Point; to: Point; faded?: boolean; arrow?: boolean }) {
  return (
    <motion.line
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      className={styles.mathLine}
      markerEnd={arrow ? 'url(#vm-arrow-teal)' : undefined}
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: faded ? 0.25 : 1 }}
      transition={{ duration: 0.6 }}
    />
  )
}

function segmentKey(segment: Segment, index: number) {
  return typeof segment === 'string' ? `${index}-${segment}` : `${index}-${segment.text}-${segment.tone}`
}

export function WorkPanel({ x, y, width, height, title, lines, gap = 28 }: Point & { width: number; height: number; title: string; lines: WorkLine[]; gap?: number }) {
  return (
    <g className={styles.work}>
      <rect x={x} y={y} width={width} height={height} rx={12} />
      <text x={x + 14} y={y + 18} className={styles.workTitle} dominantBaseline="central">
        {title.toUpperCase()}
      </text>
      {lines.map((line, index) => (
        <motion.text
          key={`${index}-${line.segments.map(segmentKey).join('|')}`}
          x={x + 14}
          y={workLineY(y, index, gap)}
          className={styles.workLine}
          initial={{ opacity: 0 }}
          animate={{ opacity: line.faded ? 0.4 : 1 }}
          transition={{ duration: 0.4 }}
        >
          {line.segments.map((segment, segmentIndex) =>
            typeof segment === 'string' ? (
              <tspan key={segmentKey(segment, segmentIndex)}>{segment}</tspan>
            ) : (
              <tspan key={segmentKey(segment, segmentIndex)} data-tone={segment.tone} className={styles.toned}>
                {segment.text}
              </tspan>
            ),
          )}
        </motion.text>
      ))}
    </g>
  )
}

export function JoinedAnswer({ x, y, value }: Point & { value: number }) {
  const label = String(value)
  const width = 44 + label.length * 21
  return (
    <motion.g
      className={styles.joined}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      style={{ originX: `${x}px`, originY: `${y}px` }}
    >
      <rect x={x - width / 2} y={y - 25} width={width} height={50} rx={12} />
      <text x={x} y={y} fontSize={32} className={styles.number} textAnchor="middle" dominantBaseline="central">
        {label}
      </text>
    </motion.g>
  )
}

/**
 * A value travelling from one place to another. With reduced motion the
 * dashed path alone shows where the value went.
 */
export function MovingValue({
  from,
  to,
  label,
  tone,
  duration,
  reducedMotion,
  arc = 18,
}: {
  from: Point
  to: Point
  label: string
  tone: 'write' | 'carry' | 'dev'
  duration: number
  reducedMotion: boolean
  /** How far the path bows upwards between its ends. */
  arc?: number
}) {
  const midX = (from.x + to.x) / 2
  const midY = Math.min(from.y, to.y) - arc
  return (
    <g>
      <path
        d={`M${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`}
        className={styles.motionPath}
        markerEnd="url(#vm-arrow-purple)"
      />
      {!reducedMotion && (
        <motion.g
          initial={{ x: from.x, y: from.y, opacity: 0 }}
          animate={{ x: [from.x, midX, to.x], y: [from.y, midY, to.y], opacity: [0, 1, 1, 0] }}
          transition={{ duration, ease: 'easeInOut', times: [0, 0.5, 1] }}
          className={styles.mover}
          data-tone={tone}
        >
          <rect x={-18 - (label.length - 1) * 5} y={-14} width={36 + (label.length - 1) * 10} height={28} rx={14} />
          <text x={0} y={0} fontSize={16} textAnchor="middle" dominantBaseline="central">
            {label}
          </text>
        </motion.g>
      )}
    </g>
  )
}

export function StageDefs() {
  return (
    <defs>
      <marker id="vm-arrow-teal" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill="var(--color-teal)" />
      </marker>
      <marker id="vm-arrow-purple" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill="var(--color-purple)" />
      </marker>
    </defs>
  )
}
