import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { NAV_ITEMS, isNavItemActive } from '../components/layout/navigation'
import { AppRoutes } from './AppRoutes'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

function activeSection(): string[] {
  const navs = screen.getAllByRole('navigation', { name: 'Main' })
  return navs.map((nav) => within(nav).getByRole('link', { current: 'page' }).textContent ?? '')
}

describe('routes', () => {
  it.each([
    ['/', 'Discover the Magic of Vedic Math!'],
    ['/explore', 'Your Journey Through 16 Sutras'],
    ['/sutras/nikhilam', 'Sutra: nikhilam'],
    ['/sutras/nikhilam/theory', 'Theory'],
    ['/sutras/nikhilam/learn', "Let's Learn More"],
    ['/sutras/nikhilam/practice', 'Practice with Coach'],
    ['/play', 'Play to Win'],
    ['/progress', 'My Progress'],
    ['/settings', 'Settings'],
    ['/design-system', 'Design system'],
    ['/onboarding', "Let's set up your profile"],
    ['/no-such-page', 'Page not found'],
  ])('%s shows "%s"', (path, heading) => {
    renderAt(path)
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeTruthy()
  })

  it('shows the sample learner in the top bar', () => {
    renderAt('/')
    expect(screen.getByRole('link', { name: /Arjun/ }).getAttribute('title')).toBe('Sample profile for development')
  })

  it('hides the main navigation during onboarding', () => {
    renderAt('/onboarding')
    expect(screen.queryAllByRole('navigation', { name: 'Main' })).toHaveLength(0)
  })
})

describe('navigation', () => {
  it('highlights Explore Sutras on Sutra pages in both the top bar and tab bar', () => {
    renderAt('/sutras/nikhilam/theory')
    expect(activeSection()).toEqual(['Explore Sutras', 'Explore'])
  })

  it('highlights the matching section', () => {
    renderAt('/progress')
    expect(activeSection()).toEqual(['My Progress', 'Progress'])
  })

  it('marks no section on the home page', () => {
    renderAt('/')
    for (const nav of screen.getAllByRole('navigation', { name: 'Main' })) {
      expect(within(nav).queryByRole('link', { current: 'page' })).toBeNull()
    }
  })

  it('does not treat a shared prefix as a match', () => {
    const play = NAV_ITEMS.find((item) => item.to === '/play')!
    expect(isNavItemActive(play, '/play')).toBe(true)
    expect(isNavItemActive(play, '/play/rocket')).toBe(true)
    expect(isNavItemActive(play, '/playground')).toBe(false)
  })

  it('marks the current breadcrumb', () => {
    renderAt('/sutras/nikhilam/practice')
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(breadcrumb).getByText('Practice with Coach').getAttribute('aria-current')).toBe('page')
    expect(within(breadcrumb).getByRole('link', { name: 'nikhilam' }).getAttribute('href')).toBe('/sutras/nikhilam')
  })
})
