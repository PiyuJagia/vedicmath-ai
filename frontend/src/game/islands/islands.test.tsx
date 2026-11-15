import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '../../app/AppRoutes'
import { Providers } from '../../app/Providers'
import { EMPTY_PROGRESS, SAMPLE_PROGRESS, type ProgressState } from '../../services/progressModel'
import { islandLevel, isWorldCompletion } from './model'

beforeEach(() => {
  localStorage.clear()
  vi.stubEnv('VITE_COACH_LIVE', 'false')
})
afterEach(() => vi.unstubAllEnvs())

function open(path: string, progress: ProgressState = EMPTY_PROGRESS, admin = false) {
  return render(
    <Providers settings={{ reduceMotion: 'on', role: admin ? 'admin' : 'learner' }} progress={progress}>
      <MemoryRouter initialEntries={[path]}><AppRoutes /></MemoryRouter>
    </Providers>,
  )
}

describe('Islands of Courage unlocks', () => {
  it('keeps the replaced game locked until Nikhilam practice is passed', () => {
    open('/play')
    expect(screen.getByRole('heading', { name: 'Islands of Courage' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Play Islands of Courage' })).toBeNull()
  })

  it('launches the Nikhilam level that was passed', () => {
    open('/play', SAMPLE_PROGRESS)
    expect(screen.getByRole('link', { name: 'Play Islands of Courage' }).getAttribute('href')).toBe('/play/islands?level=beginner')
    fireEvent.click(screen.getByRole('radio', { name: 'Intermediate' }))
    expect(screen.queryByRole('link', { name: 'Play Islands of Courage' })).toBeNull()
  })

  it('does not unlock the Nikhilam game through another Sutra', () => {
    open('/play', { ...EMPTY_PROGRESS, mastery: { ekadhikena: { beginner: true, intermediate: true, advanced: true } } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Sutra' }), { target: { value: 'ekadhikena' } })
    expect(screen.queryByRole('link', { name: 'Play Islands of Courage' })).toBeNull()
    expect(screen.getByText(/Choose Nikhilam above/)).toBeTruthy()
  })

  it('protects a locked level opened by direct URL', () => {
    open('/play/islands?level=advanced', SAMPLE_PROGRESS)
    expect(screen.getByRole('link', { name: 'Practise Nikhilam Advanced' }).getAttribute('href')).toBe('/sutras/nikhilam/practice?level=advanced')
    expect(document.querySelector('iframe')).toBeNull()
  })

  it('disables worlds whose practice is not passed', () => {
    open('/play/islands', SAMPLE_PROGRESS)
    const frame = screen.getByTitle('Islands of Courage — Sapphire Sea')
    expect(frame.getAttribute('src')).toContain('level=beginner&motion=off')
    expect((screen.getByRole('radio', { name: 'Intermediate' }) as HTMLInputElement).disabled).toBe(true)
    expect((screen.getByRole('radio', { name: 'Advanced' }) as HTMLInputElement).disabled).toBe(true)
  })

  it('preserves the existing admin bypass for every difficulty', () => {
    open('/play/islands?level=advanced', EMPTY_PROGRESS, true)
    expect(screen.getByTitle('Islands of Courage — Sky Citadel')).toBeTruthy()
    expect((screen.getByRole('radio', { name: 'Intermediate' }) as HTMLInputElement).disabled).toBe(false)
  })
})

describe('game completion bridge', () => {
  const completion = { type: 'islands:complete', difficulty: 'beginner', a: 97, b: 93, base: 100, result: 9021, leaps: 6 }

  it('records a badge without granting practice mastery', () => {
    open('/play/islands', SAMPLE_PROGRESS)
    const frame = screen.getByTitle('Islands of Courage — Sapphire Sea') as HTMLIFrameElement
    act(() => window.dispatchEvent(new MessageEvent('message', { origin: window.location.origin, source: frame.contentWindow, data: completion })))
    expect(screen.getByText('Badge earned · Sapphire Sea')).toBeTruthy()
    expect(JSON.parse(localStorage.getItem('vedicmath-ai:islands-of-courage') ?? '{}')).toEqual({ beginner: 1 })
    expect(localStorage.getItem('vedicmath-ai:progress')).toBeNull()
    expect((screen.getByRole('radio', { name: 'Advanced' }) as HTMLInputElement).disabled).toBe(true)
  })

  it('ignores messages from other origins or other windows', () => {
    open('/play/islands', SAMPLE_PROGRESS)
    const frame = screen.getByTitle('Islands of Courage — Sapphire Sea') as HTMLIFrameElement
    act(() => {
      window.dispatchEvent(new MessageEvent('message', { origin: 'https://other.example', source: frame.contentWindow, data: completion }))
      window.dispatchEvent(new MessageEvent('message', { origin: window.location.origin, source: window, data: completion }))
    })
    expect(screen.queryByText('Badge earned · Sapphire Sea')).toBeNull()
  })

  it('rejects invalid maths, wrong levels, and incomplete crossings', () => {
    expect(isWorldCompletion({ ...completion, result: 1 }, 'beginner')).toBe(false)
    expect(isWorldCompletion(completion, 'advanced')).toBe(false)
    expect(isWorldCompletion({ ...completion, leaps: 1 }, 'beginner')).toBe(false)
  })

  it('defaults an invalid level to beginner', () => {
    expect(islandLevel('not-a-level')).toBe('beginner')
  })
})
