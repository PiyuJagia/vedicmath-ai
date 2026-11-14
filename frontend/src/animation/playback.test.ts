import { describe, expect, it } from 'vitest'
import { playbackReducer, type PlaybackAction, type PlaybackState } from './playback'

const start: PlaybackState = { index: 0, playing: false, limit: 9, frameCount: 10 }

function run(actions: PlaybackAction[], state = start) {
  return actions.reduce(playbackReducer, state)
}

describe('playbackReducer', () => {
  it('steps forward and back without leaving the range', () => {
    expect(run([{ type: 'previous' }]).index).toBe(0)
    expect(run([{ type: 'next' }, { type: 'next' }]).index).toBe(2)
    expect(run(Array(20).fill({ type: 'next' })).index).toBe(9)
  })

  it('plays to the end and stops there', () => {
    const ticks: PlaybackAction[] = [{ type: 'play' }, ...Array(15).fill({ type: 'tick' })]
    const end = run(ticks)
    expect(end.index).toBe(9)
    expect(end.playing).toBe(false)
  })

  it('pausing stops ticks from advancing', () => {
    const state = run([{ type: 'play' }, { type: 'tick' }, { type: 'pause' }, { type: 'tick' }, { type: 'tick' }])
    expect(state.index).toBe(1)
    expect(state.playing).toBe(false)
  })

  it('pressing play at the end replays from the start', () => {
    const atEnd = run([{ type: 'go', index: 9 }, { type: 'play' }])
    expect(atEnd.index).toBe(0)
    expect(atEnd.playing).toBe(true)
  })

  it('restart always returns to the first moment', () => {
    expect(run([{ type: 'go', index: 6 }, { type: 'restart' }]).index).toBe(0)
  })

  it('replaying gives exactly the same sequence of moments', () => {
    const sequence = (state: PlaybackState) => {
      const seen: number[] = []
      let current = playbackReducer(state, { type: 'play' })
      while (current.playing) {
        seen.push(current.index)
        current = playbackReducer(current, { type: 'tick' })
      }
      return [...seen, current.index]
    }
    const first = sequence(run([{ type: 'go', index: 4 }, { type: 'previous' }]))
    const second = sequence(run([{ type: 'go', index: 3 }]))
    expect(first).toEqual(second)
    expect(sequence(start)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('never moves past the reveal limit', () => {
    const limited = { ...start, limit: 3 }
    expect(run(Array(10).fill({ type: 'next' }), limited).index).toBe(3)
    expect(run([{ type: 'go', index: 8 }], limited).index).toBe(3)
  })

  it('raising the limit plays forward to the newly revealed moments', () => {
    const limited = run([{ type: 'go', index: 3 }], { ...start, limit: 3 })
    const raised = playbackReducer(limited, { type: 'limit', limit: 6, play: true })
    expect(raised.playing).toBe(true)
    const done = run(Array(10).fill({ type: 'tick' }), raised)
    expect(done.index).toBe(6)
    expect(done.playing).toBe(false)
  })

  it('reset puts a new problem at its first moment', () => {
    const reset = run([{ type: 'go', index: 7 }, { type: 'play' }, { type: 'reset', frameCount: 5, limit: 4, index: 0 }])
    expect(reset).toEqual({ index: 0, playing: false, limit: 4, frameCount: 5 })
  })
})
