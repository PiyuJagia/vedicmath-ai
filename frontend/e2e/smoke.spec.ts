import { expect, test } from '@playwright/test'
import { API_URL, chooseLevel, startFresh, waitForStage, wakeBackend, watchProblems } from './helpers'

test.beforeEach(async ({ page }) => {
  await wakeBackend(page)
})

test('landing page and navigation', async ({ page }) => {
  const watch = watchProblems(page)
  await startFresh(page, { sampleProgress: true })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Discover the Magic of Vedic Math!' })).toBeVisible()
  await page.screenshot({ path: 'e2e/screenshots/landing.png' })

  const nav = page.getByRole('navigation', { name: 'Main' }).first()
  for (const [link, heading] of [
    ['Explore Sutras', 'Your Journey Through 16 Sutras'],
    ['Play to Win', 'Play to Win'],
    ['My Progress', 'My Progress'],
    ['Settings', 'Settings'],
  ]) {
    await nav.getByRole('link', { name: link }).click()
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
    await expect(nav.getByRole('link', { name: link })).toHaveAttribute('aria-current', 'page')
  }
  expect(watch.problems).toEqual([])
})

test('Sutra Explorer shows 16 Sutras with unlock states', async ({ page }) => {
  await startFresh(page)
  await page.goto('/explore')
  const nodes = page.locator('ol li')
  await expect(nodes).toHaveCount(16)
  // For now every Sutra with lessons is open, even with nothing passed yet.
  for (const name of [/Nikhilam/, /Urdhva Tiryagbhyam/, /Ekadhikena Purvena/]) {
    await expect(page.getByRole('link', { name })).toBeVisible()
  }
  await expect(page.getByRole('button', { name: /Locked/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Paravartya Yojayet.*Coming Soon/ })).toBeVisible()
  await page.screenshot({ path: 'e2e/screenshots/explore.png', fullPage: true })
})

test('direct links and difficulty selection', async ({ page }) => {
  await startFresh(page)
  await page.goto('/sutras/nikhilam/theory?level=beginner')
  await waitForStage(page)
  await expect(page.getByRole('heading', { name: 'Example: 98 × 97' })).toBeVisible()

  await chooseLevel(page, 'Intermediate')
  await expect(page).toHaveURL(/level=intermediate/)
  await expect(page.getByRole('heading', { name: 'Example: 998 × 997' })).toBeVisible()
  await chooseLevel(page, 'Advanced')
  await expect(page).toHaveURL(/level=advanced/)
  await expect(page.getByRole('heading', { name: 'Example: 9998 × 9997' })).toBeVisible()
  await expect(page.getByRole('radio', { name: 'Intermediate' }).first()).not.toBeChecked()

  await page.goto('/sutras/urdhva/theory?level=beginner')
  await waitForStage(page)
  await expect(page.getByRole('heading', { name: 'Example: 23 × 14' })).toBeVisible()
  await page.goto('/sutras/ekadhikena/theory')
  await waitForStage(page)
  await expect(page.getByRole('heading', { level: 1, name: 'Theory' })).toBeVisible()
  await page.goto('/sutras/paravartya')
  await expect(page.getByText(/lessons are coming soon/)).toBeVisible()
})

test('a new learner can open Ekadhikena and its animation completes', async ({ page }) => {
  await startFresh(page)
  await page.goto('/sutras/ekadhikena/learn?level=beginner')
  await waitForStage(page)
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByText(/moment 2 of 6/)).toBeVisible()
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.locator('[data-role="answer"]')).toHaveAttribute('data-value', String(25 * 25))
})

test('lesson data comes from the production API with CORS', async ({ page, baseURL }) => {
  const watch = watchProblems(page)
  await startFresh(page)
  const lessonResponse = page.waitForResponse((response) => response.url().includes('/sutras/nikhilam/lesson'))
  await page.goto('/sutras/nikhilam/learn?level=beginner')
  const response = await lessonResponse
  expect(new URL(response.url()).origin).toBe(new URL(API_URL).origin)
  expect(response.status()).toBe(200)
  expect(response.headers()['access-control-allow-origin']).toBe(new URL(baseURL!).origin)
  const body = await response.json()
  expect(body.result).toBe(96 * 97)
  await waitForStage(page)
  expect(watch.apiRequests.length).toBeGreaterThan(0)
  expect(watch.apiRequests.every((request) => request.url().startsWith(API_URL))).toBe(true)
  expect(watch.problems).toEqual([])
})

test('a failed API request shows a friendly error', async ({ page }) => {
  await startFresh(page)
  await page.route('**/sutras/nikhilam/lesson**', (route) => route.abort('connectionrefused'))
  await page.goto('/sutras/nikhilam/theory')
  await expect(page.getByRole('alert')).toContainText("We couldn't load this lesson.")
  await expect(page.getByRole('alert')).toContainText('The maths engine is not reachable')
})

test('a slow API shows the loading state first', async ({ page }) => {
  await startFresh(page)
  await page.route('**/sutras/nikhilam/lesson**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    await route.continue()
  })
  await page.goto('/sutras/nikhilam/theory')
  await expect(page.getByText('Working out the maths…')).toBeVisible()
  await waitForStage(page)
})

test('settings change real behaviour', async ({ page }) => {
  await startFresh(page)
  await page.goto('/settings')
  await page.getByRole('switch', { name: /Larger text/ }).click()
  await expect(page.locator('html')).toHaveAttribute('data-large-text', 'true')
  await page.getByRole('switch', { name: /Higher contrast/ }).click()
  await expect(page.locator('html')).toHaveAttribute('data-high-contrast', 'true')
  await page.getByLabel('Display name').fill('Mira')
  await expect(page.getByRole('link', { name: /Mira/ })).toBeVisible()
})
