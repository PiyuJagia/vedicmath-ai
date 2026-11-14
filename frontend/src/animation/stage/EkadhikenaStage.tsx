import type { EkadhikenaFrame } from '../types'
import { workLineY, type Point } from './geometry'
import { Caption, JoinedAnswer, MathLine, MovingValue, StageDefs, Tile, WorkPanel } from './primitives'
import styles from './Stage.module.css'

const G = {
  number: { x: 140, y: 60 },
  previous: { x: 108, y: 60 },
  last: { x: 172, y: 60 },
  next: { x: 108, y: 156 },
  work: { x: 262, y: 92, width: 206, height: 118 },
  resultY: 258,
  leftX: 96,
  barX: 152,
  rightX: 204,
}

interface Props {
  frame: EkadhikenaFrame
  previousValue: number
  lastDigit: number
  nextValue: number
  reducedMotion: boolean
  moveDuration: number
}

export function EkadhikenaStage({ frame, previousValue, lastDigit, nextValue, reducedMotion, moveDuration }: Props) {
  const scene = frame.scene
  const anchors: Record<string, Point> = {
    work: { x: G.work.x + 4, y: workLineY(G.work.y, 0) - 6 },
    previous: { x: G.previous.x - 14, y: G.previous.y + 24 },
    next: { x: G.next.x - 14, y: G.next.y - 24 },
    left: { x: G.leftX, y: G.resultY - 22 },
  }

  return (
    <svg viewBox="0 0 480 300" className={styles.stage} role="img" aria-label={frame.state}>
      <StageDefs />
      {!scene.split ? (
        <g>
          <Tile x={G.number.x} y={G.number.y} label={scene.number} width={84} />
          <Caption x={G.number.x + 54} y={G.number.y - 18}>
            <tspan fontSize={17} fill="var(--color-navy)">
              2
            </tspan>
          </Caption>
        </g>
      ) : (
        <g>
          <Caption x={G.previous.x + 28} y={G.previous.y - 36} anchor="end">
            preceding part
          </Caption>
          <Caption x={G.last.x - 20} y={G.last.y - 36} anchor="start">
            last digit
          </Caption>
          <Tile x={G.previous.x} y={G.previous.y} label={previousValue} state={scene.previous} width={Math.max(56, String(previousValue).length * 18 + 20)} />
          <Tile x={G.last.x} y={G.last.y} label={lastDigit} state={scene.lastDigit} />
        </g>
      )}

      {scene.next !== 'hidden' && (
        <g>
          <Tile x={G.next.x} y={G.next.y} label={nextValue} state={scene.next} width={Math.max(56, String(nextValue).length * 18 + 20)} />
          <Caption x={G.next.x + 48} y={G.next.y} anchor="start">
            one more
          </Caption>
        </g>
      )}

      {scene.plusOne && (
        <g className={styles.plusOne}>
          <rect x={G.previous.x - 82} y={(G.previous.y + G.next.y) / 2 - 13} width={38} height={26} rx={13} />
          <text x={G.previous.x - 63} y={(G.previous.y + G.next.y) / 2} fontSize={14} textAnchor="middle" dominantBaseline="central">
            +1
          </text>
        </g>
      )}

      {scene.link && (
        <g>
          <MathLine from={{ x: G.previous.x + 12, y: G.previous.y + 24 }} to={{ x: G.next.x + 12, y: G.next.y - 24 }} />
          <Caption x={G.previous.x + 28} y={(G.previous.y + G.next.y) / 2}>
            ×
          </Caption>
        </g>
      )}

      {scene.work.length > 0 && <WorkPanel {...G.work} title="Working" lines={scene.work} />}

      {scene.left.kind !== 'hidden' && (
        <g>
          <Caption x={G.leftX} y={G.resultY - 33}>
            left part
          </Caption>
          {scene.left.kind === 'empty' ? (
            <Tile x={G.leftX} y={G.resultY} label="" state="empty" width={84} />
          ) : (
            <Tile x={G.leftX} y={G.resultY} label={scene.left.value} state={scene.left.active ? 'active' : 'normal'} width={84} />
          )}
          <line x1={G.barX} y1={G.resultY - 22} x2={G.barX} y2={G.resultY + 22} className={styles.divider} />
          <Caption x={G.rightX} y={G.resultY - 33}>
            right part
          </Caption>
          {scene.right.kind === 'value' ? (
            <Tile x={G.rightX} y={G.resultY} label={scene.right.value} state={scene.right.active ? 'active' : 'normal'} width={74} />
          ) : (
            <Tile x={G.rightX} y={G.resultY} label="" state="empty" width={74} />
          )}
        </g>
      )}

      {scene.joined !== null && <JoinedAnswer x={G.barX} y={G.resultY} value={scene.joined} />}

      {scene.moves.map((move) => (
        <MovingValue
          key={`${frame.id}-${move.id}`}
          from={anchors[move.from]}
          to={anchors[move.to]}
          label={move.label}
          tone="write"
          duration={moveDuration}
          reducedMotion={reducedMotion}
        />
      ))}
    </svg>
  )
}
