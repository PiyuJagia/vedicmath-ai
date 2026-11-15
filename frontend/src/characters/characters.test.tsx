import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Providers } from '../app/Providers'
import { NikhilamStage } from '../animation/stage/NikhilamStage'
import { buildTimeline } from '../animation/buildTimeline'
import type { Timeline } from '../animation/types'
import { lessonFixture } from '../test/fixtures'
import { CharacterOrchestrator } from './CharacterContext'
import { CharacterDialogue } from './Characters'
import { SCREEN_ROLES } from './registry'

describe('character orchestration', () => {
  it('has exactly one primary speaker per screen, as planned', () => {
    expect(SCREEN_ROLES.theory.primary).toBe('boy')
    expect(SCREEN_ROLES.practice.primary).toBe('boy')
    expect(SCREEN_ROLES.learn.primary).toBe('rabbit')
    expect(SCREEN_ROLES.play.primary).toBe('hummingbird')
    expect(SCREEN_ROLES.progress.primary).toBe('hummingbird')
    expect(SCREEN_ROLES.onboarding.primary).toBe('boy')
  })

  it('only the primary speaker shows dialogue', () => {
    render(
      <Providers>
        <CharacterOrchestrator screen="learn">
          <CharacterDialogue character="rabbit">Watch the arrow.</CharacterDialogue>
          <CharacterDialogue character="boy">I should stay quiet here.</CharacterDialogue>
          <CharacterDialogue character="hummingbird">Me too.</CharacterDialogue>
        </CharacterOrchestrator>
      </Providers>,
    )
    expect(screen.getByText('Watch the arrow.')).toBeTruthy()
    expect(screen.queryByText('I should stay quiet here.')).toBeNull()
    expect(screen.queryByText('Me too.')).toBeNull()
  })

  it('shows inline maths without raw dollar-sign delimiters', () => {
    render(
      <Providers>
        <CharacterOrchestrator screen="practice">
          <CharacterDialogue character="boy">{'What is one more than $4$? 98 × 97 = $9506$.'}</CharacterDialogue>
        </CharacterOrchestrator>
      </Providers>,
    )
    expect(screen.getByText('What is one more than 4? 98 × 97 = 9506.')).toBeTruthy()
  })

  it('preserves ordinary currency ranges', () => {
    render(
      <Providers>
        <CharacterOrchestrator screen="practice">
          <CharacterDialogue character="boy">{'A book costs $5 to $10.'}</CharacterDialogue>
        </CharacterOrchestrator>
      </Providers>,
    )
    expect(screen.getByText('A book costs $5 to $10.')).toBeTruthy()
  })

  it('labels deterministic lesson text as not live AI', () => {
    render(
      <Providers>
        <CharacterOrchestrator screen="practice">
          <CharacterDialogue character="boy" demo>
            Hello
          </CharacterDialogue>
        </CharacterOrchestrator>
      </Providers>,
    )
    expect(screen.getByText(/Lesson text \(not live AI\)/i)).toBeTruthy()
  })
})

describe('reduced motion', () => {
  const timeline = buildTimeline(lessonFixture('nikhilam-98x97')) as Extract<Timeline, { kind: 'nikhilam' }>
  const moving = timeline.frames.find((frame) => frame.scene.moves.length > 0)!

  function renderStage(reducedMotion: boolean) {
    return render(
      <Providers>
        <NikhilamStage frame={moving} numbers={timeline.display} reducedMotion={reducedMotion} moveDuration={1} />
      </Providers>,
    )
  }

  it('shows the moving value normally', () => {
    const { container } = renderStage(false)
    expect(container.querySelectorAll('[data-tone]').length).toBeGreaterThan(0)
  })

  it('keeps only the still path when motion is reduced, so the information remains', () => {
    const { container } = renderStage(true)
    expect(container.querySelectorAll('g[data-tone]').length).toBe(0)
    expect(container.querySelectorAll('path').length).toBeGreaterThan(0)
    expect(screen.getByRole('img', { name: moving.state })).toBeTruthy()
  })
})
