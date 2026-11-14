import type { UrdhvaAnchor, UrdhvaFrame } from '../types'
import { workLineY, type Point } from './geometry'
import { CarryToken, Caption, JoinedAnswer, MathLine, MovingValue, StageDefs, Tile, WorkPanel } from './primitives'
import styles from './Stage.module.css'

const COLUMN = 58
const LEFT_MARGIN = 64
const ROWS = { a: 44, b: 122, rule: 153, lane: 182, answer: 238 }

interface Props {
  frame: UrdhvaFrame
  reducedMotion: boolean
  moveDuration: number
}

export function UrdhvaStage({ frame, reducedMotion, moveDuration }: Props) {
  const scene = frame.scene
  const columns = scene.columns
  // Place 0 is the units column on the right.
  const xForPlace = (place: number) => LEFT_MARGIN + 22 + (columns - 1 - place) * COLUMN
  const xForColumn = (column: number) => xForPlace(column - 1)
  const placeA = (position: number) => scene.digitsA.length - 1 - position
  const placeB = (position: number) => scene.digitsB.length - 1 - position

  const work = { x: LEFT_MARGIN + columns * COLUMN + 18, y: 20, width: 206, height: 262 }
  const width = work.x + work.width + 12
  const wide = width > 560

  const usedA = new Set(scene.pairs.map((p) => p.positionA))
  const usedB = new Set(scene.pairs.map((p) => p.positionB))
  const focus = scene.pairs.length > 0
  const longest = Math.max(scene.digitsA.length, scene.digitsB.length)

  const place = (target: Exclude<UrdhvaAnchor, { kind: 'work' }>): Point =>
    target.kind === 'lane'
      ? { x: xForColumn(target.column) + 16, y: ROWS.lane }
      : { x: xForColumn(target.column) + 22, y: ROWS.answer }

  // Values leave or enter the working panel level with their row, so their path never crosses the digit tiles.
  const route = (from: UrdhvaAnchor, to: UrdhvaAnchor): [Point, Point] => {
    if (from.kind === 'work' && to.kind !== 'work') {
      const end = place(to)
      return [{ x: work.x + 2, y: end.y }, end]
    }
    if (to.kind === 'work' && from.kind !== 'work') {
      const start = place(from)
      return [start, { x: work.x + 2, y: start.y }]
    }
    if (from.kind !== 'work' && to.kind !== 'work') return [place(from), { ...place(to), y: ROWS.answer - 22 }]
    return [{ x: work.x + 2, y: workLineY(work.y, 0, 27) }, { x: work.x + 2, y: workLineY(work.y, 1, 27) }]
  }

  return (
    <div className={styles.scroller}>
      <svg viewBox={`0 0 ${width} 300`} className={`${styles.stage} ${wide ? styles.wide : ''}`} role="img" aria-label={frame.state}>
        <StageDefs />
        {scene.digitsA.map((digit, index) => (
          <Tile
            key={`a-${index}`}
            x={xForPlace(placeA(index))}
            y={ROWS.a}
            label={digit}
            state={usedA.has(index) ? 'active' : focus ? 'muted' : 'normal'}
            width={44}
            height={44}
            size={24}
          />
        ))}
        {scene.digitsB.map((digit, index) => (
          <Tile
            key={`b-${index}`}
            x={xForPlace(placeB(index))}
            y={ROWS.b}
            label={digit}
            state={usedB.has(index) ? 'active' : focus ? 'muted' : 'normal'}
            width={44}
            height={44}
            size={24}
          />
        ))}
        <Caption x={xForPlace(longest - 1) - 46} y={ROWS.b}>
          <tspan fontSize={22}>×</tspan>
        </Caption>
        <line x1={xForColumn(columns) - 26} y1={ROWS.rule} x2={xForColumn(1) + 26} y2={ROWS.rule} className={styles.rule} />

        {scene.pairs.map((pair) => (
          <MathLine
            key={`${frame.id}-${pair.positionA}-${pair.positionB}`}
            from={{ x: xForPlace(placeA(pair.positionA)), y: ROWS.a + 25 }}
            to={{ x: xForPlace(placeB(pair.positionB)), y: ROWS.b - 25 }}
          />
        ))}

        <Caption x={30} y={ROWS.lane}>
          carry
        </Caption>
        <Caption x={30} y={ROWS.answer}>
          answer
        </Caption>

        {Array.from({ length: columns }, (_, index) => {
          const column = index + 1
          const x = xForColumn(column)
          return (
            <g key={column}>
              <circle cx={x} cy={ROWS.lane} r={15} className={styles.laneSlot} />
              {scene.lane[column] !== undefined && <CarryToken x={x} y={ROWS.lane} value={scene.lane[column]} />}
              {scene.laneGhost[column] !== undefined && <CarryToken x={x} y={ROWS.lane} value={scene.laneGhost[column]} ghost />}
              {scene.joined === null &&
                (scene.written[column] !== undefined ? (
                  <Tile x={x} y={ROWS.answer} label={scene.written[column]} state={scene.activeColumns.includes(column) ? 'active' : 'normal'} width={44} height={44} size={24} />
                ) : (
                  <Tile x={x} y={ROWS.answer} label="" state="empty" width={44} height={44} />
                ))}
            </g>
          )
        })}

        {scene.joined !== null && <JoinedAnswer x={(xForColumn(1) + xForColumn(columns)) / 2} y={ROWS.answer} value={scene.joined} />}
        <WorkPanel {...work} title={scene.workTitle} lines={scene.work} gap={27} />

        {scene.moves.map((move) => (
          <MovingValue
            key={`${frame.id}-${move.id}`}
            from={route(move.from, move.to)[0]}
            to={route(move.from, move.to)[1]}
            arc={move.from.kind === 'work' || move.to.kind === 'work' ? 6 : 18}
            label={move.label}
            tone={move.tone}
            duration={moveDuration}
            reducedMotion={reducedMotion}
          />
        ))}
      </svg>
    </div>
  )
}
