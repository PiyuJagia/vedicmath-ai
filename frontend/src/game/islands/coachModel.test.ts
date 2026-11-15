import { describe, expect, it } from 'vitest'
import { coachInput, readGameState, type GameState } from './coachModel'
const state: GameState = { type: 'islands:state', difficulty: 'advanced', a: 97, b: 104, base: 100, step: 2, question: 'Deviation of 104?', hint: 'Use base minus number.', status: 'playing', answer: null }
describe('game agent context', () => {
  it('keeps world difficulty separate from mathematical base', () => {
    const input = coachInput(state, 'Why negative?')
    expect(input.context.difficulty).toBe('beginner')
    expect(input.context.problem_label).toBe('97 × 104')
    expect(input.context.question_key).toBe('islands:97:104:2')
    expect(input.message).toContain('Sky Citadel')
    expect(input.message).toContain('do not reveal the correct option')
  })
  it('passes actual feedback without inventing checks', () => {
    expect(coachInput(state, 'Help').context.check_status).toBeNull()
    expect(coachInput({ ...state, status: 'incorrect', answer: 4 }, 'Help').context).toMatchObject({ learner_answer: '4', check_status: 'incorrect' })
  })
  it('rejects malformed and wrong-world messages', () => {
    expect(readGameState(state, 'advanced')).toEqual(state)
    for (const bad of [null, {}, { ...state, difficulty: 'beginner' }, { ...state, a: Infinity }, { ...state, base: 30 }, { ...state, step: 99 }, { ...state, answer: '4' }]) expect(readGameState(bad, 'advanced')).toBeNull()
  })
})
