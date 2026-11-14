import { signed } from '../format'
import type { NikhilamAnchor, NikhilamFrame } from '../types'
import { workLineY, type Point } from './geometry'
import { BasePill, CarryToken, Caption, Chip, JoinedAnswer, MathLine, MovingValue, StageDefs, Tile, WorkPanel } from './primitives'
import styles from './Stage.module.css'

// Logical grid in viewBox units (480 × 300).
const G = {
  base: { x: 140, y: 26 },
  lineY: 60,
  a: { x: 86, y: 118 },
  b: { x: 86, y: 180 },
  devA: { x: 200, y: 118 },
  devB: { x: 200, y: 180 },
  work: { x: 262, y: 92, width: 206, height: 118 },
  resultY: 258,
  leftX: 96,
  barX: 152,
  rightX: 190,
  cellGap: 38,
}

interface Props {
  frame: NikhilamFrame
  numbers: { a: number; b: number; base: number; devA: number; devB: number }
  reducedMotion: boolean
  moveDuration: number
}

function NumberLine({ a, b, base }: { a: number; b: number; base: number }) {
  const x0 = 30
  const x1 = 250
  const low = Math.min(a, b, base) - 1
  const high = Math.max(a, b, base) + 1
  const xFor = (n: number) => x0 + ((n - low) / (high - low)) * (x1 - x0)
  const points: [number, boolean][] = [
    [a, false],
    [b, false],
    [base, true],
  ]
  return (
    <g>
      <line x1={x0} y1={G.lineY} x2={x1} y2={G.lineY} className={styles.lineTrack} />
      {points.map(([value, isBase], index) => (
        <g key={`${index}-${value}`}>
          <circle cx={xFor(value)} cy={G.lineY} r={isBase ? 6 : 4.5} className={isBase ? styles.dotBase : styles.dotNumber} />
          <Caption x={xFor(value)} y={G.lineY + 16}>
            {value}
          </Caption>
        </g>
      ))}
    </g>
  )
}

export function NikhilamStage({ frame, numbers, reducedMotion, moveDuration }: Props) {
  const scene = frame.scene
  const cellCount = scene.right.kind === 'cells' ? scene.right.cells.length : 2
  const lastCellX = G.rightX + (cellCount - 1) * G.cellGap

  const anchor = (name: NikhilamAnchor): Point => {
    switch (name) {
      case 'work':
        return { x: G.work.x + 4, y: workLineY(G.work.y, 0) - 6 }
      case 'a':
        return G.a
      case 'b':
        return G.b
      case 'devA':
        return { x: G.devA.x + 30, y: G.devA.y }
      case 'devB':
        return { x: G.devB.x + 30, y: G.devB.y }
      case 'left':
        return { x: G.leftX, y: G.resultY - 22 }
      case 'rightLast':
        return { x: lastCellX, y: G.resultY - 22 }
      case 'rightFirst':
        return { x: G.rightX, y: G.resultY - 22 }
    }
  }

  return (
    <svg viewBox="0 0 480 300" className={styles.stage} role="img" aria-label={frame.state}>
      <StageDefs />
      {scene.base !== 'hidden' && <BasePill x={G.base.x} y={G.base.y} value={numbers.base} active={scene.base === 'active'} />}
      {scene.numberLine && <NumberLine a={numbers.a} b={numbers.b} base={numbers.base} />}

      <Tile x={G.a.x} y={G.a.y} label={numbers.a} state={scene.a} width={84} />
      <Caption x={24} y={G.b.y}>
        <tspan fontSize={24}>×</tspan>
      </Caption>
      <Tile x={G.b.x} y={G.b.y} label={numbers.b} state={scene.b} width={84} />

      {scene.devA !== 'hidden' && <Chip x={G.devA.x} y={G.devA.y} label={signed(numbers.devA)} state={scene.devA} />}
      {scene.devB !== 'hidden' && <Chip x={G.devB.x} y={G.devB.y} label={signed(numbers.devB)} state={scene.devB} />}

      {scene.lines.map((line) => {
        if (line.id === 'cross-a') {
          return <MathLine key={line.id} from={{ x: G.a.x + 44, y: G.a.y + 7 }} to={{ x: G.devB.x - 35, y: G.devB.y - 8 }} faded={line.faded} arrow />
        }
        if (line.id === 'cross-b') {
          return <MathLine key={line.id} from={{ x: G.b.x + 44, y: G.b.y - 7 }} to={{ x: G.devA.x - 35, y: G.devA.y + 8 }} faded={line.faded} arrow />
        }
        return (
          <g key={line.id}>
            <MathLine from={{ x: G.devA.x, y: G.devA.y + 20 }} to={{ x: G.devB.x, y: G.devB.y - 20 }} faded={line.faded} />
            <Caption x={G.devA.x + 16} y={(G.devA.y + G.devB.y) / 2}>
              ×
            </Caption>
          </g>
        )
      })}

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
        </g>
      )}

      {scene.right.kind === 'cells' && (
        <g>
          <Caption x={G.rightX + ((cellCount - 1) * G.cellGap) / 2} y={G.resultY - 33}>
            right part
          </Caption>
          {scene.right.cells.map((cell, index) => (
            <Tile
              key={index}
              x={G.rightX + index * G.cellGap}
              y={G.resultY}
              label={cell ?? ''}
              state={cell === null ? 'empty' : scene.right.kind === 'cells' && scene.right.active[index] ? 'active' : 'normal'}
              width={36}
            />
          ))}
        </g>
      )}
      {scene.right.kind === 'wide' && (
        <g>
          <Caption x={G.rightX + G.cellGap / 2} y={G.resultY - 33}>
            right part
          </Caption>
          <Tile x={G.rightX + G.cellGap / 2} y={G.resultY} label={scene.right.value} state={scene.right.tone === 'warn' ? 'warn' : 'active'} width={74} />
        </g>
      )}

      {scene.token && <CarryToken x={G.barX} y={G.resultY} value={scene.token.value} />}
      {scene.joined !== null && <JoinedAnswer x={G.barX} y={G.resultY} value={scene.joined} />}

      {scene.moves.map((move) => (
        <MovingValue
          key={`${frame.id}-${move.id}`}
          from={anchor(move.from)}
          to={anchor(move.to)}
          label={move.label}
          tone={move.id === 'adjust' ? 'carry' : move.id.startsWith('dev') ? 'dev' : 'write'}
          duration={moveDuration}
          reducedMotion={reducedMotion}
        />
      ))}
    </svg>
  )
}
