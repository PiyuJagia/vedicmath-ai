import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Providers } from '../../app/Providers'
import { clearCoachSession } from '../../api/coachClient'
import type { CoachChatResponse, CoachHandoffResponse } from '../../api/coachTypes'
import { RAW } from '../../test/fixtures'
import { CoachHandoffPage } from './CoachHandoffPage'

function wrap(ui: ReactNode) {
  return render(
    <MemoryRouter>
      <Providers>{ui}</Providers>
    </MemoryRouter>,
  )
}

function nikhilamHandoff(overrides: Partial<CoachHandoffResponse> = {}): CoachHandoffResponse {
  const raw = structuredClone(RAW['nikhilam-98x97']) as Record<string, unknown>
  return {
    ok: true,
    message: { text: 'Here is the verified product.', character: { id: 'boy_coach', display_name: 'Boy Coach' } },
    calculation: {
      calculation_id: 'calc-ui',
      sutra_id: 'nikhilam',
      difficulty: 'beginner',
      numbers: [98, 97],
      result: 9506,
    },
    actions: [
      {
        type: 'watch_animation',
        calculation_id: 'calc-ui',
        animation_format: 'grouped',
        auto_open: false,
      },
    ],
    lesson: {
      calculation_id: 'calc-ui',
      sutra_id: 'nikhilam',
      sutra: 'nikhilam',
      numbers: [98, 97],
      difficulty: 'beginner',
      result: 9506,
      animation_format: 'grouped',
      teaching_steps: raw.teaching_steps as unknown[],
      animation_steps: raw.animation_steps as unknown[],
    },
    ...overrides,
  }
}

function chatFromHandoff(handoff: CoachHandoffResponse): CoachChatResponse {
  return {
    ok: true,
    session_id: 'sess-chat',
    message: handoff.message,
    calculation: handoff.calculation,
    actions: handoff.actions,
    lesson: handoff.lesson,
    tools_used: ['calculate_sutra'],
  }
}

describe('CoachHandoffPage', () => {
  afterEach(() => {
    cleanup()
    clearCoachSession()
    sessionStorage.clear()
    vi.unstubAllGlobals()
  })

  it('sends live chat, shows Watch, and opens the stage on click', async () => {
    const handoff = nikhilamHandoff()
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/coach/sessions')) {
        return new Response(JSON.stringify({ session_id: 'sess-ui' }), { status: 200 })
      }
      if (url.endsWith('/coach/chat')) {
        const body = JSON.parse(String(init?.body)) as { message: string }
        expect(body.message).toMatch(/98/)
        return new Response(JSON.stringify(chatFromHandoff(handoff)), { status: 200 })
      }
      if (url.endsWith('/coach/animations')) {
        return new Response(JSON.stringify(handoff), { status: 200 })
      }
      throw new Error(`Unexpected URL ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    wrap(<CoachHandoffPage />)
    await waitFor(() => expect(screen.getByTestId('coach-session-id')).toBeTruthy())

    fireEvent.change(screen.getByTestId('coach-chat-input'), {
      target: { value: 'What is 98 × 97 with nikhilam?' },
    })
    fireEvent.click(screen.getByTestId('coach-chat-send'))

    await waitFor(() => expect(screen.getByTestId('watch-animation-button')).toBeTruthy())
    expect(screen.getAllByTestId('chat-learner').length).toBeGreaterThan(0)
    expect(screen.getAllByTestId('chat-coach').length).toBeGreaterThan(0)
    expect(screen.getByTestId('coach-calculation').textContent).toContain('9506')

    fireEvent.click(screen.getByTestId('watch-animation-button'))
    await waitFor(() => expect(screen.getByTestId('coach-handoff-stage')).toBeTruthy())
  })

  it('opens the stage for structured open_animation from chat', async () => {
    const watch = nikhilamHandoff()
    const opened = nikhilamHandoff({
      message: { text: 'Opening the verified animation.', character: { id: 'rabbit', display_name: 'Rabbit' } },
      actions: [
        {
          type: 'open_animation',
          calculation_id: 'calc-ui',
          animation_format: 'grouped',
          auto_open: true,
        },
      ],
    })

    let chatCalls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string, init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/coach/sessions')) {
          return new Response(JSON.stringify({ session_id: 'sess-open' }), { status: 200 })
        }
        if (url.endsWith('/coach/chat')) {
          chatCalls += 1
          const body = JSON.parse(String(init?.body)) as { animation_intent?: string }
          if (chatCalls === 1) {
            return new Response(JSON.stringify(chatFromHandoff(watch)), { status: 200 })
          }
          expect(body.animation_intent).toBe('open_animation')
          return new Response(JSON.stringify(chatFromHandoff(opened)), { status: 200 })
        }
        throw new Error(`Unexpected URL ${url}`)
      }),
    )

    wrap(<CoachHandoffPage />)
    await waitFor(() => expect(screen.getByTestId('coach-session-id')).toBeTruthy())

    fireEvent.change(screen.getByTestId('coach-chat-input'), {
      target: { value: 'Calculate 98 times 97 with nikhilam beginner.' },
    })
    fireEvent.click(screen.getByTestId('coach-chat-send'))
    await waitFor(() => expect(screen.getByTestId('coach-calculation')).toBeTruthy())

    fireEvent.click(screen.getByTestId('request-open-animation'))
    await waitFor(() => expect(screen.getByTestId('coach-handoff-stage')).toBeTruthy())
    expect(screen.getAllByText(/Opening the verified animation/i).length).toBeGreaterThan(0)
  })

  it('shows API errors from chat', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string) => {
        const url = String(input)
        if (url.endsWith('/coach/sessions')) {
          return new Response(JSON.stringify({ session_id: 'sess-err' }), { status: 200 })
        }
        return new Response(
          JSON.stringify({
            detail: { ok: false, code: 'coach_unavailable', message: 'The coach is temporarily unavailable.' },
          }),
          { status: 503 },
        )
      }),
    )

    wrap(<CoachHandoffPage />)
    await waitFor(() => expect(screen.getByTestId('coach-session-id')).toBeTruthy())
    fireEvent.change(screen.getByTestId('coach-chat-input'), { target: { value: 'Hello' } })
    fireEvent.click(screen.getByTestId('coach-chat-send'))
    await waitFor(() => expect(screen.getByTestId('coach-handoff-error')).toBeTruthy())
    expect(screen.getByTestId('coach-handoff-error').textContent).toMatch(/unavailable/i)
  })

  it('keeps the calculate shortcut for Watch animation', async () => {
    const handoff = nikhilamHandoff()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string) => {
        const url = String(input)
        if (url.endsWith('/coach/sessions')) {
          return new Response(JSON.stringify({ session_id: 'sess-calc' }), { status: 200 })
        }
        if (url.endsWith('/coach/calculations')) {
          return new Response(
            JSON.stringify({
              ok: true,
              calculation: handoff.calculation,
              teaching_steps: [],
              handoff,
            }),
            { status: 200 },
          )
        }
        if (url.endsWith('/coach/animations')) {
          return new Response(JSON.stringify(handoff), { status: 200 })
        }
        throw new Error(url)
      }),
    )

    wrap(<CoachHandoffPage />)
    await waitFor(() => expect(screen.getByTestId('coach-session-id')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /Shortcut: Calculate 98/i }))
    await waitFor(() => expect(screen.getByTestId('watch-animation-button')).toBeTruthy())
    fireEvent.click(screen.getByTestId('watch-animation-button'))
    await waitFor(() => expect(screen.getByTestId('coach-handoff-stage')).toBeTruthy())
  })
})
