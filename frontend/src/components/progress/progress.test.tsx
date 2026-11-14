import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MasteryLegend, MasteryRings } from './MasteryRings'
import { ProgressRing } from './ProgressRing'

describe('MasteryRings', () => {
  it('describes each level in words', () => {
    render(<MasteryRings subject="Nikhilam" mastery={{ beginner: true, intermediate: false, advanced: false }} />)

    expect(
      screen.getByRole('img', {
        name: 'Nikhilam mastery: Beginner passed, Intermediate not yet passed, Advanced not yet passed',
      }),
    ).toBeTruthy()
  })

  it('marks only passed levels as complete', () => {
    const { container } = render(
      <MasteryRings subject="Urdhva" mastery={{ beginner: true, intermediate: true, advanced: false }} />,
    )
    const rings = Array.from(container.querySelectorAll('circle'))

    expect(rings.map((ring) => [ring.dataset.level, ring.dataset.passed])).toEqual([
      ['beginner', 'true'],
      ['intermediate', 'true'],
      ['advanced', 'false'],
    ])
  })

  it('draws Beginner as the outer ring and Advanced as the inner ring', () => {
    const { container } = render(
      <MasteryRings subject="Any" mastery={{ beginner: false, intermediate: false, advanced: false }} />,
    )
    const radius = (level: string) =>
      Number(container.querySelector(`circle[data-level="${level}"]`)?.getAttribute('r'))

    expect(radius('beginner')).toBeGreaterThan(radius('intermediate'))
    expect(radius('intermediate')).toBeGreaterThan(radius('advanced'))
  })

  it('labels every level in the legend', () => {
    render(<MasteryLegend />)
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Beginner',
      'Intermediate',
      'Advanced',
    ])
  })
})

describe('ProgressRing', () => {
  it('announces the value as words and shows the fraction', () => {
    render(<ProgressRing value={2} total={16} unit="Sutras" />)

    const ring = screen.getByRole('img', { name: '2 of 16 Sutras' })
    expect(ring.textContent).toContain('2/16')
    expect(ring.textContent).toContain('Sutras')
  })

  it('handles a total of zero without breaking', () => {
    render(<ProgressRing value={0} total={0} unit="Sutras" />)
    expect(screen.getByRole('img', { name: '0 of 0 Sutras' })).toBeTruthy()
  })
})
