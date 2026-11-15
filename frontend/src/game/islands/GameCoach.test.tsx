import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GameCoach } from './GameCoach'
const ask = vi.fn()
vi.mock('../../services/LiveCoachContext', () => ({ useLiveCoach: () => ({ ask, enabled: true }) }))
describe('game coach bridge', () => {
  it('ignores foreign sources and late replies after moving to a new step', async () => {
    const frame = document.createElement('iframe')
    document.body.appendChild(frame)
    const ref = { current: frame }
    const view = render(<GameCoach frame={ref} difficulty="beginner" />)
    const state = { type: 'islands:state', difficulty: 'beginner', a: 97, b: 93, base: 100, step: 0, question: 'Which base?', hint: 'Nearest power of ten.', status: 'playing', answer: null }
    fireEvent.click(screen.getByRole('button', { name: 'Ask Rishi' }))
    const explain = screen.getByRole('button', { name: 'Explain this step' }) as HTMLButtonElement
    act(() => window.dispatchEvent(new MessageEvent('message', { origin: location.origin, source: window, data: state })))
    expect(explain.disabled).toBe(true)
    act(() => window.dispatchEvent(new MessageEvent('message', { origin: location.origin, source: frame.contentWindow, data: state })))
    let resolve!: (value: unknown) => void
    ask.mockImplementationOnce(() => new Promise(done => { resolve = done }))
    fireEvent.click(explain)
    expect(ask.mock.calls[0][0].context.problem_label).toBe('97 × 93')
    act(() => window.dispatchEvent(new MessageEvent('message', { origin: location.origin, source: frame.contentWindow, data: { ...state, step: 1, question: 'Shortfall of 97?' } })))
    await act(async () => resolve({ isLive: true, text: 'Stale answer', speaker: 'boy' }))
    expect(screen.queryByText('Stale answer')).toBeNull()
    expect(explain.disabled).toBe(false)
    ask.mockResolvedValueOnce({ isLive: false, text: '', error: 'Offline', speaker: 'boy' })
    fireEvent.click(explain)
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('You can keep playing'))
    view.unmount()
    frame.remove()
  })
})
