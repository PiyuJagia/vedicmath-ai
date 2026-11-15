import { afterEach, describe, expect, it, vi } from 'vitest'
import { RAW } from '../test/fixtures'
import {
  clearCoachSession,
  createCoachCalculation,
  ensureCoachSession,
  isCoachHandoffEnabled,
  mapCoachCharacter,
  resolveCoachAnimation,
  sendCoachChat,
} from './coachClient'
import type { CoachHandoffResponse, LessonAnimationPayload } from './coachTypes'
import { resolveHandoffLesson } from './handoffLesson'

describe('coach handoff helpers', () => {
  afterEach(() => {
    clearCoachSession()
    vi.unstubAllGlobals()
    sessionStorage.clear()
  })

  it('maps backend character ids onto the existing registry', () => {
    expect(mapCoachCharacter('boy_coach')).toBe('boy')
    expect(mapCoachCharacter('rabbit')).toBe('rabbit')
    expect(mapCoachCharacter('hummingbird')).toBe('hummingbird')
  })

  it('enables the harness in development and for admins', () => {
    expect(isCoachHandoffEnabled('admin')).toBe(true)
    expect(isCoachHandoffEnabled('learner')).toBe(true) // vitest runs with import.meta.env.DEV
  })

  it('retains a coach session id in sessionStorage', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ session_id: 'sess-1' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const first = await ensureCoachSession()
    const second = await ensureCoachSession()
    expect(first).toBe('sess-1')
    expect(second).toBe('sess-1')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(sessionStorage.getItem('vedicmath_coach_session_id')).toBe('sess-1')
  })

  it('creates a calculation and surfaces watch_animation', async () => {
    const lesson = structuredClone(RAW['nikhilam-98x97']) as Record<string, unknown>
    const handoff: CoachHandoffResponse = {
      ok: true,
      message: { text: 'Verified.', character: { id: 'boy_coach', display_name: 'Boy Coach' } },
      calculation: {
        calculation_id: 'calc-1',
        sutra_id: 'nikhilam',
        difficulty: 'beginner',
        numbers: [98, 97],
        result: 9506,
      },
      actions: [
        {
          type: 'watch_animation',
          calculation_id: 'calc-1',
          animation_format: 'grouped',
          auto_open: false,
        },
      ],
      lesson: {
        calculation_id: 'calc-1',
        sutra_id: 'nikhilam',
        sutra: 'nikhilam',
        numbers: [98, 97],
        difficulty: 'beginner',
        result: 9506,
        animation_format: 'grouped',
        teaching_steps: lesson.teaching_steps as unknown[],
        animation_steps: lesson.animation_steps as unknown[],
      },
    }

    const fetchMock = vi.fn(async (input: string) => {
      if (String(input).endsWith('/coach/sessions')) {
        return new Response(JSON.stringify({ session_id: 'sess-2' }), { status: 200 })
      }
      return new Response(
        JSON.stringify({
          ok: true,
          calculation: handoff.calculation,
          teaching_steps: [],
          handoff,
        }),
        { status: 200 },
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    const response = await createCoachCalculation({
      sutra: 'nikhilam',
      a: 98,
      b: 97,
      difficulty: 'beginner',
    })
    expect(response.calculation.calculation_id).toBe('calc-1')
    expect(response.handoff.actions[0]?.type).toBe('watch_animation')
    expect(response.handoff.actions[0]?.calculation_id).toBe('calc-1')
  })

  it('resolves open_animation with the same calculation_id', async () => {
    const lesson = structuredClone(RAW['nikhilam-98x97']) as Record<string, unknown>
    const handoff: CoachHandoffResponse = {
      ok: true,
      message: { text: 'Opening.', character: { id: 'rabbit', display_name: 'Rabbit' } },
      calculation: {
        calculation_id: 'calc-9',
        sutra_id: 'nikhilam',
        difficulty: 'beginner',
        numbers: [98, 97],
        result: 9506,
      },
      actions: [
        {
          type: 'open_animation',
          calculation_id: 'calc-9',
          animation_format: 'grouped',
          auto_open: true,
        },
      ],
      lesson: {
        calculation_id: 'calc-9',
        sutra_id: 'nikhilam',
        sutra: 'nikhilam',
        numbers: [98, 97],
        difficulty: 'beginner',
        result: 9506,
        animation_format: 'grouped',
        teaching_steps: lesson.teaching_steps as unknown[],
        animation_steps: lesson.animation_steps as unknown[],
      },
    }

    sessionStorage.setItem('vedicmath_coach_session_id', 'sess-9')
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(handoff), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await resolveCoachAnimation({
      calculation_id: 'calc-9',
      intent: 'open_animation',
    })
    expect(response.actions[0]?.type).toBe('open_animation')
    expect(response.actions[0]?.auto_open).toBe(true)
    expect(response.calculation?.calculation_id).toBe('calc-9')
    expect(response.lesson?.calculation_id).toBe('calc-9')
  })

  it('posts chat turns to /coach/chat', async () => {
    sessionStorage.setItem('vedicmath_coach_session_id', 'sess-chat')
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          ok: true,
          session_id: 'sess-chat',
          message: { text: 'Namaste!', character: { id: 'boy_coach', display_name: 'Boy Coach' } },
          calculation: null,
          actions: [],
          lesson: null,
          tools_used: [],
        }),
        { status: 200 },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    const reply = await sendCoachChat({
      message: 'Hello coach',
      context: {
        screen: 'theory',
        sutra_id: 'nikhilam',
        difficulty: 'beginner',
        frame_index: 0,
        learner_answer: '12',
      },
    })
    expect(reply.message.text).toBe('Namaste!')
    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/coach/chat')
    const posted = JSON.parse(String(fetchMock.mock.calls[0][1]?.body))
    expect(posted.context.screen).toBe('theory')
    expect(posted.context.learner_answer).toBe('12')
    expect(posted.context).not.toHaveProperty('correct_answer')
  })

  it('surfaces missing calculation errors from the handoff API', async () => {
    sessionStorage.setItem('vedicmath_coach_session_id', 'sess-x')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            detail: { ok: false, code: 'unknown_calculation', message: 'That calculation_id was not found.' },
          }),
          { status: 404 },
        ),
      ),
    )

    await expect(
      resolveCoachAnimation({ calculation_id: 'missing', intent: 'watch_animation' }),
    ).rejects.toMatchObject({ message: 'That calculation_id was not found.', status: 404 })
  })
})

