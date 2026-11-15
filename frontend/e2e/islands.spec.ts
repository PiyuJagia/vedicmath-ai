import { test, expect, type Page, type FrameLocator } from '@playwright/test'

const empty = { mastery: {}, explored: [], history: [], streakDays: 0, isSample: false }
const iframeTitle = /Islands of Courage —/

async function prepare(page: Page, mastery: Record<string, object> = {}, admin = false) {
  await page.addInitScript(({ mastery, admin, empty }) => {
    localStorage.clear()
    localStorage.setItem('vedicmath-ai:settings', JSON.stringify({ role: admin ? 'admin' : 'learner', reduceMotion: 'on' }))
    localStorage.setItem('vedicmath-ai:progress', JSON.stringify({ ...empty, mastery }))
  }, { mastery, admin, empty })
  // Existing app coach is preserved; test without spending AI quota or depending on Render wake-up.
  await page.route('**/coach/**', (route) => route.fulfill({ json: {
    ok: true, session_id: 'islands-browser-check', message: { text: 'Ready for your adventure.', character: { id: 'hummingbird' } },
    calculation: null, actions: [], lesson: null, tools_used: [],
  } }))
}

async function ready(page: Page): Promise<FrameLocator> {
  const frame = page.frameLocator('iframe[title^="Islands of Courage"]')
  await expect(frame.locator('#loading')).toBeHidden({ timeout: 60_000 })
  await expect(frame.locator('[data-answer]')).toHaveCount(3)
  return frame
}

async function cross(frame: FrameLocator, answers: number[], offset = 0) {
  for (let i = 0; i < answers.length; i++) {
    await frame.locator(`[data-answer="${answers[i]}"]`).click()
    if (i < answers.length - 1) await expect(frame.locator('#step')).toContainText(`Leap ${i + 2 + offset} of`)
  }
  await expect(frame.getByRole('heading', { name: 'You found your courage.' })).toBeVisible()
}

test('locked URLs and the card retain Nikhilam practice gates', async ({ page }) => {
  await prepare(page)
  await page.goto('/play')
  await expect(page.getByRole('heading', { name: 'Islands of Courage', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Play Islands of Courage' })).toHaveCount(0)
  await page.goto('/play/islands?level=advanced')
  await expect(page.getByRole('link', { name: 'Practise Nikhilam Advanced' })).toBeVisible()
  await expect(page.getByTitle(iframeTitle)).toHaveCount(0)
  await page.goto('/games/islands-of-courage/index.html?level=advanced&screen=win')
  await expect(page).toHaveURL(/\/play\/islands\?level=advanced/)
  await expect(page.getByTitle(iframeTitle)).toHaveCount(0)
})

test('passed Beginner opens the game, records a badge, and leaves other practice levels locked', async ({ page }) => {
  const issues: string[] = []
  page.on('pageerror', (error) => issues.push(error.message))
  const resources: string[] = []
  page.on('request', (request) => resources.push(request.url()))
  await prepare(page, { nikhilam: { beginner: true, intermediate: false, advanced: false } })
  await page.goto('/play')
  await expect(page.getByRole('link', { name: 'Play Islands of Courage' })).toBeVisible()
  expect(resources.some((url) => url.includes('/games/islands-of-courage/assets/'))).toBe(false)
  await page.getByRole('link', { name: 'Play Islands of Courage' }).click()
  const frame = await ready(page)
  await expect(page.getByRole('radio', { name: 'Intermediate', exact: true })).toBeDisabled()
  await expect(page.getByRole('radio', { name: 'Advanced', exact: true })).toBeDisabled()
  await expect(frame.locator('[data-level]')).toHaveCount(0)
  await expect(frame.locator('[data-screen]')).toHaveCount(0)
  expect(resources.some((url) => /lava-realistic|sky-realistic|castle-realistic/.test(url))).toBe(false)
  const jumping = await frame.locator('canvas').evaluate(async (canvas) => {
    (document.querySelector('[data-answer="100"]') as HTMLButtonElement).click()
    await new Promise((resolve) => setTimeout(resolve, 180))
    return { z: Number(canvas.dataset.playerZ), camera: Number(canvas.dataset.cameraZ), phase: canvas.dataset.phase }
  })
  expect(jumping.phase).toBe('jump')
  expect(jumping.camera).toBe(0)
  expect(jumping.z).toBeGreaterThan(0)
  await expect(frame.locator('#step')).toContainText('Leap 2 of 6')
  await cross(frame, [3, 7, 90, 21, 9021], 1)
  await expect(page.getByText('Badge earned · Sapphire Sea')).toBeVisible()
  const stored = await page.evaluate(() => ({ badges: JSON.parse(localStorage.getItem('vedicmath-ai:islands-of-courage')!), progress: JSON.parse(localStorage.getItem('vedicmath-ai:progress')!) }))
  expect(stored.badges).toEqual({ beginner: 1 })
  expect(stored.progress.mastery.nikhilam).toEqual({ beginner: true, intermediate: false, advanced: false })
  await frame.locator('#again').click()
  await frame.locator('[data-answer="10"]').click()
  await expect(frame.getByRole('heading', { name: 'A splash. A fresh start.' })).toBeVisible()
  await frame.locator('#again').click()
  await expect(frame.locator('#step')).toContainText('Leap 1 of 6')
  await frame.locator('#exit').click()
  await expect(page).toHaveURL(/\/play$/)
  await expect(page.getByRole('link', { name: 'Play Number Rocket' })).toBeVisible()
  expect(issues).toEqual([])
})

test('admin can play all three worlds without changing learner practice mastery', async ({ page }) => {
  const issues: string[] = []
  page.on('pageerror', (error) => issues.push(error.message))
  await prepare(page, {}, true)
  await page.goto('/play/islands?level=intermediate')
  await cross(await ready(page), [100, -3, -4, 107, 12, 10712])
  await expect(page.getByText('Badge earned · Ember Keep')).toBeVisible()
  await page.getByRole('radio', { name: 'Advanced', exact: true }).click({ force: true })
  await expect(page.getByRole('radio', { name: 'Advanced', exact: true })).toBeChecked()
  await cross(await ready(page), [100, 3, -4, 101, -12, 100, 88, 10088])
  await expect(page.getByText('Badge earned · Sky Citadel')).toBeVisible()
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('vedicmath-ai:progress')!))
  expect(stored.mastery).toEqual({})
  expect(issues).toEqual([])
})

test('each passed world is playable on mobile without clipped answers', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await prepare(page, { nikhilam: { beginner: true, intermediate: true, advanced: true } })
  await page.goto('/play/islands')
  for (const level of ['Beginner', 'Intermediate', 'Advanced']) {
    await page.getByRole('radio', { name: level, exact: true }).click({ force: true })
    await expect(page.getByRole('radio', { name: level, exact: true })).toBeChecked()
    const frame = await ready(page)
    const boxes = await frame.locator('[data-answer]').evaluateAll((els) => els.map((el) => ({ left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right })))
    expect(boxes.every((box) => box.left >= 0 && box.right <= 390)).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})
