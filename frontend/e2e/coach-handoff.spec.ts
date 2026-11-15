import { expect, test } from '@playwright/test'
import { startFresh, watchProblems } from './helpers'

/**
 * Local Tollgate 6B checks for /coach-handoff.
 * Run with:
 *   E2E_BASE_URL=http://localhost:5173 E2E_API_URL=http://127.0.0.1:8000 npx playwright test e2e/coach-handoff.spec.ts
 */
const LOCAL_API = (process.env.E2E_API_URL ?? 'http://127.0.0.1:8000').replace(/\/+$/, '')

test.describe('coach handoff (local)', () => {
  test.beforeEach(async ({ page }) => {
    // Prefer local backend health; skip suite if coach routes are missing.
    const health = await page.request.get(`${LOCAL_API}/`)
    expect(health.ok()).toBe(true)
    const sessions = await page.request.post(`${LOCAL_API}/coach/sessions`)
    test.skip(!sessions.ok(), 'Local /coach/sessions unavailable — start backend.main:app with Tollgate 6 routes')
  })

  test('chat, watch button, and stage open', async ({ page }) => {
    const watch = watchProblems(page)
    await startFresh(page, { admin: true, reduceMotion: true })
    await page.goto('/coach-handoff')

    await expect(page.getByTestId('coach-handoff-page')).toBeVisible()
    await expect(page.getByTestId('coach-session-id')).toBeVisible({ timeout: 30_000 })

    await page.getByTestId('coach-chat-input').fill(
      'Use calculate_sutra for nikhilam beginner with a=98 and b=97. Reply with the verified result.',
    )
    await page.getByTestId('coach-chat-send').click()

    await expect(page.getByTestId('watch-animation-button')).toBeVisible({ timeout: 120_000 })
    await expect(page.getByTestId('coach-calculation')).toContainText('9506')
    await expect(page.getByTestId('chat-coach').last()).toBeVisible()

    await page.getByTestId('watch-animation-button').click()
    await expect(page.getByTestId('coach-handoff-stage')).toBeVisible({ timeout: 60_000 })
    await page.screenshot({ path: 'e2e/screenshots/coach-handoff-watch.png', fullPage: true })

    // Structured open path
    await page.getByTestId('request-open-animation').click()
    await expect(page.getByTestId('coach-handoff-stage')).toBeVisible({ timeout: 120_000 })
    await page.screenshot({ path: 'e2e/screenshots/coach-handoff-open.png', fullPage: true })

    // Refresh keeps session id storage (page remounts session from sessionStorage)
    const before = await page.getByTestId('coach-session-id').innerText()
    await page.reload()
    await expect(page.getByTestId('coach-session-id')).toBeVisible({ timeout: 30_000 })
    const after = await page.getByTestId('coach-session-id').innerText()
    expect(after).toContain(before.replace('Session ', '').trim().slice(0, 8))

    // Filter noisy production CDN failures when pointing elsewhere; local should be clean of coach errors.
    const serious = watch.problems.filter((p) => !p.includes('favicon'))
    expect(serious.filter((p) => p.includes('/coach/')).length).toBe(0)
  })

  test('persona prompts render without crashing', async ({ page }) => {
    await startFresh(page, { admin: true, reduceMotion: true })
    await page.goto('/coach-handoff')
    await expect(page.getByTestId('coach-session-id')).toBeVisible({ timeout: 30_000 })

    await page.getByTestId('coach-chat-input').fill('I feel stuck and sad. Encourage me as Hummingbird.')
    await page.getByTestId('coach-chat-send').click()
    await expect(page.getByTestId('chat-coach').last()).toBeVisible({ timeout: 120_000 })

    await page.getByTestId('coach-chat-input').fill('As Rabbit, hint about a carry arrow. No numbers.')
    await page.getByTestId('coach-chat-send').click()
    await expect(page.getByTestId('chat-coach').last()).toBeVisible({ timeout: 120_000 })
    await page.screenshot({ path: 'e2e/screenshots/coach-handoff-personas.png', fullPage: true })
  })
})