describe('resolveHandoffLesson', () => {
  it('builds a timeline from a grouped nikhilam payload without inventing events', () => {
    const raw = structuredClone(RAW['nikhilam-98x97']) as Record<string, unknown>
    const payload: LessonAnimationPayload = {
      calculation_id: 'calc-grouped',
      sutra_id: 'nikhilam',
      sutra: 'nikhilam',
      numbers: [98, 97],
      difficulty: 'beginner',
      result: 9506,
      animation_format: 'grouped',
      teaching_steps: raw.teaching_steps as unknown[],
      animation_steps: raw.animation_steps as unknown[],
    }

    const resolved = resolveHandoffLesson(payload)
    expect(resolved.status).toBe('ready')
    if (resolved.status !== 'ready') return
    expect(resolved.calculationId).toBe('calc-grouped')
    expect(resolved.sutraId).toBe('nikhilam')
    expect(resolved.lesson.data.result).toBe(9506)
    expect(resolved.timeline.frames.length).toBeGreaterThan(0)
    // Events came from the fixture / engine path only.
    expect(JSON.stringify(resolved.timeline)).not.toContain('fabricated')
  })

  it('does not silently transform flat animation formats', () => {
    const payload: LessonAnimationPayload = {
      calculation_id: 'calc-flat',
      sutra_id: 'yavadunam',
      sutra: 'Yavadunam',
      numbers: [97, 97],
      difficulty: 'beginner',
      result: 9409,
      animation_format: 'flat',
      teaching_steps: [],
      animation_steps: [{ action: 'show_number' }],
    }
    const resolved = resolveHandoffLesson(payload)
    expect(resolved.status).toBe('unsupported_format')
    if (resolved.status !== 'unsupported_format') return
    expect(resolved.format).toBe('flat')
    expect(resolved.message).toMatch(/flat animation format/i)
  })

  it('rejects unsupported sutras even when format is grouped', () => {
    const payload: LessonAnimationPayload = {
      calculation_id: 'calc-x',
      sutra_id: 'yavadunam',
      sutra: 'Yavadunam',
      numbers: [97, 97],
      difficulty: 'beginner',
      result: 9409,
      animation_format: 'grouped',
      teaching_steps: [],
      animation_steps: [],
    }
    const resolved = resolveHandoffLesson(payload)
    expect(resolved.status).toBe('unsupported_sutra')
  })
})
