import { useEffect } from 'react'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LiveCoachProvider, useLiveCoach } from './LiveCoachContext'
import { SettingsProvider } from './SettingsContext'

afterEach(() => vi.unstubAllEnvs())

describe('live coach learning context', () => {
  it('settles repeated inline context patches and still accepts a changed problem', () => {
    vi.stubEnv('VITE_COACH_LIVE', 'false')
    const rendered = vi.fn()
    function LearningPanel({ problem }: { problem: string }) {
      const { context, setContextPatch } = useLiveCoach()
      const patch = { screen: 'practice' as const, problem_label: problem }
      useEffect(() => setContextPatch(patch), [patch, setContextPatch])
      rendered()
      return <p>{context.screen}: {context.problem_label}</p>
    }
    const panel = (problem: string) => (
      <SettingsProvider initial={{ reduceMotion: 'on' }}>
        <LiveCoachProvider><LearningPanel problem={problem} /></LiveCoachProvider>
      </SettingsProvider>
    )
    const view = render(panel('97 × 93'))
    expect(screen.getByText('practice: 97 × 93')).toBeTruthy()
    expect(rendered.mock.calls.length).toBeLessThan(5)
    view.rerender(panel('98 × 94'))
    expect(screen.getByText('practice: 98 × 94')).toBeTruthy()
    expect(rendered.mock.calls.length).toBeLessThan(9)
  })
})
