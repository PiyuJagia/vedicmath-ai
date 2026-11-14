import { useCallback, useEffect, useReducer } from 'react'

export interface PlaybackState {
  index: number
  playing: boolean
  /** Highest frame the learner may see; Practice raises it as steps are answered. */
  limit: number
  frameCount: number
}

export type PlaybackAction =
  | { type: 'next' }
  | { type: 'previous' }
  | { type: 'go'; index: number }
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'restart' }
  | { type: 'tick' }
  | { type: 'reset'; frameCount: number; limit: number; index: number }
  | { type: 'limit'; limit: number; play: boolean }

const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high)

export function playbackReducer(state: PlaybackState, action: PlaybackAction): PlaybackState {
  const last = Math.min(state.limit, state.frameCount - 1)
  switch (action.type) {
    case 'next':
      return { ...state, index: clamp(state.index + 1, 0, last), playing: false }
    case 'previous':
      return { ...state, index: clamp(state.index - 1, 0, last), playing: false }
    case 'go':
      return { ...state, index: clamp(action.index, 0, last), playing: false }
    case 'play':
      // Playing from the end starts again from the beginning.
      return { ...state, index: state.index >= last ? 0 : state.index, playing: last > 0 }
    case 'pause':
      return { ...state, playing: false }
    case 'restart':
      return { ...state, index: 0, playing: last > 0 }
    case 'tick': {
      if (!state.playing) return state
      const index = clamp(state.index + 1, 0, last)
      return { ...state, index, playing: index < last }
    }
    case 'reset': {
      const limit = clamp(action.limit, 0, action.frameCount - 1)
      return { frameCount: action.frameCount, limit, index: clamp(action.index, 0, limit), playing: false }
    }
    case 'limit': {
      const limit = clamp(action.limit, 0, state.frameCount - 1)
      return { ...state, limit, index: Math.min(state.index, limit), playing: action.play && state.index < limit }
    }
  }
}

interface UsePlaybackOptions {
  frameCount: number
  /** Changing the key (a new problem) resets playback to its starting state. */
  resetKey: string
  /** Milliseconds per frame at 1× speed. */
  dwellMs?: number
  speed?: number
  limit?: number
  /** Frame to show first; used for deep links such as ?moment=7. */
  startIndex?: number
}

export function usePlayback({ frameCount, resetKey, dwellMs = 2600, speed = 1, limit, startIndex = 0 }: UsePlaybackOptions) {
  const effectiveLimit = limit ?? frameCount - 1
  const [state, dispatch] = useReducer(playbackReducer, undefined, () => {
    const capped = clamp(effectiveLimit, 0, frameCount - 1)
    return { frameCount, limit: capped, index: clamp(startIndex, 0, capped), playing: false }
  })

  useEffect(() => {
    const capped = clamp(effectiveLimit, 0, frameCount - 1)
    dispatch({ type: 'reset', frameCount, limit: capped, index: clamp(startIndex, 0, capped) })
    // Only a new problem resets playback; limit changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, frameCount])

  useEffect(() => {
    if (limit === undefined) return
    dispatch({ type: 'limit', limit, play: true })
  }, [limit])

  useEffect(() => {
    if (!state.playing) return
    const timer = window.setTimeout(() => dispatch({ type: 'tick' }), dwellMs / speed)
    return () => window.clearTimeout(timer)
  }, [state.playing, state.index, dwellMs, speed])

  return {
    ...state,
    next: useCallback(() => dispatch({ type: 'next' }), []),
    previous: useCallback(() => dispatch({ type: 'previous' }), []),
    go: useCallback((index: number) => dispatch({ type: 'go', index }), []),
    play: useCallback(() => dispatch({ type: 'play' }), []),
    pause: useCallback(() => dispatch({ type: 'pause' }), []),
    restart: useCallback(() => dispatch({ type: 'restart' }), []),
  }
}

export type Playback = ReturnType<typeof usePlayback>
