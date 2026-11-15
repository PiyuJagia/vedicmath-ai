import { expect, test } from '@playwright/test'
import { startFresh } from './helpers'

const LOCAL_API = (process.env.E2E_API_URL ?? 'http://127.0.0.1:8010').replace(/\/+$/, '')

test.describe('Rishi teaching UX audit (local)', () => {
  test.beforeEach(async ({ page }) => {
    const health = await page.request.get(`${LOCAL_API}/`)
    expect(health.ok()).toBe(true)
    const sessions = await page.request.post(`${LOCAL_API}/coach/sessions`)
    test.skip(!sessions.ok(), 'Local /coach/sessions unavailable')
  })

  test('Theory Ask discoverability and density', async ({ page }) => {
    await startFresh(page, { admin: true, reduceMotion: true })
    await page.goto('/sutras/nikhilam/theory?level=beginner')
    await expect(page.getByRole('heading', { name: 'Theory' })).toBeVisible({ timeout: 90_000 })
    await expect(page.getByTestId('live-coach-toggle')).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/rishi-audit-theory-collapsed.png', fullPage: true })
    await page.getByTestId('live-coach-toggle').click()
    await expect(page.getByTestId('live-coach-panel')).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/rishi-audit-theory-expanded.png', fullPage: true })
  })

  test('Practice dual coach surfaces (demo + live)', async ({ page }) => {
    await startFresh(page, { admin: true, reduceMotion: true })
    await page.goto('/sutras/nikhilam/practice?level=beginner')
    await expect(page.getByRole('heading', { name: 'Practice with Coach' })).toBeVisible({ timeout: 90_000 })
    await expect(page.getByText(/Lesson coach \(scripted\)/i).first()).toBeVisible()
    await expect(page.getByTestId('live-coach-toggle')).toBeVisible()
    await page.getByTestId('live-coach-toggle').click()
    await expect(page.getByTestId('live-coach-panel')).toBeVisible()
    await expect(page.getByTestId('live-coach-toggle')).toContainText(/Rishi/i)
    await page.screenshot({ path: 'e2e/screenshots/rishi-audit-practice.png', fullPage: true })
  })

  test('mobile Theory coach access', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await startFresh(page, { admin: true, reduceMotion: true })
    await page.goto('/sutras/nikhilam/theory?level=beginner')
    await expect(page.getByTestId('live-coach-toggle')).toBeVisible({ timeout: 90_000 })
    await page.getByTestId('live-coach-toggle').click()
    await expect(page.getByTestId('live-coach-input')).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/rishi-audit-theory-mobile.png', fullPage: true })
  })
})
