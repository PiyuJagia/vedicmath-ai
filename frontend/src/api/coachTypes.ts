/** Typed mirrors of the Tollgate 5A `/coach/*` handoff contract. */

export type CoachCharacterId = 'boy_coach' | 'rabbit' | 'hummingbird'

export type AnimationFormat = 'grouped' | 'flat'

export type AnimationIntent = 'watch_animation' | 'open_animation'

export interface CoachCharacterIdentity {
  id: CoachCharacterId
  display_name: string
}

export interface VerifiedCalculationRef {
  calculation_id: string
  sutra_id: string
  difficulty: string
  numbers: number[]
  result: number
}

export interface AgentMessage {
  text: string
  character: CoachCharacterIdentity
}

export interface WatchAnimationAction {
  type: 'watch_animation'
  calculation_id: string
  animation_format: AnimationFormat
  auto_open: false
}

export interface OpenAnimationAction {
  type: 'open_animation'
  calculation_id: string
  animation_format: AnimationFormat
  auto_open: true
}

export type UiAction = WatchAnimationAction | OpenAnimationAction

export interface LessonAnimationPayload {
  calculation_id: string
  sutra_id: string
  sutra: string
  numbers: number[]
  difficulty: string
  result: number
  animation_format: AnimationFormat
  teaching_steps: unknown[]
  animation_steps: unknown[]
}

export interface CoachHandoffResponse {
  ok: true
  message: AgentMessage
  calculation: VerifiedCalculationRef | null
  actions: UiAction[]
  lesson: LessonAnimationPayload | null
}

export interface CreateSessionResponse {
  session_id: string
}

export interface CalculateResponse {
  ok: true
  calculation: VerifiedCalculationRef
  teaching_steps: unknown[]
  handoff: CoachHandoffResponse
}

export interface CalculateRequest {
  session_id: string
  sutra: string
  difficulty?: string
  a?: number
  b?: number
  number?: number
  offer_watch?: boolean
  character_id?: CoachCharacterId
  text?: string
}

export interface AnimationResolveRequest {
  session_id: string
  calculation_id: string
  intent: AnimationIntent
  character_id?: CoachCharacterId
  text?: string
}

export interface HandoffErrorBody {
  ok: false
  code: string
  message: string
}

export type LearningScreen =
  | 'theory'
  | 'practice'
  | 'learn'
  | 'handoff'
  | 'onboarding'
  | 'play'
  | 'rocket'
  | 'progress'
  | 'explore'

/** Structured learning context — never authoritative for maths answers. */
export interface CoachLearningContext {
  screen: LearningScreen
  sutra_id?: string | null
  difficulty?: string | null
  problem_label?: string | null
  step_id?: number | null
  step_title?: string | null
  frame_index?: number | null
  frame_state?: string | null
  question_key?: string | null
  /** Learner draft / last submission — untrusted. */
  learner_answer?: string | null
  /** Deterministic engine check status only. */
  check_status?: 'correct' | 'incorrect' | 'invalid' | null
  hint_level?: number | null
  hint_count?: number | null
  event?: string | null
  progress_note?: string | null
  preferred_persona?: 'rishi' | 'rabbit' | 'hummingbird' | null
}

export interface CoachChatRequest {
  session_id: string
  message: string
  animation_intent?: AnimationIntent | null
  calculation_id?: string | null
  context?: CoachLearningContext | null
}

export interface CoachChatResponse {
  ok: true
  session_id: string
  message: AgentMessage
  calculation: VerifiedCalculationRef | null
  actions: UiAction[]
  lesson: LessonAnimationPayload | null
  tools_used: string[]
}

export interface CoachChatHistoryItem {
  id: string
  role: 'learner' | 'coach'
  text: string
  characterId?: CoachCharacterId
  calculationId?: string
  result?: number
  at: number
}
