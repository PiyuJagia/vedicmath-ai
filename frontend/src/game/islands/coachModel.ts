import type { Difficulty } from '../../types/learning'
import type { LiveCoachAskInput } from '../../services/liveCoach'
import { WORLD_NAMES } from './model'

export interface GameState {
  type: 'islands:state'; difficulty: Difficulty; a: number; b: number; base: number
  step: number; question: string; hint: string
  status: 'playing' | 'correct' | 'incorrect' | 'complete'; answer: number | null
}
export function readGameState(value: unknown, difficulty: Difficulty): GameState | null {
  if (!value || typeof value !== 'object') return null
  const d = value as GameState
  if (d.type !== 'islands:state' || d.difficulty !== difficulty) return null
  if (![d.a, d.b, d.base, d.step].every(Number.isSafeInteger) || d.a < 1 || d.b < 1 || d.a > 10000 || d.b > 10000 || ![100, 1000].includes(d.base) || d.step < 0 || d.step > 7) return null
  if (typeof d.question !== 'string' || d.question.length > 250 || typeof d.hint !== 'string' || d.hint.length > 300) return null
  if (!['playing', 'correct', 'incorrect', 'complete'].includes(d.status) || (d.answer !== null && !Number.isSafeInteger(d.answer))) return null
  return d
}
export function coachInput(state: GameState, message: string): LiveCoachAskInput {
  return {
    intent: 'explain',
    message: `Islands of Courage game. World: ${WORLD_NAMES[state.difficulty]} (${state.difficulty}). Puzzle: ${state.a} × ${state.b}. Base: ${state.base}. This game uses shortfall deviations: base minus number, so above-base deviations are negative. Current question: ${state.question}. Step guidance: ${state.hint}. Game status: ${state.status}. Last selected answer: ${state.answer ?? 'none'}. The game owns correctness, jumps and badges; do not claim to change them. World difficulty is distinct from mathematical base. Give a brief supportive explanation; do not reveal the correct option or final product while playing. Learner asks: ${message}`,
    context: {
      screen: 'play', sutra_id: 'nikhilam', difficulty: state.base === 100 ? 'beginner' : 'intermediate',
      problem_label: `${state.a} × ${state.b}`, step_id: state.step + 1, step_title: state.question,
      frame_index: null, frame_state: state.status, question_key: `islands:${state.a}:${state.b}:${state.step}`,
      learner_answer: state.answer === null ? null : String(state.answer),
      check_status: state.status === 'correct' || state.status === 'incorrect' ? state.status : null,
      hint_level: 0, hint_count: 0, preferred_persona: 'rishi',
      progress_note: `Islands of Courage: ${WORLD_NAMES[state.difficulty]}, game level ${state.difficulty}, step ${state.step + 1}, status ${state.status}. No practice mastery is awarded by this game.`,
    },
  }
}
