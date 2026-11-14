import type { LessonSutraId } from '../api/types'

export type Tone = 'write' | 'carry' | 'dev' | 'strong' | 'ghost'

export type Segment = string | { text: string; tone: Tone }

export interface WorkLine {
  segments: Segment[]
  faded?: boolean
}

/** Words that go with one frame. State is shown in the explanation panel and as the text alternative. */
export interface Narration {
  state: string
  rabbit: string
  coach: string
}

export interface FrameMeta extends Narration {
  id: string
  stepId: number
  stepTitle: string
}

// ---------- Nikhilam ----------

export type TileState = 'normal' | 'active' | 'muted'
export type ChipState = 'hidden' | 'empty' | 'normal' | 'active' | 'muted'
export type NikhilamAnchor = 'work' | 'a' | 'b' | 'devA' | 'devB' | 'left' | 'rightLast' | 'rightFirst'

export interface NikhilamScene {
  base: 'hidden' | 'normal' | 'active'
  numberLine: boolean
  a: TileState
  b: TileState
  devA: ChipState
  devB: ChipState
  work: WorkLine[]
  left: { kind: 'hidden' } | { kind: 'empty' } | { kind: 'value'; value: number; active: boolean }
  right:
    | { kind: 'hidden' }
    | { kind: 'cells'; cells: (string | null)[]; active: boolean[] }
    | { kind: 'wide'; value: number; tone: 'warn' | 'active' }
  joined: number | null
  lines: { id: 'cross-a' | 'cross-b' | 'multiply'; faded: boolean }[]
  moves: { id: string; from: NikhilamAnchor; to: NikhilamAnchor; label: string }[]
  token: { value: number } | null
}

// ---------- Urdhva ----------

export type UrdhvaAnchor =
  | { kind: 'work' }
  | { kind: 'lane'; column: number }
  | { kind: 'answer'; column: number }

export interface UrdhvaScene {
  digitsA: string[]
  digitsB: string[]
  columns: number
  pairs: { positionA: number; positionB: number }[]
  written: Record<number, number>
  activeColumns: number[]
  lane: Record<number, number>
  laneGhost: Record<number, number>
  joined: number | null
  workTitle: string
  work: WorkLine[]
  moves: { id: string; from: UrdhvaAnchor; to: UrdhvaAnchor; label: string; tone: 'carry' | 'write' }[]
}

// ---------- Ekadhikena ----------

export interface EkadhikenaScene {
  number: number
  split: boolean
  previous: TileState
  lastDigit: TileState
  next: 'hidden' | TileState
  link: boolean
  plusOne: boolean
  work: WorkLine[]
  left: { kind: 'hidden' } | { kind: 'empty' } | { kind: 'value'; value: number; active: boolean }
  right: { kind: 'hidden' } | { kind: 'empty' } | { kind: 'value'; value: number; active: boolean }
  joined: number | null
  moves: { id: string; from: 'work' | 'previous'; to: 'left' | 'next'; label: string }[]
}

export type NikhilamFrame = FrameMeta & { scene: NikhilamScene }
export type UrdhvaFrame = FrameMeta & { scene: UrdhvaScene }
export type EkadhikenaFrame = FrameMeta & { scene: EkadhikenaScene }

interface TimelineBase {
  /** Stable identity of the lesson, used to reset playback when the problem changes. */
  key: string
  problemLabel: string
  steps: { id: number; title: string }[]
  result: number
}

export type Timeline =
  | (TimelineBase & {
      kind: 'nikhilam'
      frames: NikhilamFrame[]
      display: { a: number; b: number; base: number; devA: number; devB: number }
    })
  | (TimelineBase & { kind: 'urdhva'; frames: UrdhvaFrame[] })
  | (TimelineBase & {
      kind: 'ekadhikena'
      frames: EkadhikenaFrame[]
      display: { previous: number; lastDigit: number; next: number }
    })

export type AnyFrame = Timeline['frames'][number]

export type { LessonSutraId }
