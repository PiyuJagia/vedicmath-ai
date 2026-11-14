import { expect, type Page, type Request } from '@playwright/test'

export const API_URL = (process.env.E2E_API_URL ?? 'https://vedicmath-ai.onrender.com').replace(/\/+$/, '')

/** Free Render services sleep; wake the backend before timing-sensitive tests. */
export async function wakeBackend(page: Page) {
  const response = await page.request.get(`${API_URL}/`, { timeout: 120_000 })
  expect(response.ok()).toBe(true)
}

/** Start with a clean learner and reduced motion, so animation frames render instantly. */
export async function startFresh(page: Page, options: { admin?: boolean; sampleProgress?: boolean; reduceMotion?: boolean } = {}) {
  await page.addInitScript(
    ({ admin, sampleProgress, reduceMotion }) => {
      if (sessionStorage.getItem('qa-initialised')) return
      sessionStorage.setItem('qa-initialised', 'yes')
      localStorage.clear()
      localStorage.setItem('vedicmath-ai:settings', JSON.stringify({ role: admin ? 'admin' : 'learner', reduceMotion: reduceMotion ? 'on' : 'off' }))
      if (!sampleProgress) {
        localStorage.setItem('vedicmath-ai:progress', JSON.stringify({ mastery: {}, explored: [], history: [], streakDays: 0, isSample: false }))
      }
    },
    { admin: options.admin ?? false, sampleProgress: options.sampleProgress ?? false, reduceMotion: options.reduceMotion ?? true },
  )
}

/** Records console errors, page crashes and failed or erroring network requests. */
export function watchProblems(page: Page) {
  const problems: string[] = []
  const apiRequests: Request[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => problems.push(`page error: ${error.message}`))
  page.on('requestfailed', (request) => problems.push(`request failed: ${request.method()} ${request.url()} (${request.failure()?.errorText})`))
  page.on('request', (request) => {
    if (['fetch', 'xhr'].includes(request.resourceType()) && request.url().includes('/sutras/')) apiRequests.push(request)
  })
  page.on('response', (response) => {
    if (response.status() >= 400) problems.push(`HTTP ${response.status()}: ${response.request().method()} ${response.url()}`)
  })
  return { problems, apiRequests }
}

export const stage = (page: Page) => page.locator('svg[role="img"][aria-label]').first()

export async function waitForStage(page: Page) {
  await expect(stage(page)).toBeVisible({ timeout: 90_000 })
}

/** What the animation stage currently shows, read from its data attributes. */
export async function readStage(page: Page) {
  return stage(page).evaluate((svg) => {
    const dash = (text: string | null) => (text ?? '').replace(/\u2212/g, '-')
    const all = (selector: string) => Array.from(svg.querySelectorAll(selector))
    const box = (element: Element | null) => {
      if (!element) return null
      const rect = (element.querySelector('rect') ?? element) as SVGGraphicsElement
      const b = rect.getBBox()
      return { x: b.x, y: b.y, width: b.width, height: b.height, cx: b.x + b.width / 2, cy: b.y + b.height / 2 }
    }
    const byId = (role: string, id: string) => svg.querySelector(`[data-role="${role}"][data-id="${id}"]`)
    const values: Record<string, string | null> = {}
    for (const element of all('[data-role][data-id]')) {
      values[`${element.getAttribute('data-role')}:${element.getAttribute('data-id')}`] = element.getAttribute('data-value')
    }
    const states: Record<string, string | null> = {}
    for (const element of all('[data-role="tile"][data-id]')) states[element.getAttribute('data-id')!] = element.getAttribute('data-state')
    const lines = all('[data-role="math-line"]').map((line) => ({
      id: line.getAttribute('data-id'),
      faded: line.getAttribute('data-faded') === 'true',
      x1: Number(line.getAttribute('x1')),
      y1: Number(line.getAttribute('y1')),
      x2: Number(line.getAttribute('x2')),
      y2: Number(line.getAttribute('y2')),
    }))
    const boxes: Record<string, ReturnType<typeof box>> = {}
    for (const element of all('[data-role][data-id]')) boxes[element.getAttribute('data-id')!] = box(element)
    return {
      label: svg.getAttribute('aria-label') ?? '',
      values,
      states,
      lines,
      boxes,
      base: svg.querySelector('[data-role="base"]')?.getAttribute('data-value') ?? null,
      answer: svg.querySelector('[data-role="answer"]')?.getAttribute('data-value') ?? null,
      work: all('[data-role="work-line"]').map((line) => dash(line.textContent)),
      carries: all('[data-role="carry"]').map((token) => ({ id: token.getAttribute('data-id'), value: token.getAttribute('data-value'), ghost: token.getAttribute('data-ghost') === 'true' })),
      moving: all('[data-role="moving-value"]').map((group) => group.getAttribute('data-value')),
      hasNumberA: Boolean(byId('tile', 'number_a')),
    }
  })
}

export async function moment(page: Page): Promise<{ current: number; total: number }> {
  const text = (await page.getByText(/moment \d+ of \d+/).textContent()) ?? ''
  const match = /moment (\d+) of (\d+)/.exec(text)
  return { current: Number(match?.[1]), total: Number(match?.[2]) }
}

export async function goToMoment(page: Page, target: number) {
  for (let guard = 0; guard < 60; guard++) {
    const { current } = await moment(page)
    if (current === target) return
    await page.getByRole('button', { name: current < target ? 'Next' : 'Previous', exact: true }).click()
  }
  throw new Error(`could not reach moment ${target}`)
}

/** Fades last half a second; screenshots should show the resting picture. */
export const settle = (page: Page) => page.waitForTimeout(700)

/** Distance from a point to the nearest edge of a box (0 when inside it). */
export function distanceToBox(x: number, y: number, b: { x: number; y: number; width: number; height: number }) {
  const dx = Math.max(b.x - x, 0, x - (b.x + b.width))
  const dy = Math.max(b.y - y, 0, y - (b.y + b.height))
  return Math.hypot(dx, dy)
}

/** The router applies a level change in a transition, so wait for the radio rather than reading it at once. */
export async function chooseLevel(page: Page, label: 'Beginner' | 'Intermediate' | 'Advanced') {
  const radio = page.getByRole('radio', { name: label }).first()
  await radio.click({ force: true })
  await expect(radio).toBeChecked()
}

export const signed = (n: number) => (n > 0 ? `+${n}` : String(n).replace('-', '\u2212'))
