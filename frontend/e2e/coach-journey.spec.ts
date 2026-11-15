import { expect, test, type Page } from '@playwright/test'
import { startFresh, watchProblems } from './helpers'

/**
 * Tollgate 6C: Theory → Practice → Theory live coach continuity.
 * Requires local Vite + backend with /coach/chat.
 */
const LOCAL_API = (process.env.E2E_API_URL ?? 'http://127.0.0.1:8000').replace(/\/+$/, '')

async function askLiveCoach(page: Page, message: string) {
  const panel = page.getByTestId('live-coach-panel')
  await expect(panel).toBeVisible()
  const replyLocator = page.getByTestId('live-coach-reply')
  const previousId =
    (await replyLocator.count()) > 0 ? await replyLocator.getAttribute('data-reply-id') : null
  await page.getByTestId('live-coach-input').fill(message)
  await page.getByTestId('live-coach-send').click()
  await expect(replyLocator).toBeVisible({ timeout: 120_000 })
  if (previousId) {
    await expect(replyLocator).not.toHaveAttribute('data-reply-id', previousId, { timeout: 120_000 })
  } else {
    await expect(replyLocator).toHaveAttribute('data-reply-id', /.+/u, { timeout: 120_000 })
  }
  return replyLocator
}

test.describe('coach learning journey (local)', () => {
  test.beforeEach(async ({ page }) => {
    const health = await page.request.get(`${LOCAL_API}/`)
    expect(health.ok()).toBe(true)
    const sessions = await page.request.post(`${LOCAL_API}/coach/sessions`)
    test.skip(!sessions.ok(), 'Local /coach/sessions unavailable')
  })

  test('Theory → Practice → Theory keeps coach session history', async ({ page }) => {
    test.setTimeout(360_000)
    const watch = watchProblems(page)
    await startFresh(page, { admin: true, reduceMotion: true })
    // Clear coach session once before the journey (not on every subsequent navigation).
    await page.goto('/sutras/nikhilam/theory?level=beginner')
    await page.evaluate(() => {
      sessionStorage.removeItem('vedicmath_coach_session_id')
      sessionStorage.removeItem('vedicmath_coach_chat_history')
    })
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Theory' })).toBeVisible({ timeout: 90_000 })
    await expect(page.getByTestId('live-coach-toggle')).toBeVisible({ timeout: 30_000 })
    await page.getByTestId('live-coach-toggle').click()
    await expect(page.getByTestId('live-coach-panel')).toBeVisible()

    const theoryReply = await askLiveCoach(
      page,
      'Remember my journey name is Mira and I am on Theory for Nikhilam. Reply briefly as Rishi.',
    )
    await expect(theoryReply).toContainText(/mira/i, { timeout: 5_000 })
    await page.screenshot({ path: 'e2e/screenshots/coach-journey-theory.png', fullPage: true })

    await page.goto('/sutras/nikhilam/practice?level=beginner')
    await expect(page.getByRole('heading', { name: 'Practice with Coach' })).toBeVisible({ timeout: 90_000 })
    await page.getByTestId('live-coach-toggle').click()
    await expect(page.getByTestId('live-coach-panel')).toBeVisible({ timeout: 30_000 })
    // History from Theory should still be in sessionStorage → last coach reply visible
    await expect(page.getByTestId('live-coach-reply')).toContainText(/mira/i, { timeout: 15_000 })

    const practiceReply = await askLiveCoach(
      page,
      'I am now on Practice. As Rabbit only, give a short hint about complements. No invented products.',
    )
    await expect(practiceReply).toHaveAttribute('data-character', 'rabbit', { timeout: 5_000 })
    await page.screenshot({ path: 'e2e/screenshots/coach-journey-practice.png', fullPage: true })

    await page.goto('/sutras/nikhilam/theory?level=beginner')
    await expect(page.getByRole('heading', { name: 'Theory' })).toBeVisible({ timeout: 90_000 })
    await page.getByTestId('live-coach-toggle').click()
    await expect(page.getByTestId('live-coach-reply')).toBeVisible()

    const finalReply = await askLiveCoach(
      page,
      'What journey name did I share earlier, and which sutra am I studying? Answer in one short sentence.',
    )
    const finalText = (await finalReply.innerText()).toLowerCase()
    expect(finalText).toContain('mira')
    expect(finalText).toMatch(/nikhilam/)

    await page.screenshot({ path: 'e2e/screenshots/coach-journey-theory-return.png', fullPage: true })

    const coachHttpErrors = watch.problems.filter((p) => p.includes('/coach/') && p.startsWith('HTTP'))
    expect(coachHttpErrors).toEqual([])
  })
})
