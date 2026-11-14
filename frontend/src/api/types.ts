import type { Difficulty } from '../types/learning'

/** Sutras that have a Python engine and an animation renderer. */
export type LessonSutraId = 'nikhilam' | 'urdhva' | 'ekadhikena'

/** Operands as the backend expects them: two numbers, or one number to square. */
export type Problem = { a: number; b: number } | { number: number }

export interface AnimationEvent {
  action: string
  [field: string]: unknown
}

// ---------- Nikhilam (deviation = base - number) ----------

export type NikhilamOperand = 'number_a' | 'number_b'
export type NikhilamDeviation = 'deviation_a' | 'deviation_b'

export interface NikhilamBaseStep {
  id: number
  type: 'base'
  title: string
  base: number
  numbers: [number, number]
  right_digits: number
}

export interface NikhilamDeviationsStep {
  id: number
  type: 'deviations'
  title: string
  convention: string
  deviations: [number, number]
  calculations: {
    operand: NikhilamOperand
    target: NikhilamDeviation
    base: number
    number: number
    deviation: number
  }[]
}

export interface NikhilamCrossStep {
  id: number
  type: 'cross_subtract'
  title: string
  left_part: number
  cross_calculations: {
    operand: NikhilamOperand
    deviation_operand: NikhilamDeviation
    number: number
    deviation: number
    value: number
  }[]
}

export interface NikhilamMultiplyStep {
  id: number
  type: 'multiply_deviations'
  title: string
  deviations: [number, number]
  right_part: number
  formatted_right: string
}

export interface NikhilamAdjustStep {
  id: number
  type: 'adjust'
  title: string
  adjustment: 'borrow' | 'carry'
  carry: number
  amount: number
  base: number
  left_before: number
  left_after: number
  right_before: number
  right_after: number
  right_change: number
}

export interface NikhilamCombineStep {
  id: number
  type: 'combine'
  title: string
  original_left: number
  original_right: number
  adjustment: 'none' | 'borrow' | 'carry'
  carry: number
  left_part: number
  right_part: number
  right_digits: number
  padding_zeros: number
  formatted_right: string
  result: number
}

export type NikhilamStep =
  | NikhilamBaseStep
  | NikhilamDeviationsStep
  | NikhilamCrossStep
  | NikhilamMultiplyStep
  | NikhilamAdjustStep
  | NikhilamCombineStep

export interface GroupedAnimationStep {
  step_id: number
  title: string
  type: string
  events: AnimationEvent[]
}

export interface NikhilamLesson {
  sutra: 'nikhilam'
  numbers: [number, number]
  difficulty: Difficulty
  teaching_steps: NikhilamStep[]
  animation_steps: GroupedAnimationStep[]
  result: number
}

// ---------- Urdhva Tiryagbhyam ----------

export interface UrdhvaProduct {
  digit_a: number
  digit_b: number
  /** Digit position counted from the left of each number. */
  position_a: number
  position_b: number
  product: number
}

export interface UrdhvaIntroStep {
  id: number
  type: 'introduction'
  title: string
  numbers: [number, number]
  difficulty: Difficulty
}

export interface UrdhvaColumnStep {
  id: number
  type: 'multiplication_column' | 'final_carry'
  title: string
  products: UrdhvaProduct[]
  subtotal: number
  incoming_carry: number
  total: number
  write_digit: number
  outgoing_carry: number
  animation_events: AnimationEvent[]
}

export interface UrdhvaCombineStep {
  id: number
  type: 'combine'
  title: string
  result: number
}

export type UrdhvaStep = UrdhvaIntroStep | UrdhvaColumnStep | UrdhvaCombineStep

export interface UrdhvaLesson {
  sutra: 'urdhva'
  numbers: [number, number]
  difficulty: Difficulty
  teaching_steps: UrdhvaStep[]
  animation_steps: GroupedAnimationStep[]
  result: number
}

// ---------- Ekadhikena Purvena ----------

export interface EkadhikenaTeachingStep {
  step: number
  title: string
  explanation: string
}

export interface EkadhikenaLesson {
  sutra: string
  numbers: [number, number]
  difficulty: Difficulty
  teaching_steps: EkadhikenaTeachingStep[]
  animation_steps: AnimationEvent[]
  result: number
}

export type Lesson =
  | { kind: 'nikhilam'; data: NikhilamLesson }
  | { kind: 'urdhva'; data: UrdhvaLesson }
  | { kind: 'ekadhikena'; data: EkadhikenaLesson }

// ---------- Practice ----------

export interface PracticeQuestion {
  key: string
  step_id: number
  answer_type: 'integer' | 'digits'
  digits?: number
}

export interface QuestionsResponse {
  sutra: string
  numbers: [number, number]
  difficulty: Difficulty
  questions: PracticeQuestion[]
}

/** The same shape for every Sutra and difficulty level. */
export interface CheckResponse {
  sutra: string
  numbers: [number, number]
  difficulty: Difficulty
  question: string
  step_id: number
  answer_type: 'integer' | 'digits'
  submitted_answer: string
  status: 'correct' | 'incorrect' | 'invalid'
  is_correct: boolean
  /** Filled in only when the answer is incorrect. */
  correct_answer: string | null
  mistake: 'sign' | 'missing_padding' | null
  message: string | null
}

export interface CheckAllResponse {
  sutra: string
  numbers: [number, number]
  difficulty: Difficulty
  total_questions: number
  answered: number
  correct: number
  all_correct: boolean
  results: CheckResponse[]
}
