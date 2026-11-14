import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NAV_ITEMS, isNavItemActive } from '../components/layout/navigation'
import { SAMPLE_PROGRESS } from '../services/progressModel'
import { QUESTIONS, RAW } from '../test/fixtures'
import { AppRoutes } from './AppRoutes'
import { Providers } from './Providers'

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => {
      const url = String(input)
      const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
      if (url.includes('/nikhilam/lesson')) return json(RAW['nikhilam-98x97'])
      if (url.includes('/nikhilam/questions')) return json(QUESTIONS['nikhilam-98x97'])
      return new Response('{}', { status: 404 })
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderAt(path: string) {
  return render(
    <Providers settings={{ reduceMotion: 'on' }} progress={SAMPLE_PROGRESS}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </Providers>,
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
    ['/sutras/nikhilam', 'Nikhilam'],
    ['/sutras/nikhilam/theory', 'Theory'],
    ['/sutras/nikhilam/learn', "Let's Learn More"],
    ['/sutras/nikhilam/practice', 'Practice with Coach'],
    ['/sutras/ekadhikena/theory', 'Theory'],
    ['/sutras/paravartya', 'Paravartya Yojayet'],
    ['/play', 'Play to Win'],
    ['/progress', 'My Progress'],
    ['/settings', 'Settings'],
    ['/design-system', 'Design system'],
    ['/onboarding', 'Welcome to VedicMath AI'],
    ['/no-such-page', 'Page not found'],
  ])('%s shows "%s"', async (path, heading) => {
    renderAt(path)
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeTruthy()
  })

  it('loads the Theory example from the backend', async () => {
    renderAt('/sutras/nikhilam/theory')
    expect(await screen.findByRole('heading', { name: 'Example: 98 × 97' })).toBeTruthy()
    expect(await screen.findByRole('img', { name: /Tile A holds 98/ })).toBeTruthy()
  })

  it('shows the learner in the top bar', () => {
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
    expect(within(breadcrumb).getByRole('link', { name: 'Nikhilam' }).getAttribute('href')).toBe('/sutras/nikhilam?level=beginner')
  })
})
