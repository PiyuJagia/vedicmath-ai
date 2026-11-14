import { expect, test } from '@playwright/test'
import { goToMoment, moment, settle, stage, startFresh, waitForStage, wakeBackend, watchProblems } from './helpers'

test.beforeEach(async ({ page }) => {
  await wakeBackend(page)
})

const PAGES = [
  ['home', '/'],
  ['explore', '/explore'],
  ['theory', '/sutras/nikhilam/theory?level=beginner'],
  ['practice', '/sutras/nikhilam/practice?level=beginner'],
  ['urdhva-advanced', '/sutras/urdhva/learn?level=advanced'],
  ['progress', '/progress'],
] as const

for (const [name, path] of PAGES) {
  test(`mobile ${name}: no sideways page scroll and the tab bar is reachable`, async ({ page }) => {
    const watch = watchProblems(page)
    await startFresh(page, { admin: path.includes('/urdhva/') })
    await page.goto(path)
    if (path.includes('/sutras/')) await waitForStage(page)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(1)

    const tabBar = page.getByRole('navigation', { name: 'Main' }).last()
    await expect(tabBar).toBeVisible()
    await expect(tabBar.getByRole('link', { name: 'Explore' })).toBeVisible()
    await page.screenshot({ path: `e2e/screenshots/mobile-${name}.png`, fullPage: true })
    expect(watch.problems).toEqual([])
  })
}

test('mobile Urdhva 1234 × 5678: the column being worked on stays in view', async ({ page }) => {
  await startFresh(page, { admin: true })
  await page.goto('/sutras/urdhva/learn?level=advanced&example=1')
  await waitForStage(page)
  const { total } = await moment(page)
  let checked = 0
  for (let index = 2; index <= total; index++) {
    await goToMoment(page, index)
    const focus = await stage(page).evaluate((svg) => {
      const view = svg.parentElement!.getBoundingClientRect()
      const active = Array.from(svg.querySelectorAll('[data-role="tile"][data-state="active"], [data-role="answer"]'))
      return active.map((element) => {
        const box = element.getBoundingClientRect()
        return { id: element.getAttribute('data-id') ?? 'answer', inView: box.left >= view.left - 1 && box.right <= view.right + 1 }
      })
    })
    if (focus.length === 0) continue
    checked++
    expect(focus.some((element) => element.inView), `moment ${index}: ${JSON.stringify(focus)}`).toBe(true)
    if (index === 3) {
      await settle(page)
      await stage(page).locator('xpath=..').screenshot({ path: 'e2e/screenshots/mobile-urdhva-1234x5678-column-1.png' })
    }
  }
  expect(checked).toBeGreaterThan(10)
})

test('mobile practice: answering works with touch-sized controls', async ({ page }) => {
  await startFresh(page)
  await page.goto('/sutras/nikhilam/practice?level=beginner')
  await waitForStage(page)
  const check = page.getByRole('button', { name: 'Check' })
  const box = await check.boundingBox()
  expect(box!.height).toBeGreaterThanOrEqual(44)
  await page.getByLabel('Deviation of 98', { exact: true }).fill('2')
  await check.tap()
  await expect(page.getByLabel('Deviation of 93', { exact: true })).toBeVisible()
})
